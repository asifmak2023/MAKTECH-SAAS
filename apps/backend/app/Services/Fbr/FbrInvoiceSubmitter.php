<?php

namespace App\Services\Fbr;

use App\Exceptions\TenantStatusException;
use App\Exceptions\UsageLimitExceededException;
use App\Models\FbrSubmissionHistory;
use App\Models\Invoice;
use App\Services\EntitlementService;
use App\Services\InvoicePdfService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Log;
use Throwable;

class FbrInvoiceSubmitter
{
    public function __construct(
        protected EntitlementService $entitlement,
        protected FbrIntegrationService $integrations,
        protected InvoicePdfService $pdf,
    ) {}

    /**
     * Validate, charge quota and submit one invoice to the tax authority.
     * The operation is idempotent per invoice: a retry never charges twice.
     *
     * @throws \App\Exceptions\UsageLimitExceededException
     * @throws \App\Exceptions\TenantStatusException
     * @throws \Throwable
     */
    public function run(Invoice $invoice): Invoice
    {
        if (! $invoice->relationLoaded('tenant')) {
            $invoice->load('tenant');
        }

        TenantContext::set($invoice->tenant);
        $tenant = $invoice->tenant;

        if (! $tenant->canBillInvoices()) {
            throw new TenantStatusException(
                'Your account is not active. Please clear your outstanding balance to resume submitting invoices.',
                403
            );
        }

        $adapter = $this->integrations->adapterFor($tenant);
        $attempt = $this->nextAttempt($invoice);

        $validation = $adapter->validateInvoice($invoice);

        $this->recordHistory($invoice, 'validate', $attempt, $invoice->toPralPayload(), $validation,
            $this->isRejected($validation) ? 'failed' : 'success');

        $invoice->update(['fbr_validation_response' => $validation]);

        if ($this->isRejected($validation)) {
            $invoice->update([
                'status' => Invoice::STATUS_FAILED,
                'last_error' => $this->extractMessage($validation, $adapter),
            ]);

            return $invoice->fresh();
        }

        // Entitlement is charged right before the paid tax call. If the tenant has
        // no allowance and overage is disabled, block the submission (no retry).
        $this->entitlement->chargeForInvoice($invoice);

        $submission = $adapter->submitInvoice($invoice);
        $fbrNumber = $this->extractFbrNumber($submission);

        $this->recordHistory($invoice, 'submit', $attempt + 1, $invoice->toPralPayload(), $submission,
            $fbrNumber ? 'success' : 'failed');

        $success = $fbrNumber !== null;

        $invoice->update([
            'status' => $success ? Invoice::STATUS_SUBMITTED : Invoice::STATUS_FAILED,
            'submission_attempts' => (int) $invoice->submission_attempts + 1,
            'submitted_at' => $success ? now() : null,
            'fbr_invoice_number' => $fbrNumber,
            'fbr_response' => $submission,
            'last_error' => $success ? null : $this->extractMessage($submission, $adapter),
        ]);

        $invoice->refresh();

        if ($success) {
            $this->pdf->generate($invoice);
        }

        return $invoice;
    }

    /**
     * Run inside a queued job: mark a "blocked" invoice instead of throwing so the
     * job does not retry on quota/status problems.
     */
    public function runFromJob(int $invoiceId): void
    {
        $invoice = Invoice::withoutGlobalScopes()->with(['items', 'tenant'])->findOrFail($invoiceId);
        TenantContext::set($invoice->tenant);

        try {
            $this->run($invoice);
        } catch (UsageLimitExceededException|TenantStatusException $e) {
            Log::warning('Invoice submission blocked', [
                'invoice_id' => $invoice->id,
                'reason' => $e->getMessage(),
            ]);

            $invoice->update(['last_error' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('Invoice submission failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);

            $invoice->update([
                'status' => Invoice::STATUS_FAILED,
                'last_error' => $e->getMessage(),
            ]);
        }
    }

    protected function nextAttempt(Invoice $invoice): int
    {
        return (int) FbrSubmissionHistory::query()->where('invoice_id', $invoice->id)->max('attempt') + 1;
    }

    protected function recordHistory(Invoice $invoice, string $action, int $attempt, array $request, array $response, string $status): void
    {
        FbrSubmissionHistory::query()->create([
            'tenant_id' => $invoice->tenant_id,
            'invoice_id' => $invoice->id,
            'user_id' => $invoice->user_id,
            'action' => $action,
            'attempt' => $attempt,
            'request' => $request,
            'response' => $response,
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    protected function isRejected(array $response): bool
    {
        $status = strtolower((string) ($response['status'] ?? $response['validationResponse']['status'] ?? ''));

        return in_array($status, ['invalid', 'failed', 'error', 'rejected'], true);
    }

    protected function extractFbrNumber(array $response): ?string
    {
        return $response['invoiceNumber']
            ?? $response['InvoiceNumber']
            ?? $response['fbrInvoiceNumber']
            ?? data_get($response, 'validationResponse.invoiceNumber')
            ?? null;
    }

    protected function extractMessage(array $response, InvoiceIntegratorInterface $adapter): string
    {
        $code = $response['errorCode'] ?? data_get($response, 'validationResponse.errorCode');
        $message = $response['error']
            ?? $response['message']
            ?? data_get($response, 'validationResponse.error')
            ?? json_encode($response);

        return $adapter->friendlyError(is_string($code) ? $code : null, (string) $message);
    }
}

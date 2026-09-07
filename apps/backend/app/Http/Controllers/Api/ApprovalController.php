<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SubmitInvoiceToPralJob;
use App\Models\Invoice;
use App\Services\InvoicePdfService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApprovalController extends Controller
{
    public function __construct(
        protected InvoicePdfService $pdf,
        protected \App\Services\AuditService $audit,
    ) {}

    public function show(string $token): JsonResponse
    {
        $invoice = $this->findByToken($token);

        return response()->json([
            'invoice' => $invoice,
            'can_decide' => $invoice->status === Invoice::STATUS_PENDING_APPROVAL,
        ]);
    }

    public function approve(string $token): JsonResponse
    {
        $invoice = $this->findByToken($token);

        if ($invoice->status !== Invoice::STATUS_PENDING_APPROVAL) {
            return response()->json(['message' => 'This invoice is no longer awaiting approval.'], 422);
        }

        $invoice->update([
            'status' => Invoice::STATUS_APPROVED,
            'approved_at' => now(),
            'rejection_note' => null,
        ]);

        $this->audit->record('invoice.buyer_approved', 'invoice', $invoice->id, [], ['status' => Invoice::STATUS_APPROVED, 'invoice_ref_no' => $invoice->invoice_ref_no], $invoice->tenant_id);

        if ($invoice->tenant?->auto_submit_on_approval) {
            try {
                SubmitInvoiceToPralJob::dispatch($invoice->id);
            } catch (\Throwable $e) {
                $invoice->update([
                    'status' => Invoice::STATUS_APPROVED,
                    'last_error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Invoice approved.',
            'invoice' => $invoice->fresh('items'),
        ]);
    }

    public function reject(Request $request, string $token): JsonResponse
    {
        $invoice = $this->findByToken($token);

        if ($invoice->status !== Invoice::STATUS_PENDING_APPROVAL) {
            return response()->json(['message' => 'This invoice is no longer awaiting approval.'], 422);
        }

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $invoice->update([
            'status' => Invoice::STATUS_DRAFT,
            'rejected_at' => now(),
            'rejection_note' => $data['note'] ?? 'Rejected by buyer',
        ]);

        $this->audit->record('invoice.buyer_rejected', 'invoice', $invoice->id, [], ['status' => Invoice::STATUS_DRAFT, 'invoice_ref_no' => $invoice->invoice_ref_no], $invoice->tenant_id);

        return response()->json([
            'message' => 'Invoice rejected and returned to draft.',
            'invoice' => $invoice->fresh('items'),
        ]);
    }

    public function pdf(string $token): StreamedResponse
    {
        $invoice = $this->findByToken($token);
        $path = $this->pdf->absolutePath($invoice);

        return response()->streamDownload(function () use ($path) {
            echo file_get_contents($path);
        }, 'invoice-'.$invoice->id.'.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    protected function findByToken(string $token): Invoice
    {
        $invoice = Invoice::withoutGlobalScopes()
            ->with(['items', 'tenant'])
            ->where('approval_token', $token)
            ->firstOrFail();

        TenantContext::set($invoice->tenant);

        return $invoice;
    }
}

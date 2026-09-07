<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Jobs\SubmitInvoiceToPralJob;
use App\Mail\InvoiceApprovalRequest;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Services\InvoiceCalculator;
use App\Services\InvoicePdfService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function __construct(
        protected InvoiceCalculator $calculator,
        protected InvoicePdfService $pdf,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::query()
            ->withCount('items')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('customer_id'), fn ($q, $customerId) => $q->where('customer_id', (int) $customerId))
            ->when($request->query('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('buyer_business_name', 'like', "%{$search}%")
                        ->orWhere('invoice_ref_no', 'like', "%{$search}%")
                        ->orWhere('fbr_invoice_number', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(20);

        return response()->json($invoices);
    }

    public function stats(): JsonResponse
    {
        $counts = Invoice::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'draft' => (int) ($counts[Invoice::STATUS_DRAFT] ?? 0),
            'pending_approval' => (int) ($counts[Invoice::STATUS_PENDING_APPROVAL] ?? 0),
            'approved' => (int) ($counts[Invoice::STATUS_APPROVED] ?? 0),
            'submitted' => (int) ($counts[Invoice::STATUS_SUBMITTED] ?? 0),
            'failed' => (int) ($counts[Invoice::STATUS_FAILED] ?? 0),
            'recent' => Invoice::query()->latest()->limit(8)->get(),
        ]);
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->persist($request, new Invoice);

        return response()->json($invoice->load('items'), 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice->load('items', 'user', 'customer:id,tenant_id,name,business_name,ntn_cnic,phone,email,address,province'));
    }

    public function update(StoreInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        if (! $invoice->isEditable()) {
            return response()->json(['message' => 'Only draft, rejected or failed invoices can be edited.'], 422);
        }

        $invoice = $this->persist($request, $invoice);

        return response()->json($invoice->load('items'));
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        if (! $invoice->isEditable()) {
            return response()->json(['message' => 'Submitted invoices cannot be deleted.'], 422);
        }

        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted']);
    }

    public function sendForApproval(Request $request, Invoice $invoice): JsonResponse
    {
        $invoice->load('items', 'tenant');

        if ($invoice->items->isEmpty()) {
            return response()->json(['message' => 'Add at least one item before sending for approval.'], 422);
        }

        $path = $this->pdf->absolutePath($invoice);
        $webUrl = rtrim((string) env('WEB_APP_URL', config('app.url')), '/');
        $approvalUrl = $webUrl.'/approve/'.$invoice->approval_token;

        if ($invoice->buyer_email) {
            Mail::to($invoice->buyer_email)->send(new InvoiceApprovalRequest($invoice, $approvalUrl, $path));
        }

        $invoice->update([
            'status' => Invoice::STATUS_PENDING_APPROVAL,
            'sent_for_approval_at' => now(),
            'rejection_note' => null,
        ]);

        return response()->json([
            'invoice' => $invoice->fresh('items'),
            'approval_url' => $approvalUrl,
        ]);
    }

    public function submit(Invoice $invoice): JsonResponse
    {
        if (! in_array($invoice->status, [Invoice::STATUS_APPROVED, Invoice::STATUS_FAILED], true)) {
            return response()->json(['message' => 'Invoice must be approved before submitting to PRAL.'], 422);
        }

        SubmitInvoiceToPralJob::dispatchSync($invoice->id);

        return response()->json($invoice->fresh('items'));
    }

    public function pdf(Invoice $invoice): StreamedResponse
    {
        $path = $this->pdf->absolutePath($invoice);

        return response()->streamDownload(function () use ($path) {
            echo file_get_contents($path);
        }, 'invoice-'.$invoice->id.'.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    protected function persist(StoreInvoiceRequest $request, Invoice $invoice): Invoice
    {
        $tenant = TenantContext::get();
        $data = $request->validated();
        $items = $data['items'];
        unset($data['items']);

        $this->resolveCustomer($data, $tenant);

        $data['seller_ntn_cnic'] = ($data['seller_ntn_cnic'] ?? null) ?: $tenant?->seller_ntn_cnic;
        $data['seller_business_name'] = ($data['seller_business_name'] ?? null) ?: $tenant?->seller_business_name;
        $data['seller_province'] = ($data['seller_province'] ?? null) ?: $tenant?->seller_province;
        $data['seller_address'] = ($data['seller_address'] ?? null) ?: $tenant?->seller_address;
        $data['user_id'] = $request->user()?->id;
        $data['status'] = $invoice->exists ? $invoice->status : Invoice::STATUS_DRAFT;

        $invoice->fill($data);
        $invoice->save();

        $invoice->items()->delete();
        foreach (array_values($items) as $index => $item) {
            $invoice->items()->create($this->calculator->hydrateItem($item, $index + 1));
        }

        $invoice->load('items');
        $invoice->recalculateTotals();

        return $invoice->fresh('items');
    }

    protected function resolveCustomer(array &$data, ?Tenant $tenant = null): void
    {
        $customerId = $data['customer_id'] ?? null;

        if ($customerId === null || $customerId === '') {
            $data['customer_id'] = null;

            return;
        }

        // TenantScope restricts lookup to the current tenant; unknown ids
        // (including other tenants' customers) resolve to null and fail.
        $customer = Customer::query()->find((int) $customerId);

        if (! $customer) {
            abort(422, 'The selected client does not exist for your account.');
        }

        $data['customer_id'] = $customer->id;
        $data['buyer_business_name'] = ($data['buyer_business_name'] ?? null) ?: ($customer->business_name ?: $customer->name);
        $data['buyer_ntn_cnic'] = ($data['buyer_ntn_cnic'] ?? null) ?: $customer->ntn_cnic;
        $data['buyer_registration_type'] = ($data['buyer_registration_type'] ?? null) ?: ($customer->registration_type ?: 'Registered');
        $data['buyer_province'] = ($data['buyer_province'] ?? null) ?: ($customer->province ?: $tenant?->seller_province ?: '');
        $data['buyer_address'] = ($data['buyer_address'] ?? null) ?: ($customer->address ?? '');
        $data['buyer_email'] = ($data['buyer_email'] ?? null) ?: $customer->email;
        $data['buyer_phone'] = ($data['buyer_phone'] ?? null) ?: $customer->phone;
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FbrSubmissionHistory;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Platform-wide "real-time" activity feed used by the Admin monitoring panel.
 * Events are aggregated from the audit log, PRAL submission history and
 * payment stream (nothing about line items / amounts inside seller invoices).
 */
class ActivityAdminController extends Controller
{
    protected array $auditLabels = [
        'tenant.registered' => 'A new seller registered',
        'tenant.created' => 'A seller tenant was created',
        'tenant.suspended' => 'Seller account suspended',
        'tenant.activated' => 'Seller account activated',
        'invoice.created' => 'Invoice draft created',
        'invoice.deleted' => 'Invoice draft deleted',
        'invoice.sent_for_approval' => 'Invoice sent for buyer approval',
        'invoice.buyer_approved' => 'Buyer approved an invoice',
        'invoice.buyer_rejected' => 'Buyer rejected an invoice',
    ];

    public function index(Request $request): JsonResponse
    {
        $limit = min((int) $request->query('limit', 40), 100);

        $items = array_merge(
            $this->auditEvents(),
            $this->fbrEvents(),
            $this->paymentEvents()
        );

        usort($items, fn ($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        return response()->json([
            'generated_at' => now()->toISOString(),
            'items' => array_slice($items, 0, $limit),
        ]);
    }

    protected function auditEvents(): array
    {
        $rows = AuditLog::query()
            ->with(['tenant:id,name,slug', 'user:id,name,email'])
            ->whereIn('action', array_keys($this->auditLabels))
            ->latest('id')
            ->limit(40)
            ->get();

        $items = [];

        foreach ($rows as $row) {
            $items[] = [
                'at' => $row->created_at?->toISOString(),
                'type' => 'tenant' === $row->entity_type ? 'tenant' : 'invoice',
                'event' => $row->action,
                'message' => $this->auditLabels[$row->action] ?? $row->action,
                'tenant' => $row->tenant ? ['id' => $row->tenant->id, 'slug' => $row->tenant->slug, 'name' => $row->tenant->name] : null,
                'actor' => $row->user?->name ?? 'system',
            ];
        }

        return $items;
    }

    protected function fbrEvents(): array
    {
        $rows = FbrSubmissionHistory::query()
            ->with(['tenant:id,name,slug', 'invoice:id,invoice_ref_no,fbr_invoice_number'])
            ->latest('id')
            ->limit(40)
            ->get();

        $items = [];

        foreach ($rows as $row) {
            $action = $row->action === 'submit' ? 'submitted' : 'validated';
            $failed = $row->status === 'failed';

            $items[] = [
                'at' => $row->created_at?->toISOString(),
                'type' => 'fbr',
                'event' => $failed ? 'invoice.submit_failed' : 'invoice.'.$action,
                'message' => $failed
                    ? 'PRAL invoice submission failed'
                    : ($row->action === 'submit' ? 'Invoice submitted to PRAL' : 'Invoice validated by PRAL'),
                'tenant' => $row->tenant ? ['id' => $row->tenant->id, 'slug' => $row->tenant->slug, 'name' => $row->tenant->name] : null,
                'invoice_ref' => $row->invoice?->invoice_ref_no,
                'status' => $failed ? 'failed' : 'success',
                'error_code' => $row->error_code,
                'error' => $row->error_message,
            ];
        }

        return $items;
    }

    protected function paymentEvents(): array
    {
        $rows = Payment::query()
            ->with(['tenant:id,name,slug', 'order:id,order_number,order_type'])
            ->latest()
            ->limit(40)
            ->get();

        $items = [];

        foreach ($rows as $row) {
            $items[] = [
                'at' => ($row->paid_at ?? $row->initiated_at ?? $row->created_at)?->toISOString(),
                'type' => 'billing',
                'event' => 'payment.'.$row->status,
                'message' => 'Payment '.$row->status.' via '.strtoupper((string) $row->gateway_code),
                'tenant' => $row->tenant ? ['id' => $row->tenant->id, 'slug' => $row->tenant->slug, 'name' => $row->tenant->name] : null,
                'order_number' => $row->order?->order_number,
                'order_type' => $row->order?->order_type,
                'status' => $row->status,
            ];
        }

        return $items;
    }
}

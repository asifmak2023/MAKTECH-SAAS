<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FbrSubmissionHistory;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tenant-scoped "recent activity" for the seller dashboard. Mirrors the Admin
 * monitoring feed but restricted to the current tenant (invoices + PRAL).
 */
class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = TenantContext::get() ?? abort(400, 'Tenant context missing.');
        $limit = min((int) $request->query('limit', 25), 50);

        $audit = AuditLog::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('action', [
                'invoice.created',
                'invoice.deleted',
                'invoice.sent_for_approval',
                'invoice.buyer_approved',
                'invoice.buyer_rejected',
            ])
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(function (AuditLog $row) {
                return [
                    'at' => $row->created_at?->toISOString(),
                    'type' => 'invoice',
                    'event' => $row->action,
                    'message' => $row->action,
                ];
            })
            ->all();

        $fbr = FbrSubmissionHistory::query()
            ->where('tenant_id', $tenant->id)
            ->with('invoice:id,invoice_ref_no')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(function (FbrSubmissionHistory $row) {
                $failed = $row->status === 'failed';

                return [
                    'at' => $row->created_at?->toISOString(),
                    'type' => 'fbr',
                    'event' => $row->action.'.'.($failed ? 'failed' : 'success'),
                    'message' => ($row->action === 'submit' ? 'Submitted invoice' : 'Validated invoice').($row->invoice?->invoice_ref_no ? ' '.$row->invoice->invoice_ref_no : '').' with PRAL',
                    'status' => $failed ? 'failed' : 'success',
                    'error_code' => $row->error_code,
                    'error' => $row->error_message,
                ];
            })
            ->all();

        $items = array_merge($audit, $fbr);

        usort($items, fn ($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        return response()->json([
            'generated_at' => now()->toISOString(),
            'items' => array_slice($items, 0, $limit),
        ]);
    }
}

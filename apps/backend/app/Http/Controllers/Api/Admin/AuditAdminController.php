<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with(['tenant:id,name,slug', 'user:id,name,email'])
            ->when($request->query('tenant_id'), fn ($q, $s) => $q->where('tenant_id', $s))
            ->when($request->query('action'), fn ($q, $s) => $q->where('action', 'like', "%{$s}%"))
            ->when($request->query('entity_type'), fn ($q, $s) => $q->where('entity_type', $s))
            ->when($request->query('user_id'), fn ($q, $s) => $q->where('user_id', $s))
            ->latest('id')
            ->paginate(30);

        return response()->json($logs);
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        return response()->json($auditLog->load('tenant', 'user'));
    }
}

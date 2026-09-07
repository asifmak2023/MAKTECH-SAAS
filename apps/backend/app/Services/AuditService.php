<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function record(
        string $action,
        string $entityType,
        ?int $entityId = null,
        array $oldValue = [],
        array $newValue = [],
        ?int $tenantId = null,
        ?User $actor = null,
        array $meta = [],
    ): AuditLog {
        $actor ??= auth()->user();

        return AuditLog::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $actor?->id,
            'actor_type' => $actor ? 'user' : 'system',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_value' => $oldValue ?: null,
            'new_value' => $newValue ?: null,
            'ip' => Request::ip(),
            'user_agent' => mb_substr((string) Request::userAgent(), 0, 500),
            'meta' => $meta ?: null,
            'created_at' => now(),
        ]);
    }

    public function tenant(string $action, string $entityType, $entityId = null, array $old = [], array $new = [], array $meta = []): AuditLog
    {
        $tenantId = \App\Support\TenantContext::id();

        return $this->record($action, $entityType, $entityId, $old, $new, $tenantId, null, $meta);
    }
}

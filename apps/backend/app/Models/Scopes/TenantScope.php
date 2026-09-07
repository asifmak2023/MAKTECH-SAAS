<?php

namespace App\Models\Scopes;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = TenantContext::id();

        if ($tenantId) {
            if ($model instanceof User) {
                $builder->where(function ($q) use ($model, $tenantId) {
                    $q->where($model->getTable().'.tenant_id', $tenantId)
                        ->orWhere($model->getTable().'.is_platform_admin', true);
                });

                return;
            }

            $builder->where($model->getTable().'.tenant_id', $tenantId);
        }
    }
}

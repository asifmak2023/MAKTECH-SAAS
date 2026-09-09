<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Services\EntitlementService;
use App\Services\Fbr\FbrIntegrationService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class TenantAdminController extends Controller
{
    public function __construct(
        protected TenantService $tenants,
        protected FbrIntegrationService $fbr,
        protected EntitlementService $entitlement,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::query()
            ->with(['activeSubscription.plan:id,code,name', 'owner:id,name,email'])
            ->withCount('users', 'invoices')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), function ($q, $s) {
                $q->where(fn ($inner) => $inner->where('name', 'like', "%{$s}%")
                    ->orWhere('slug', 'like', "%{$s}%")
                    ->orWhere('seller_ntn_cnic', 'like', "%{$s}%")
                    ->orWhere('legal_name', 'like', "%{$s}%")
                    ->orWhere('seller_business_name', 'like', "%{$s}%"));
            })
            ->latest()
            ->paginate(20);

        return response()->json($tenants);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        $tenant->load([
            'owner:id,name,email,phone',
            'users:id,tenant_id,name,email,role,is_active',
            'subscriptions' => fn ($q) => $q->with('plan')->limit(8),
            'activeSubscription' => fn ($q) => $q->with('plan'),
            'fbrIntegrations',
        ])->loadCount('invoices', 'customers', 'products', 'billingOrders', 'payments');

        $payload = $tenant->toArray();
        $payload['usage'] = $this->entitlement->usageSummary($tenant);
        $payload['pral'] = [
            'sandbox' => $this->pralStatus($tenant, 'sandbox'),
            'production' => $this->pralStatus($tenant, 'production'),
        ];

        return response()->json($payload);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_name' => ['required', 'string', 'max:255'],
            'tenant_slug' => ['nullable', 'string', 'max:60', 'alpha_dash'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'seller_email' => ['nullable', 'email'],
            'seller_phone' => ['nullable', 'string', 'max:30'],
            'billing_email' => ['nullable', 'email'],
            'registration_type' => ['nullable', 'string', 'max:40'],
            'status' => ['nullable', 'in:pending,trial,active,past_due,grace_period,suspended,cancelled'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'free_invoice_credits' => ['nullable', 'integer', 'min:0'],
            'auto_submit_on_approval' => ['sometimes', 'boolean'],
            'owner' => ['nullable', 'array'],
            'owner.name' => ['required_with:owner', 'string', 'max:255'],
            'owner.email' => ['required_with:owner', 'email'],
            'owner.password' => ['nullable', 'string', 'min:8', 'max:12'],
            'owner.phone' => ['nullable', 'string', 'max:30'],
            'subscription_plan_id' => ['nullable', 'integer', 'exists:subscription_plans,id'],
            'billing_interval' => ['nullable', 'in:monthly,yearly'],
        ], [], [
            'tenant_slug' => 'username',
        ]);

        $data['_admin_created'] = true;

        if (empty(data_get($data, 'owner.email')) && ! empty($data['seller_email'])) {
            $data['owner'] = [
                'name' => $data['owner']['name'] ?? ($data['seller_business_name'] ?? $data['tenant_name']),
                'email' => $data['seller_email'],
                'password' => $data['owner']['password'] ?? null,
                'phone' => $data['owner']['phone'] ?? ($data['seller_phone'] ?? null),
            ];
        }

        $tenant = $this->tenants->createByAdmin($data, $data['owner'] ?? null);

        if (array_key_exists('free_invoice_credits', $data) && $data['free_invoice_credits'] !== null) {
            $this->tenants->adjustCredits($tenant, (int) $data['free_invoice_credits'] - (int) ($tenant->settings['free_invoice_credits'] ?? 0), 'Platform grant on creation');
        }

        if (! empty($data['subscription_plan_id'])) {
            $this->grantPlan($tenant, (int) $data['subscription_plan_id'], $data['billing_interval'] ?? 'monthly');
        }

        return response()->json($tenant->fresh(['owner', 'activeSubscription.plan']), 201);
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'legal_name' => ['nullable', 'string', 'max:255'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'seller_email' => ['nullable', 'email'],
            'seller_phone' => ['nullable', 'string', 'max:30'],
            'billing_email' => ['nullable', 'email'],
            'registration_type' => ['nullable', 'string', 'max:40'],
            'integrator' => ['nullable', 'string', 'max:40'],
            'auto_submit_on_approval' => ['sometimes', 'boolean'],
            'grace_period_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
        ]);

        if (array_key_exists('grace_period_hours', $data) && $data['grace_period_hours'] !== null) {
            $settings = $tenant->settings ?? [];
            $settings['grace_period_hours'] = (int) $data['grace_period_hours'];
            $tenant->update(['settings' => $settings]);
            unset($data['grace_period_hours']);
        }

        $tenant->update($data);

        return response()->json($tenant->fresh());
    }

    public function changeStatus(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,trial,active,past_due,grace_period,suspended,cancelled'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json($this->tenants->changeStatus($tenant, $data['status'], $data['note'] ?? null));
    }

    public function assignSubscription(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'subscription_plan_id' => ['required', 'integer', 'exists:subscription_plans,id'],
            'billing_interval' => ['nullable', 'in:monthly,yearly'],
        ]);

        $subscription = $this->grantPlan($tenant, (int) $data['subscription_plan_id'], $data['billing_interval'] ?? 'monthly');

        return response()->json([
            'message' => 'Subscription assigned.',
            'subscription' => $subscription->load('plan'),
            'tenant' => $tenant->fresh('activeSubscription.plan'),
        ]);
    }

    public function adjustCredits(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = $this->tenants->adjustCredits($tenant, (int) $data['quantity'], $data['description'] ?? 'Platform adjustment');

        return response()->json([
            'ledger_entry' => $entry,
            'free_invoice_credits' => $tenant->fresh()->settings['free_invoice_credits'] ?? 0,
        ]);
    }

    public function updateFbr(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'in:sandbox,production'],
            'integrator' => ['required', 'string', 'max:40'],
            'base_url' => ['nullable', 'url'],
            'token' => ['nullable', 'string', 'max:500'],
            'validate_endpoint' => ['nullable', 'string', 'max:500'],
            'submit_endpoint' => ['nullable', 'string', 'max:500'],
        ]);

        $this->tenants->setFbrMode($tenant, $data['mode']);
        $tenant->update(['integrator' => $data['integrator']]);

        $row = $this->fbr->ensureRowFor($tenant);
        $config = $row->configArray();

        foreach (['base_url', 'validate_endpoint', 'submit_endpoint'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $config[$key] = $data[$key];
            }
        }

        if (array_key_exists('token', $data) && $data['token'] !== null) {
            $config['token'] = trim((string) $data['token']);
        }

        try {
            $fingerprint = $this->fbr->claimToken($tenant, $row->integrator, $row->mode, $config['token'] ?? null);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $status = ! empty($config['base_url']) && ! empty($config['token']) ? 'configured' : 'unconfigured';

        try {
            $row->setConfigArray($config)->fill(['status' => $status, 'token_fingerprint' => $fingerprint])->save();
        } catch (\Illuminate\Database\QueryException $e) {
            if (! $this->isUniqueViolation($e)) {
                throw $e;
            }

            return response()->json([
                'message' => "This {$row->mode} key is already registered to another account. Each FBR {$row->mode} token can be bound to only one account.",
            ], 422);
        }

        return response()->json($tenant->fresh()->load('fbrIntegrations'));
    }

    public function integrationRows(Tenant $tenant): JsonResponse
    {
        return response()->json($tenant->fbrIntegrations()->get()->map(fn ($row) => [
            'id' => $row->id,
            'integrator' => $row->integrator,
            'mode' => $row->mode,
            'status' => $row->status,
            'config' => $row->configArray(),
        ]));
    }

    protected function grantPlan(Tenant $tenant, int $planId, string $interval = 'monthly'): TenantSubscription
    {
        $plan = SubscriptionPlan::query()->findOrFail($planId);
        $start = now();
        $periodEnd = $interval === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();
        $price = $interval === 'yearly' && $plan->annual_price !== null ? (float) $plan->annual_price : (float) $plan->price;

        TenantSubscription::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_TRIAL, TenantSubscription::STATUS_GRACE_PERIOD, TenantSubscription::STATUS_PENDING])
            ->update([
                'status' => TenantSubscription::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);

        $subscription = TenantSubscription::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_plan_id' => $plan->id,
            'status' => TenantSubscription::STATUS_ACTIVE,
            'billing_interval' => $interval,
            'price' => $price,
            'currency' => $tenant->currency ?? 'PKR',
            'invoice_limit' => $plan->invoice_limit,
            'overage_allowed' => $plan->overage_allowed,
            'overage_price' => $plan->overage_price,
            'grace_period_hours' => $plan->grace_period_hours,
            'auto_renew' => true,
            'starts_at' => $start,
            'current_period_start' => $start,
            'current_period_end' => $periodEnd,
            'next_billing_date' => $periodEnd->copy()->addDay(),
        ]);

        if ($tenant->status === Tenant::STATUS_PENDING) {
            $tenant->update(['status' => Tenant::STATUS_ACTIVE, 'is_active' => true]);
        }

        return $subscription;
    }

    protected function pralStatus(Tenant $tenant, string $mode): array
    {
        $row = $tenant->fbrIntegrations->firstWhere('mode', $mode);

        return [
            'mode' => $mode,
            'status' => $row?->status ?? 'unconfigured',
            'configured' => ($row?->status === 'configured'),
            'last_tested_at' => $row?->last_tested_at,
        ];
    }

    /**
     * Detect a constraint violation from the underlying driver (the token
     * uniqueness index is the backstop behind the application-level claim).
     */
    protected function isUniqueViolation(\Illuminate\Database\QueryException $e): bool
    {
        $state = (string) ($e->errorInfo[0] ?? '');
        $driver = (int) ($e->errorInfo[1] ?? 0);

        return in_array($state, ['23000', '23505'], true)
            || in_array($driver, [1062, 19, 1555, 2067, 2601], true);
    }
}

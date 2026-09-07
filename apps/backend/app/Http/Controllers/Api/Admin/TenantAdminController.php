<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\Fbr\FbrIntegrationService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantAdminController extends Controller
{
    public function __construct(
        protected TenantService $tenants,
        protected FbrIntegrationService $fbr,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::query()
            ->withCount('users', 'invoices')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), function ($q, $s) {
                $q->where(fn ($inner) => $inner->where('name', 'like', "%{$s}%")
                    ->orWhere('slug', 'like', "%{$s}%")
                    ->orWhere('seller_ntn_cnic', 'like', "%{$s}%")
                    ->orWhere('legal_name', 'like', "%{$s}%"));
            })
            ->latest()
            ->paginate(20);

        return response()->json($tenants);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json($tenant->load([
            'owner:id,name,email',
            'users:id,tenant_id,name,email,role,is_active',
            'subscriptions' => fn ($q) => $q->with('plan')->limit(5),
            'activeSubscription' => fn ($q) => $q->with('plan'),
            'fbrIntegrations',
        ])->loadCount('invoices', 'customers', 'products', 'billingOrders', 'payments'));
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
            'owner.password' => ['nullable', 'string', 'min:8'],
        ]);

        $data['_admin_created'] = true;

        $tenant = $this->tenants->createByAdmin($data, $data['owner'] ?? null);

        if (array_key_exists('free_invoice_credits', $data) && $data['free_invoice_credits'] !== null) {
            $this->tenants->adjustCredits($tenant, (int) $data['free_invoice_credits'] - (int) ($tenant->settings['free_invoice_credits'] ?? 0), 'Platform grant on creation');
        }

        return response()->json($tenant->fresh(), 201);
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

        foreach (['base_url', 'token', 'validate_endpoint', 'submit_endpoint'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $config[$key] = $data[$key];
            }
        }

        $status = ! empty($config['base_url']) && ! empty($config['token']) ? 'configured' : 'unconfigured';
        $row->setConfigArray($config)->fill(['status' => $status])->save();

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
}

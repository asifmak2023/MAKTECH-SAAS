<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'active');

        $customers = Customer::query()
            ->withCount('invoices')
            ->when($request->query('search'), fn ($q, $s) => $q->search($s))
            ->when(in_array($status, ['archived', 'inactive'], true), fn ($q) => $q->where('is_active', false))
            ->when(! in_array($status, ['all', 'archived', 'inactive'], true), fn ($q) => $q->where('is_active', true))
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($customers);
    }

    public function show(Customer $customer): JsonResponse
    {
        $recent = $customer->invoices()
            ->latest()
            ->limit(8)
            ->get(['id', 'invoice_date', 'status', 'grand_total', 'buyer_business_name', 'fbr_invoice_number']);

        return response()->json([
            'customer' => $customer->loadCount('invoices'),
            'recent_invoices' => $recent,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $customer = Customer::query()->create($data);

        return response()->json($customer, 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validated($request, true));

        return response()->json($customer->fresh());
    }

    public function archive(Customer $customer): JsonResponse
    {
        $customer->update(['is_active' => false]);

        return response()->json($customer->fresh());
    }

    public function restore(Customer $customer): JsonResponse
    {
        $customer->update(['is_active' => true]);

        return response()->json($customer->fresh());
    }

    public function purge(Customer $customer): JsonResponse
    {
        if ($customer->invoices()->exists()) {
            return response()->json(['message' => 'Clients linked to invoices cannot be purged.'], 422);
        }

        $customer->delete();

        return response()->json(['message' => 'Client purged']);
    }

    protected function validated(Request $request, bool $updating = false): array
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'business_name' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'ntn_cnic' => ['nullable', 'string', 'max:30'],
            'strn' => ['nullable', 'string', 'max:30'],
            'cnic' => ['nullable', 'string', 'max:20'],
            'registration_type' => ['nullable', 'string', 'max:40'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        // Keep the NOT NULL `name` column populated: business name doubles as
        // the display name when no contact person is supplied.
        if (empty($data['name'])) {
            $data['name'] = $data['business_name'] ?? '';
        }
        if (empty($data['business_name'])) {
            $data['business_name'] = $data['name'] ?? '';
        }

        return $data;
    }
}

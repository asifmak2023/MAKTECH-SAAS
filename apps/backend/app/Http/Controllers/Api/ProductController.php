<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->when($request->query('search'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest()
            ->paginate(20);

        return response()->json($products);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'product_type' => ['nullable', 'string', 'max:60'],
            'hs_code' => ['nullable', 'string', 'max:30'],
            'uom' => ['nullable', 'string', 'max:100'],
            'sale_type' => ['nullable', 'string', 'max:200'],
            'rate' => ['nullable', 'string', 'max:40'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $product = Product::query()->create($data + ['currency' => $data['currency'] ?? null]);

        return response()->json($product, 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'product_type' => ['nullable', 'string', 'max:60'],
            'hs_code' => ['nullable', 'string', 'max:30'],
            'uom' => ['nullable', 'string', 'max:100'],
            'sale_type' => ['nullable', 'string', 'max:200'],
            'rate' => ['nullable', 'string', 'max:40'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $product->update($data);

        return response()->json($product->fresh());
    }
}

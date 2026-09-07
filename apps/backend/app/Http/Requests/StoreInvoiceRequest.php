<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $nullable = ['buyer_email', 'buyer_ntn_cnic', 'invoice_ref_no', 'scenario_id', 'customer_id'];
        $payload = [];
        foreach ($nullable as $key) {
            if ($this->has($key) && ($this->input($key) === '' || $this->input($key) === 'null')) {
                $payload[$key] = null;
            }
        }
        if ($payload) {
            $this->merge($payload);
        }
    }

    public function rules(): array
    {
        $rules = [
            'invoice_type' => ['required', 'string', 'max:50'],
            'invoice_date' => ['required', 'date'],
            'invoice_ref_no' => ['nullable', 'string', 'max:50'],
            'scenario_id' => ['nullable', 'string', 'max:20'],
            'customer_id' => ['nullable', 'integer'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'buyer_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'buyer_business_name' => ['required', 'string', 'max:255'],
            'buyer_province' => ['required', 'string', 'max:100'],
            'buyer_address' => ['required', 'string', 'max:255'],
            'buyer_registration_type' => ['required', 'string', 'in:Registered,Unregistered'],
            'buyer_email' => ['nullable', 'email'],
            'buyer_phone' => ['nullable', 'string', 'max:30'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.hs_code' => ['required', 'string', 'max:20'],
            'items.*.product_description' => ['required', 'string', 'max:255'],
            'items.*.rate' => ['required', 'string', 'max:50'],
            'items.*.uom' => ['required', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.value_sales_excluding_st' => ['required', 'numeric', 'min:0'],
            'items.*.sale_type' => ['required', 'string', 'max:100'],
            'items.*.sales_tax_applicable' => ['nullable', 'numeric'],
            'items.*.further_tax' => ['nullable', 'numeric'],
            'items.*.extra_tax' => ['nullable', 'numeric'],
            'items.*.discount' => ['nullable', 'numeric'],
            'items.*.fed_payable' => ['nullable', 'numeric'],
            'items.*.sales_tax_withheld_at_source' => ['nullable', 'numeric'],
            'items.*.fixed_notified_value_or_retail_price' => ['nullable', 'numeric'],
            'items.*.sro_schedule_no' => ['nullable', 'string', 'max:50'],
            'items.*.sro_item_serial_no' => ['nullable', 'string', 'max:50'],
        ];

        // When a client (customer) is referenced the buyer fields can be derived
        // from it; the controller auto-fills anything the request omits.
        if ($this->filled('customer_id')) {
            $rules['buyer_business_name'] = ['nullable', 'string', 'max:255'];
            $rules['buyer_province'] = ['nullable', 'string', 'max:100'];
            $rules['buyer_address'] = ['nullable', 'string', 'max:255'];
            $rules['buyer_registration_type'] = ['nullable', 'string', 'in:Registered,Unregistered'];
        }

        return $rules;
    }
}

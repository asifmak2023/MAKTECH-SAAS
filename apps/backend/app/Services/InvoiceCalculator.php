<?php

namespace App\Services;

use App\Models\InvoiceItem;

class InvoiceCalculator
{
    public function hydrateItem(array $item, int $lineNumber = 1): array
    {
        $valueExSt = (float) ($item['value_sales_excluding_st'] ?? 0);
        $rate = (string) ($item['rate'] ?? '0%');
        $quantity = (float) ($item['quantity'] ?? 0);
        $furtherTax = (float) ($item['further_tax'] ?? 0);
        $extraTax = (float) ($item['extra_tax'] ?? 0);
        $discount = (float) ($item['discount'] ?? 0);
        $fed = (float) ($item['fed_payable'] ?? 0);
        $withheld = (float) ($item['sales_tax_withheld_at_source'] ?? 0);
        $fixed = (float) ($item['fixed_notified_value_or_retail_price'] ?? 0);

        $salesTax = isset($item['sales_tax_applicable'])
            ? (float) $item['sales_tax_applicable']
            : InvoiceItem::calculateTax($valueExSt, $rate);

        $total = $valueExSt + $salesTax + $furtherTax + $extraTax + $fed - $discount;

        return [
            'line_number' => $lineNumber,
            'hs_code' => $item['hs_code'],
            'product_description' => $item['product_description'],
            'rate' => $rate,
            'uom' => $item['uom'],
            'quantity' => $quantity,
            'value_sales_excluding_st' => round($valueExSt, 2),
            'sales_tax_applicable' => round($salesTax, 2),
            'further_tax' => round($furtherTax, 2),
            'extra_tax' => round($extraTax, 2),
            'discount' => round($discount, 2),
            'fed_payable' => round($fed, 2),
            'sales_tax_withheld_at_source' => round($withheld, 2),
            'fixed_notified_value_or_retail_price' => round($fixed, 2),
            'sro_schedule_no' => $item['sro_schedule_no'] ?? '',
            'sale_type' => $item['sale_type'],
            'sro_item_serial_no' => $item['sro_item_serial_no'] ?? '',
            'total_values' => round($total, 2),
        ];
    }
}

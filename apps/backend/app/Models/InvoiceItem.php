<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'line_number',
        'hs_code',
        'product_description',
        'rate',
        'uom',
        'quantity',
        'total_values',
        'value_sales_excluding_st',
        'fixed_notified_value_or_retail_price',
        'sales_tax_applicable',
        'sales_tax_withheld_at_source',
        'extra_tax',
        'further_tax',
        'sro_schedule_no',
        'fed_payable',
        'discount',
        'sale_type',
        'sro_item_serial_no',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'total_values' => 'decimal:2',
            'value_sales_excluding_st' => 'decimal:2',
            'fixed_notified_value_or_retail_price' => 'decimal:2',
            'sales_tax_applicable' => 'decimal:2',
            'sales_tax_withheld_at_source' => 'decimal:2',
            'extra_tax' => 'decimal:2',
            'further_tax' => 'decimal:2',
            'fed_payable' => 'decimal:2',
            'discount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function toPralPayload(): array
    {
        return [
            'hsCode' => $this->hs_code,
            'productDescription' => $this->product_description,
            'rate' => $this->rate,
            'uoM' => $this->uom,
            'quantity' => (float) $this->quantity,
            'totalValues' => (float) $this->total_values,
            'valueSalesExcludingST' => (float) $this->value_sales_excluding_st,
            'fixedNotifiedValueOrRetailPrice' => (float) $this->fixed_notified_value_or_retail_price,
            'salesTaxApplicable' => (float) $this->sales_tax_applicable,
            'salesTaxWithheldAtSource' => (float) $this->sales_tax_withheld_at_source,
            'extraTax' => $this->extra_tax !== null ? (float) $this->extra_tax : '',
            'furtherTax' => (float) $this->further_tax,
            'sroScheduleNo' => $this->sro_schedule_no ?? '',
            'fedPayable' => (float) $this->fed_payable,
            'discount' => (float) $this->discount,
            'saleType' => $this->sale_type,
            'sroItemSerialNo' => $this->sro_item_serial_no ?? '',
        ];
    }

    public static function calculateTax(float $valueExcludingSt, string $rate): float
    {
        $percent = (float) preg_replace('/[^0-9.]/', '', $rate);

        return round($valueExcludingSt * ($percent / 100), 2);
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING_APPROVAL = 'pending_approval';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PENDING_SUBMISSION = 'pending_submission';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'customer_id',
        'invoice_type',
        'invoice_date',
        'invoice_ref_no',
        'scenario_id',
        'seller_ntn_cnic',
        'seller_business_name',
        'seller_province',
        'seller_address',
        'buyer_ntn_cnic',
        'buyer_business_name',
        'buyer_province',
        'buyer_address',
        'buyer_registration_type',
        'buyer_email',
        'buyer_phone',
        'status',
        'approval_token',
        'idempotency_key',
        'submission_attempts',
        'rejection_note',
        'sent_for_approval_at',
        'approved_at',
        'rejected_at',
        'canceled_at',
        'usage_reserved_at',
        'usage_consumed_at',
        'usage_source_type',
        'usage_source_id',
        'submitted_at',
        'fbr_invoice_number',
        'fbr_response',
        'fbr_validation_response',
        'last_error',
        'subtotal',
        'sales_tax_total',
        'further_tax_total',
        'extra_tax_total',
        'discount_total',
        'grand_total',
        'pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'sent_for_approval_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'canceled_at' => 'datetime',
            'usage_reserved_at' => 'datetime',
            'usage_consumed_at' => 'datetime',
            'submitted_at' => 'datetime',
            'fbr_response' => 'array',
            'fbr_validation_response' => 'array',
            'subtotal' => 'decimal:2',
            'sales_tax_total' => 'decimal:2',
            'further_tax_total' => 'decimal:2',
            'extra_tax_total' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (! $invoice->approval_token) {
                $invoice->approval_token = Str::uuid()->toString();
            }
            if (! $invoice->idempotency_key) {
                $invoice->idempotency_key = (string) Str::uuid();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('line_number');
    }

    public function usageEvents(): HasMany
    {
        return $this->hasMany(InvoiceUsageEvent::class);
    }

    public function submissionHistory(): HasMany
    {
        return $this->hasMany(FbrSubmissionHistory::class)->latest('attempt');
    }

    public function recalculateTotals(): void
    {
        $items = $this->items;

        $this->subtotal = $items->sum('value_sales_excluding_st');
        $this->sales_tax_total = $items->sum('sales_tax_applicable');
        $this->further_tax_total = $items->sum('further_tax');
        $this->extra_tax_total = $items->sum('extra_tax');
        $this->discount_total = $items->sum('discount');
        $this->grand_total = $items->sum('total_values');
        $this->save();
    }

    public function toPralPayload(): array
    {
        return [
            'invoiceType' => $this->invoice_type,
            'invoiceDate' => $this->invoice_date->format('Y-m-d'),
            'sellerNTNCNIC' => $this->seller_ntn_cnic,
            'sellerBusinessName' => $this->seller_business_name,
            'sellerProvince' => $this->seller_province,
            'sellerAddress' => $this->seller_address,
            'buyerNTNCNIC' => $this->buyer_ntn_cnic,
            'buyerBusinessName' => $this->buyer_business_name,
            'buyerProvince' => $this->buyer_province,
            'buyerAddress' => $this->buyer_address,
            'buyerRegistrationType' => $this->buyer_registration_type,
            'invoiceRefNo' => $this->invoice_ref_no,
            'scenarioId' => $this->scenario_id,
            'items' => $this->items->map(fn (InvoiceItem $item) => $item->toPralPayload())->values()->all(),
        ];
    }

    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_FAILED, self::STATUS_REJECTED], true);
    }

    public function isConsumed(): bool
    {
        return $this->usage_consumed_at !== null;
    }

    public function isReserved(): bool
    {
        return $this->usage_reserved_at !== null;
    }
}

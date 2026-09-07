<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('invoice_type')->default('Sale Invoice');
            $table->date('invoice_date');
            $table->string('invoice_ref_no')->nullable();
            $table->string('scenario_id')->nullable();

            $table->string('seller_ntn_cnic');
            $table->string('seller_business_name');
            $table->string('seller_province');
            $table->string('seller_address');

            $table->string('buyer_ntn_cnic')->nullable();
            $table->string('buyer_business_name');
            $table->string('buyer_province');
            $table->string('buyer_address');
            $table->string('buyer_registration_type')->default('Registered');
            $table->string('buyer_email')->nullable();
            $table->string('buyer_phone')->nullable();

            $table->string('status')->default('draft');
            $table->string('approval_token')->unique();
            $table->text('rejection_note')->nullable();
            $table->timestamp('sent_for_approval_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->string('fbr_invoice_number')->nullable();
            $table->json('fbr_response')->nullable();
            $table->json('fbr_validation_response')->nullable();
            $table->text('last_error')->nullable();

            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('sales_tax_total', 18, 2)->default(0);
            $table->decimal('further_tax_total', 18, 2)->default(0);
            $table->decimal('extra_tax_total', 18, 2)->default(0);
            $table->decimal('discount_total', 18, 2)->default(0);
            $table->decimal('grand_total', 18, 2)->default(0);

            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'invoice_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};

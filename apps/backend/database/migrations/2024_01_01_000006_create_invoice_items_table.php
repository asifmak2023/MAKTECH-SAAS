<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_number')->default(1);
            $table->string('hs_code');
            $table->string('product_description');
            $table->string('rate');
            $table->string('uom');
            $table->decimal('quantity', 18, 4)->default(0);
            $table->decimal('total_values', 18, 2)->default(0);
            $table->decimal('value_sales_excluding_st', 18, 2)->default(0);
            $table->decimal('fixed_notified_value_or_retail_price', 18, 2)->default(0);
            $table->decimal('sales_tax_applicable', 18, 2)->default(0);
            $table->decimal('sales_tax_withheld_at_source', 18, 2)->default(0);
            $table->decimal('extra_tax', 18, 2)->default(0);
            $table->decimal('further_tax', 18, 2)->default(0);
            $table->string('sro_schedule_no')->nullable();
            $table->decimal('fed_payable', 18, 2)->default(0);
            $table->decimal('discount', 18, 2)->default(0);
            $table->string('sale_type');
            $table->string('sro_item_serial_no')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};

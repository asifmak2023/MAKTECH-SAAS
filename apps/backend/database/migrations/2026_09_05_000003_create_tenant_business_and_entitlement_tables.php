<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('business_name')->nullable();
            $table->string('ntn_cnic')->nullable()->index();
            $table->string('strn')->nullable();
            $table->string('cnic')->nullable();
            $table->string('registration_type')->default('Registered');
            $table->string('province')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'name']);
            $table->index(['tenant_id', 'email']);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('product_type')->default('Goods'); // Goods | Services
            $table->string('hs_code')->nullable();
            $table->string('uom')->nullable();
            $table->string('sale_type')->nullable();
            $table->string('rate')->nullable(); // e.g. 18%
            $table->decimal('unit_price', 18, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'name']);
        });

        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status'); // trial | active | past_due | grace_period | suspended | cancelled | expired
            $table->string('billing_interval')->nullable(); // monthly | yearly | custom | payg
            $table->decimal('price', 14, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->unsignedBigInteger('invoice_limit')->nullable();
            $table->boolean('overage_allowed')->default(false);
            $table->decimal('overage_price', 14, 2)->nullable();
            $table->unsignedBigInteger('used_invoices')->default(0);
            $table->unsignedBigInteger('reserved_invoices')->default(0);
            $table->unsignedBigInteger('grace_period_hours')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('next_billing_date')->nullable();
            $table->timestamp('grace_ends_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('usage_package_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('usage_package_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('billing_order_id')->nullable();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('purchased_invoices')->default(0);
            $table->unsignedBigInteger('used_invoices')->default(0);
            $table->unsignedBigInteger('reserved_invoices')->default(0);
            $table->decimal('price_paid', 14, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('status')->default('active'); // active | consumed | expired | refunded
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_package_purchases');
        Schema::dropIfExists('tenant_subscriptions');
        Schema::dropIfExists('products');
        Schema::dropIfExists('customers');
    }
};

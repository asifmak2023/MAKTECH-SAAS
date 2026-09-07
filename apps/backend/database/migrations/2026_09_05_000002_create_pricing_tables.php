<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('billing_interval'); // monthly | yearly | custom
            $table->decimal('price', 14, 2)->default(0);
            $table->decimal('annual_price', 14, 2)->nullable();
            $table->string('currency', 3)->default('PKR');
            $table->unsignedBigInteger('invoice_limit')->nullable();
            $table->boolean('overage_allowed')->default(false);
            $table->decimal('overage_price', 14, 2)->nullable();
            $table->unsignedInteger('grace_period_hours')->nullable();
            $table->unsignedInteger('trial_days')->default(0);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('usage_packages', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('invoice_quantity');
            $table->decimal('price', 14, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->unsignedInteger('validity_days')->nullable();
            $table->boolean('overage_allowed')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->boolean('is_sandbox')->default(true);
            $table->text('config')->nullable(); // encrypted JSON (credentials live here)
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_gateways');
        Schema::dropIfExists('usage_packages');
        Schema::dropIfExists('subscription_plans');
    }
};

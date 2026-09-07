<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('legal_name')->nullable()->after('name');
            $table->string('status')->default('active')->index()->after('slug');
            $table->string('registration_type')->nullable()->after('legal_name');
            $table->string('city')->nullable()->after('seller_address');
            $table->string('business_category')->nullable()->after('city');
            $table->string('billing_email')->nullable()->after('seller_phone');
            $table->string('currency', 3)->default('PKR')->after('billing_email');
            $table->string('integrator')->default('pral')->after('currency');
            $table->string('fbr_mode')->default('sandbox')->after('integrator');
            $table->foreignId('owner_user_id')->nullable()->after('is_active');
            $table->timestamp('trial_ends_at')->nullable()->after('owner_user_id');
            $table->softDeletes();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_platform_admin')->default(false)->after('role');
            $table->boolean('is_active')->default(true)->after('is_platform_admin');
            $table->string('locale', 10)->default('en')->after('is_active');
            $table->string('timezone', 60)->nullable()->after('locale');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('user_id');
            $table->string('idempotency_key')->nullable()->unique()->after('approval_token');
            $table->unsignedInteger('submission_attempts')->default(0)->after('idempotency_key');
            $table->timestamp('canceled_at')->nullable()->after('rejected_at');
            $table->timestamp('usage_reserved_at')->nullable()->after('canceled_at');
            $table->timestamp('usage_consumed_at')->nullable()->after('usage_reserved_at');
            $table->string('usage_source_type')->nullable()->after('usage_consumed_at');
            $table->unsignedBigInteger('usage_source_id')->nullable()->after('usage_source_type');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropForeign(['owner_user_id']);
            $table->dropColumn([
                'legal_name', 'status', 'registration_type', 'city', 'business_category',
                'billing_email', 'currency', 'integrator', 'fbr_mode', 'owner_user_id',
                'trial_ends_at',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_platform_admin', 'is_active', 'locale', 'timezone']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn([
                'customer_id', 'idempotency_key', 'submission_attempts', 'canceled_at',
                'usage_reserved_at', 'usage_consumed_at', 'usage_source_type', 'usage_source_id',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fbr_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('integrator')->default('pral');
            $table->string('mode')->default('sandbox'); // sandbox | production
            $table->string('status')->default('unconfigured'); // unconfigured | configured | tested | failed
            $table->text('config')->nullable(); // encrypted JSON (token/base_url etc.)
            $table->json('last_test_response')->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'integrator', 'mode']);
        });

        Schema::create('fbr_submission_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // validate | submit | resubmit | approve | reject | cancel
            $table->unsignedInteger('attempt')->default(1);
            $table->json('request')->nullable();
            $table->json('response')->nullable();
            $table->string('status')->default('error'); // accepted | rejected | error
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->nullable()->index();

            $table->index(['invoice_id', 'attempt']);
        });

        Schema::create('invoice_usage_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('event'); // reserve | consume | release
            $table->string('source_type')->nullable(); // subscription | package | payg
            $table->unsignedBigInteger('source_id')->nullable();
            $table->unsignedBigInteger('quantity')->default(1);
            $table->decimal('unit_price', 14, 2)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'event']);
            $table->index(['invoice_id', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_usage_events');
        Schema::dropIfExists('fbr_submission_history');
        Schema::dropIfExists('fbr_integrations');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pral_reference_data', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();
            $table->string('code')->nullable();
            $table->string('name')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pral_reference_data');
    }
};

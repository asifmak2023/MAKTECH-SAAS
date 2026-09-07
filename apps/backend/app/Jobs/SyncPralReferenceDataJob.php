<?php

namespace App\Jobs;

use App\Services\PralInvoiceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncPralReferenceDataJob implements ShouldQueue
{
    use Queueable;

    public function handle(PralInvoiceService $pral): void
    {
        try {
            $pral->syncAllReferenceData();
        } catch (Throwable $e) {
            Log::warning('PRAL reference sync failed', ['error' => $e->getMessage()]);
        }
    }
}

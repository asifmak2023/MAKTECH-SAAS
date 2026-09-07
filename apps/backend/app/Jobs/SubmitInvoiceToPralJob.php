<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Services\Fbr\FbrInvoiceSubmitter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitInvoiceToPralJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $invoiceId) {}

    public function handle(FbrInvoiceSubmitter $submitter): void
    {
        $submitter->runFromJob($this->invoiceId);
    }
}

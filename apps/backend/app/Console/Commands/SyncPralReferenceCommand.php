<?php

namespace App\Console\Commands;

use App\Jobs\SyncPralReferenceDataJob;
use Illuminate\Console\Command;

class SyncPralReferenceCommand extends Command
{
    protected $signature = 'pral:sync-reference';

    protected $description = 'Refresh cached PRAL HS codes, UoMs, sale types and provinces';

    public function handle(): int
    {
        SyncPralReferenceDataJob::dispatchSync();
        $this->info('PRAL reference data sync completed.');

        return self::SUCCESS;
    }
}

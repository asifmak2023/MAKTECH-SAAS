<?php

use App\Jobs\SyncPralReferenceDataJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new SyncPralReferenceDataJob)->dailyAt('02:15');

Schedule::command('saas:maintain')->everyFiveMinutes()->withoutOverlapping();

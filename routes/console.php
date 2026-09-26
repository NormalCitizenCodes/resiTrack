<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Ends the Pregnant tag once the expected month plus 30 days has passed. Also started by the
// first request of each day (RunDailyHousekeeping) for hosts that run no scheduler.
Schedule::command('sectors:expire-pregnancies')->daily();

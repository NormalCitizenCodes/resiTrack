<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * The daily chores that must happen without anyone remembering, on a host with no scheduler
 * (the free Render plan sleeps and runs no cron). The first request of each day starts them
 * after its response has been sent, so nobody waits for them. Today that is ending expired
 * pregnancy tags; where a real scheduler exists, `sectors:expire-pregnancies` also runs daily
 * from routes/console.php and this becomes a harmless repeat.
 */
class RunDailyHousekeeping
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Cache::add only succeeds for the first request of the day, so the chores run once.
        if (! app()->runningUnitTests() && Cache::add('housekeeping:'.now()->toDateString(), true, now()->endOfDay())) {
            app()->terminating(function (): void {
                try {
                    Artisan::call('sectors:expire-pregnancies');
                } catch (Throwable $e) {
                    report($e);
                }
            });
        }

        return $response;
    }
}

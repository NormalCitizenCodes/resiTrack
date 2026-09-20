<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\Resident;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * The public home page. Only aggregate totals are exposed (never names or
     * any per-resident data), and they are cached briefly so a busy public page
     * does not hit the database on every visit.
     */
    public function __invoke(): Response
    {
        $stats = Cache::remember('landing.stats', now()->addMinutes(5), fn () => [
            'residents' => Resident::query()->where('is_active', true)->count(),
            'households' => Household::query()->count(),
            'programs' => Program::query()->where('status', 'active')->count(),
            'agencies' => PartnerAgency::query()->count(),
        ]);

        return Inertia::render('welcome', ['stats' => $stats]);
    }
}

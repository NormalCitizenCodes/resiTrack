<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The in-app Help page (role-specific guides; the wording lives in the page)
 * and hiding or bringing back the dashboard's getting-started checklist.
 */
class HelpController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('help', [
            'checklistHidden' => $request->user()->onboarding_dismissed_at !== null,
        ]);
    }

    public function dismissOnboarding(Request $request): RedirectResponse
    {
        $request->user()->forceFill(['onboarding_dismissed_at' => now()])->save();

        return back();
    }

    public function restoreOnboarding(Request $request): RedirectResponse
    {
        $request->user()->forceFill(['onboarding_dismissed_at' => null])->save();

        return redirect()->route('dashboard')->with('success', 'The getting started checklist is back on your dashboard.');
    }
}

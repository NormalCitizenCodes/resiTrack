<?php

namespace App\Http\Controllers;

use App\Models\Beneficiary;
use App\Models\Program;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BeneficiaryController extends Controller
{
    /**
     * A read-only roster of residents accepted into any of the agency's
     * programs, so an agency doesn't have to open each program's page to
     * compile its own list for reporting.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $programs = Program::query()
            ->when(! $user->isSuperAdmin(), fn ($q) => $q
                ->where('agency_id', $user->agency_id)
                ->when($user->barangay_id !== null, fn ($q) => $q
                    ->where(fn ($inner) => $inner->whereNull('barangay_id')->orWhere('barangay_id', $user->barangay_id))))
            ->orderBy('title')
            ->get(['id', 'title']);

        $beneficiaries = Beneficiary::query()
            ->whereIn('program_id', $programs->pluck('id'))
            ->when($request->string('program_id')->value(), fn ($q, $programId) => $q->where('program_id', $programId))
            ->with([
                'program:id,title',
                'resident:id,first_name,last_name,middle_name,barangay_id',
                'resident.barangay:id,name',
            ])
            ->latest('date_added')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('beneficiaries/index', [
            'beneficiaries' => $beneficiaries,
            'programs' => $programs,
            'filters' => $request->only(['program_id']),
        ]);
    }
}

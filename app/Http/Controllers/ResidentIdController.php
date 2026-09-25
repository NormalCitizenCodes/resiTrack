<?php

namespace App\Http\Controllers;

use App\Models\Beneficiary;
use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The resident's digital ID card and the page its QR code opens.
 *
 * The card is a resiTrack membership card, not a government-issued ID. The
 * QR code holds a link to /verify/{resident id}?s={signature}; the signature
 * (Resident::idSignature) means a typed or guessed number does not verify.
 * Opening the link needs a staff or partner agency login, and shows only
 * what someone checking an ID at a counter needs.
 */
class ResidentIdController extends Controller
{
    public function show(Request $request): Response
    {
        $resident = $request->user()->resident_id
            ? Resident::with(['barangay:id,name,city_municipality', 'sectors:id,code,sector_name'])->find($request->user()->resident_id)
            : null;

        if ($resident === null || $resident->resident_id === null) {
            return Inertia::render('my-id', ['card' => null]);
        }

        $verifyUrl = route('resident-id.verify', [
            'residentId' => $resident->resident_id,
            's' => Resident::idSignature($resident->resident_id),
        ]);

        return Inertia::render('my-id', [
            'card' => [
                'full_name' => $resident->full_name,
                'first_name' => $resident->first_name,
                'last_name' => $resident->last_name,
                'resident_id' => $resident->resident_id,
                'barangay' => $resident->barangay?->getAttribute('name'),
                'city' => $resident->barangay?->getAttribute('city_municipality'),
                'date_of_birth' => $resident->date_of_birth?->toDateString(),
                'sex' => $resident->sex,
                'is_active' => $resident->is_active,
                'registered_on' => ($resident->profiled_at ?? $resident->registered_at ?? $resident->created_at)?->toDateString(),
                'sectors' => $resident->sectors->map(fn ($sector) => [
                    'code' => $sector->getAttribute('code'),
                    'name' => $sector->getAttribute('sector_name'),
                ])->values()->all(),
                'qr_svg' => $this->qrSvg($verifyUrl),
            ],
        ]);
    }

    public function verify(Request $request, string $residentId): Response
    {
        $user = $request->user();
        $signature = $request->string('s')->value();

        $resident = Resident::with(['barangay:id,name', 'sectors:id,code,sector_name'])
            ->where('resident_id', $residentId)
            ->first();

        $valid = $resident !== null && $signature !== '' && hash_equals(Resident::idSignature($residentId), $signature);

        AuditLogger::record('verify_id', 'residents', $resident?->id, null, [
            'resident_id' => $residentId,
            'result' => $valid ? 'valid' : 'invalid',
        ]);

        if (! $valid) {
            return Inertia::render('residents/verify', ['result' => null, 'checkedId' => $residentId]);
        }

        // Staff can open the full record only inside their own barangay, the
        // same rule as ResidentController; the super admin can open any.
        $canOpenRecord = $user->isSuperAdmin()
            || ($user->isBarangayStaff() && $user->barangay_id === $resident->barangay_id);

        return Inertia::render('residents/verify', [
            'checkedId' => $residentId,
            'result' => [
                'id' => $resident->id,
                'full_name' => $resident->full_name,
                'resident_id' => $resident->resident_id,
                'barangay' => $resident->barangay?->getAttribute('name'),
                'age' => $resident->age,
                'sex' => $resident->sex,
                'is_active' => $resident->is_active,
                'sectors' => $resident->sectors->map(fn ($sector) => [
                    'code' => $sector->getAttribute('code'),
                    'name' => $sector->getAttribute('sector_name'),
                ])->values()->all(),
                'can_open_record' => $canOpenRecord,
                'agency_programs' => $user->role === User::ROLE_PARTNER_AGENCY ? $this->agencyPrograms($user, $resident) : null,
            ],
        ]);
    }

    /**
     * For an agency checking someone in on a payout day: which of the
     * agency's own programs this person is an active beneficiary of.
     *
     * @return array<int, array{id: int, title: string}>
     */
    private function agencyPrograms(User $user, Resident $resident): array
    {
        return Beneficiary::query()
            ->where('resident_id', $resident->id)
            ->where('status', 'active')
            ->whereHas('program', fn ($q) => $q->where('agency_id', $user->agency_id))
            ->with('program:id,title')
            ->get()
            ->map(fn (Beneficiary $beneficiary) => [
                'id' => (int) $beneficiary->program_id,
                'title' => (string) $beneficiary->program?->getAttribute('title'),
            ])
            ->values()
            ->all();
    }

    private function qrSvg(string $url): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle(240, 2), new SvgImageBackEnd)))->writeString($url);

        // Drop the XML prolog; the markup is embedded inline in the page.
        return trim((string) preg_replace('/^<\?xml[^>]*>/', '', $svg));
    }
}

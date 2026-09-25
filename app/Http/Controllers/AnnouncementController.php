<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Resident;
use App\Models\VulnerabilitySector;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user->isBarangayStaff();

        $query = Announcement::query()
            ->with(['author:id,name', 'sectors:id,code,sector_name', 'barangay:id,name'])
            ->latest('posted_at');

        if ($canManage) {
            // Staff manage their own barangay's posts (super admin sees all).
            $query->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id));
        } elseif ($user->role === 'resident') {
            // Residents see active posts for their barangay that are either a
            // broadcast (no sectors attached) or targeted at any of their sectors.
            $sectorIds = $this->residentSectorIds($user);

            $query->where('barangay_id', $user->barangay_id)
                ->where(function ($q) use ($sectorIds) {
                    $q->whereDoesntHave('sectors')
                        ->orWhereHas('sectors', fn ($s) => $s->whereIn('vulnerability_sectors.id', $sectorIds));
                })
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', Carbon::now()));
        } else {
            // Partner agencies: active broadcast announcements only.
            $query->whereDoesntHave('sectors')
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', Carbon::now()));
        }

        return Inertia::render('announcements/index', [
            'announcements' => $query->paginate(10),
            'canManage' => $canManage,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('announcements/create', [
            'sectors' => VulnerabilitySector::orderBy('id')->get(['id', 'code', 'sector_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'content' => ['required', 'string', 'max:5000'],
            'sector_ids' => ['nullable', 'array'],
            'sector_ids.*' => ['integer', 'exists:vulnerability_sectors,id'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);

        $announcement = Announcement::create([
            'posted_by' => $user->id,
            'barangay_id' => $user->barangay_id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'posted_at' => Carbon::now(),
            'expires_at' => $validated['expires_at'] ?? null,
        ]);
        $announcement->sectors()->sync($validated['sector_ids'] ?? []);

        AuditLogger::record('create', 'announcements', $announcement->id, null, ['title' => $announcement->title]);

        $notified = NotificationService::notifyAnnouncement($announcement);

        return redirect()
            ->route('announcements.index')
            ->with('success', "Announcement posted. {$notified} resident(s) notified.");
    }

    public function destroy(Request $request, Announcement $announcement): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $announcement->barangay_id !== $user->barangay_id) {
            abort(403, 'This announcement belongs to another barangay.');
        }

        AuditLogger::record('delete', 'announcements', $announcement->id, ['title' => $announcement->title]);
        $announcement->delete();

        return back()->with('success', 'Announcement deleted.');
    }

    /**
     * @return array<int, int>
     */
    private function residentSectorIds($user): array
    {
        if (! $user->resident_id) {
            return [];
        }

        return Resident::query()
            ->whereKey($user->resident_id)
            ->first()
            ?->sectors->pluck('id')->all() ?? [];
    }
}

# resiTrack

**A Web- and Mobile-Based Resident Profiling System for Data-Driven Decision-Making and Equitable Distribution of Social Services Across Barangays.**

Capstone implementation for Barangay 22, Cagayan de Oro City. This repository turns the approved research proposal into a working system.

## Tech Stack

Matches the stack specified in the research paper (Chapter III, §3.5.1):

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Inertia.js + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Backend | Laravel 13 (PHP 8.4), Eloquent ORM |
| Auth | Laravel Fortify (role-based, 2FA & passkeys available) |
| Database | SQLite for local dev — portable to PostgreSQL / Supabase for production |

> The paper targets PostgreSQL/Supabase in production. Eloquent migrations are database-agnostic, so development runs on zero-config SQLite and can be pointed at Supabase by changing `.env`.

## Getting Started

```bash
# 1. Install dependencies (already done if you cloned a complete copy)
composer install
npm install

# 2. Environment + database
cp .env.example .env          # if .env is missing
php artisan key:generate
php artisan migrate:fresh --seed

# 3. Run everything (server + Vite + queue + logs)
composer run dev
```

Then open http://localhost:8000.

To run the backend and frontend separately:

```bash
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server (HMR)
```

## Test Accounts

All seeded accounts use their email address as their password.

| Role | Email | Sees |
| --- | --- | --- |
| Super Admin | `superadmin@resitrack.test` | City-wide dashboard, all barangays |
| Barangay Admin (Secretary) | `secretary@resitrack.test` | Barangay 22 residents, households, alerts |
| Barangay Health Worker | `bhw@resitrack.test` | Barangay 22 field data entry |
| Partner Agency (DSWD) | `agency@resitrack.test` | Dashboard (programs module upcoming) |
| Resident | `resident@resitrack.test` | Dashboard (self-service portal upcoming) |

## What's Implemented

### Foundation
- Full database schema — 20 tables from the ERD (`resiTrack-ERD.png`): barangays, zones, households, residents, vulnerability sectors, sector criteria, programs, applications, beneficiaries, duplicate alerts, notifications, audit logs, offline-sync logs, and more.
- Eloquent models with relationships for every table.
- Role-based access control across the 5 user roles (`role` middleware).

### Module 1 — Resident Profiling & Duplicate Detection (Objective 1)
- **Household registration** (RBI Form A) and **resident registration** (RBI Form B) with point-of-entry data validation (format, range, and cross-field consistency checks).
- **Rule-based compound-vulnerability classification** — a resident may belong to several sectors at once. Senior Citizen and Out-of-School Youth are derived from age/education; PWD, Solo Parent, and Pregnant are certified flags. Rules live in the `sector_criteria` table (`App\Services\SectorClassificationService`).
- **Duplicate & cross-barangay transfer detection** — every new/edited resident is screened across *all* barangays (PhilSys number, name + DOB, name + address). Matches in another barangay are surfaced as transfers (`App\Services\DuplicateDetectionService`). A review UI lets staff resolve (keep one, deactivate the other) or dismiss false positives.
- **Barangay dashboard** — total residents, total households, pending alerts, age distribution, and per-sector counts.

### Module 2 — Partner-Agency Programs (Objective 2)
- **Agencies** (DSWD, PESO, CEDO) publish social service programs, targeting specific vulnerability sectors with slots and dates.
- **Sector-based eligibility matching** (`App\Services\ProgramEligibilityService`) connects a program to the residents who qualify — the bridge from Module 1's classification to service delivery.
- **Barangay targeting** — a program can optionally be restricted to one barangay (`programs.barangay_id`, null = city-wide). resiTrack is one shared system across every barangay that adopts it (not a separate deployment per barangay — that's what makes cross-barangay duplicate/transfer detection possible at all), so without this, a Barangay-22-only relief fund would show as "eligible" to every other barangay's residents too. Agencies pick a target barangay the same way they pick target sectors.
- **Barangay staff** browse programs, see their sector-eligible residents, and endorse them (apply on their behalf, reflecting the low-digital-literacy field context).
- **Residents** browse programs matched to their sectors (and barangay, if targeted), apply, and track application status under *My Applications*.
- **Application review** — agencies approve (creates a `beneficiary` record and fills a slot) or reject applications, with ownership enforced so an agency only reviews its own programs.

### Module 3 — Reporting & Visualization Dashboard (Objective 3)
- **Reports & Sector Dashboard** for barangay staff — sector summary (5 vulnerability sectors + 4Ps beneficiary households) and a 30-day audit summary (records updated, new registrations, duplicate alerts resolved, program applications).
- **Exports for LGU compliance** — the *Sector Dashboard* report as a printable **PDF** (`barryvdh/laravel-dompdf`, pure-PHP) and a *Resident Population* roster as **CSV** (streamed).
- **Real audit trail** (`App\Services\AuditLogger`) — meaningful mutations across Modules 1 & 2 (resident/household create & update, duplicate resolve/dismiss, program apply/approve/reject) and report generation are recorded in `audit_logs`, which also powers the "previously generated reports" history table.
- All stats are barangay-scoped (super admin sees city-wide), reusing `DashboardStatsService` to avoid duplicating aggregation logic.

### Community Features
- **Household Wellbeing Assessment** — barangay staff record a household's wellbeing tier (Survival / Subsistence / Self-Sufficient) with a dated, append-only history on the household page, complementing resident-level sector classification with a household-level need signal.
- **Announcements** — staff post barangay-wide broadcasts or target one or more vulnerability sectors at once (`announcement_sectors` pivot, same shape as program targeting); residents see a filtered feed (their barangay + broadcasts or any of their own sectors).
- **In-app Notifications** (`App\Services\NotificationService`) — residents are notified when a matching program is published, when their application is approved/rejected, and when a relevant announcement is posted. A header bell shows the unread count (shared via Inertia props).

### Resident Self-Service Dashboard
Residents get a distinct dashboard from barangay staff — a feed, not the aggregate stats view (`App\Http\Controllers\DashboardController` branches by role; the previous behavior had every role sharing the staff stats page, including a "Pending Duplicate Alerts" card residents couldn't actually open).
- **Feed** — the resident's own notifications (program matches, announcements, application outcomes) rendered as a chronological card feed, with mark-read wired to the existing notification routes.
- **Profile completeness nudge** (`App\Services\ResidentDashboardService`) — a percent-complete bar over contact/socio-economic fields, linking to a new self-service **My Profile** page. This is mechanical, not cosmetic: those fields feed `SectorClassificationService`, so filling in e.g. employment/education status can change which sectors — and therefore which programs — a resident qualifies for.
- **My Profile** (`App\Http\Controllers\MyProfileController`, route `my-profile`) — residents edit a deliberately small field subset (contact info, address, civil status, occupation, employment/education status, income). Identity fields and certified vulnerability flags (PWD, solo parent, pregnant) stay staff-only, since those require document verification via `ResidentController`. Saving re-runs sector classification.
- **Sectors & why** — `SectorClassificationService::explain()` turns the resident's current `sector_criteria` matches into plain-English reasons (e.g. "Age 73 (must be 60 or older)"), so classification isn't an invisible backend rule.

### Accessibility for Low Digital Literacy, Language, and Seniors
Built after realizing residents who can't use a phone at all already have a safety net (BHWs can register and endorse them without a screen) — these three features are for residents who *can* use a phone but face literacy, language, or vision/motor barriers along the way.
- **Comfortable scale** (`resources/js/hooks/use-comfortable-scale.ts`) — resident sessions get a 120% root font-size bump (`html.comfortable-scale` in `app.css`), automatically, with no toggle needed since the role is already known at render time. Because Tailwind's spacing/sizing scale is rem-based, this proportionally enlarges text, buttons, icons, and tap targets together — the same effect as increasing browser zoom, just scoped to residents.
- **Filipino / Bisaya language toggle** — a switcher in the header (residents only) translates the static UI chrome (navigation, buttons, status words, form labels) on resident-facing pages into Filipino or Cebuano/Bisaya, not just Filipino: Barangay 22 is in Cagayan de Oro (Region X), where Cebuano is the language most residents actually think in, even though Filipino is taught in school. Preference persists via a plain (unencrypted, see `bootstrap/app.php`'s `encryptCookies(except:)`) `resident_lang` cookie, mirroring the existing `sidebar_state` cookie pattern. Deliberately **not** translated: program titles, resident names, sector names, and auto-generated classification reasons — those are user/system-generated content, a different problem than translating fixed UI text. Machine-authored; the Cebuano strings in particular should get a native-speaker proofread before a live defense.
- **Read-aloud** (`resources/js/components/read-aloud-button.tsx`) — a "listen" button on feed items, announcements, and program descriptions using the browser's built-in Web Speech API (free, no backend). Solves illiteracy, not just language — translation alone doesn't help someone who can't read at all. Voice quality/availability for Filipino/Cebuano depends on the resident's device; Android phones generally fare better than desktop browsers.

### Staff Account Management
`barangay_admin` and `bhw` previously had *identical* permissions everywhere in the app — same routes, same access — which undercuts the RBAC objective and doesn't match how a real barangay works (a BHW shouldn't be able to create other staff logins, including admin ones). This closes that gap and gives the two roles an actual functional difference.
- **`App\Http\Controllers\StaffController`** (routes under `/staff`, gated to `super_admin,barangay_admin` — explicitly excludes `bhw`) — list, create, and deactivate staff within your own barangay. A `barangay_admin` can only create `bhw` accounts; only `super_admin` can create a peer `barangay_admin`, for any barangay. Self-deactivation is blocked.
- **Deactivation now actually works.** Found while building this: `users.is_active` existed in the schema but nothing ever checked it — a "deactivated" account could still log in. Fixed in two places: `FortifyServiceProvider::authenticateUsing()` rejects login for an inactive account with a clear message, and `App\Http\Middleware\EnsureAccountIsActive` force-logs-out an already-open session the moment the account is deactivated, not just on the next login attempt.
- Also fixed while wiring this up: `is_active` defaults to `true` at the DB level, but that default only applies on INSERT — an in-memory object (like the one Fortify hands straight to `Auth::login()` during self-registration, or what `actingAs()` uses in tests) never saw it, which would have logged out every freshly-registered user immediately. Fixed by setting the default on the `User` model itself (`protected $attributes`), not just the migration — `ResidentFactory` already did this for the same reason; `UserFactory` just hadn't needed to until `is_active` was actually checked anywhere.

## Testing

```bash
php artisan test
```

Feature tests in `tests/Feature/ResidentProfilingTest.php` cover role access control, automatic sector classification, compound-vulnerability detection, in-barangay duplicate flagging, cross-barangay transfer detection, and validation. `tests/Feature/ResidentDashboardTest.php` covers the resident feed dashboard, profile completeness, and self-service edits re-triggering classification.

## Roadmap (next)

- **BHW offline sync** (table `offline_sync_logs` scaffolded).
- **Production deployment** to Supabase/PostgreSQL.

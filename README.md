# ResiTrack

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-115%20passing-22C55E)

**A Web- and Mobile-Based Resident Profiling System for Data-Driven Decision-Making and Equitable Distribution of Social Services Across Barangays.**

ResiTrack is a multi-barangay resident profiling and social services platform for barangay staff, residents, partner agencies, and city administrators. It is a capstone implementation for Cagayan de Oro City that turns the approved research proposal into a working system.

The core design rule is:

> **Role determines what a user can do. `barangay_id` determines where they can do it.**

## Tech Stack

Matches the stack specified in the research paper (Chapter III, §3.5.1):

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Inertia.js + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Backend | Laravel 13 (PHP 8.4), Eloquent ORM |
| Auth | Laravel Fortify (role-based, 2FA, and passkeys available) |
| Database | SQLite for local dev — portable to PostgreSQL / Supabase for production |

> The paper targets PostgreSQL/Supabase in production. Eloquent migrations are database-agnostic, so development runs on zero-config SQLite and can be pointed at Supabase by changing `.env`.

## Requirements

- PHP 8.4+
- Composer
- Node.js 22+
- npm
- SQLite for local development, or PostgreSQL-compatible configuration for deployment

## Getting Started

```bash
# 1. Install dependencies
composer install
npm install

# 2. Configure the application
copy .env.example .env       # Windows PowerShell
# cp .env.example .env       # macOS/Linux
php artisan key:generate

# 3. Create the database and seed reference data
php artisan migrate --seed

# 4. Run everything (server + Vite + queue + logs)
composer run dev
```

Then open http://localhost:8000.

To run the backend and frontend separately:

```bash
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server (HMR)
```

For a clean local database, use `php artisan migrate:fresh --seed`. Do not use that command against a shared or production database.

## Useful Commands

```bash
php artisan test          # Laravel/Pest feature and unit tests
npm run types:check       # TypeScript validation
npm run build             # Production frontend build
npm run lint:check       # ESLint validation
php artisan route:list    # Registered routes and middleware
```

## Test Accounts

All seeded accounts use their email address as their password.

| Role | Email | Password | Scope |
| --- | --- | --- | --- |
| Super Admin | `superadmin@resitrack.test` | Same as email | All barangays and system-wide administration |
| Barangay Admin | `secretary@resitrack.test` | Same as email | Barangay 22 |
| BHW | `bhw@resitrack.test` | Same as email | Barangay 22 field operations |
| Barangay Admin | `secretary.b23@resitrack.test` | Same as email | Barangay 23 |
| BHW | `bhw.b23@resitrack.test` | Same as email | Barangay 23 field operations |
| Partner Agency | `agency@resitrack.test` | Same as email | Assigned agency programs |

Seeded reference barangays include Barangays 21, 22, 23, and 24. Test data may add resident accounts during profiling tests or local workflows.

## What's Implemented

### Foundation
- Full relational database schema from the ERD (`resiTrack-ERD.png`): barangays, zones, households, residents, vulnerability sectors, sector criteria, programs, applications, beneficiaries, duplicate alerts, notifications, audit logs, account requests, offline-sync logs, and more.
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
- **In-app Notifications** (`App\Services\NotificationService`) — notifications use contextual `action_url` destinations, are pressable from the notification page and dashboard feed, mark themselves read on navigation, and support `read_at` timestamps. BHW and admin notifications open the exact registration, profiling form, recovery request, deletion request, or reactivation request.

### Account Deletion and Reactivation
- Residents cannot permanently delete their accounts through the normal interface. They submit an account deletion request with a reason.
- Barangay Admins handle normal deletion and reactivation requests for their assigned barangay. Super Admins have system-wide oversight and escalation authority. BHWs cannot approve or reject these requests.
- Approved deletion requests deactivate `users.is_active` while preserving the User, Resident, Resident ID, household, profiling, program, notification, and audit history.
- Deactivated residents can request reactivation using their registered email or Resident ID. Duplicate pending requests are prevented.
- Authorized administrators verify identity, add remarks, approve or reject, restore the existing account, and trigger a clickable resident notification. Reactivation never creates a replacement account or Resident ID.

### Partner Agency Management
- Partner Agency organizations use the existing `partner_agencies` table and agency accounts use the existing `partner_agency` role, `users.agency_id`, and `users.barangay_id` relationships.
- Super Admins can create and edit organizations, assign accounts across barangays, and activate/deactivate accounts.
- Barangay Admins can create and manage agency accounts only within their assigned barangay. The barangay assignment is locked server-side and in the form.
- BHWs and residents cannot manage partner agency accounts. Agency program access is limited by agency ownership and assigned barangay where applicable.

### Resident Self-Service Dashboard
Residents get a distinct dashboard from barangay staff — a feed, not the aggregate stats view (`App\Http\Controllers\DashboardController` branches by role; the previous behavior had every role sharing the staff stats page, including a "Pending Duplicate Alerts" card residents couldn't actually open).
- **Feed** — the resident's own notifications (program matches, announcements, application outcomes) rendered as a chronological card feed, with mark-read wired to the existing notification routes.
- **Profile completeness nudge** (`App\Services\ResidentDashboardService`) — a percent-complete bar over contact/socio-economic fields, linking to a new self-service **My Profile** page. This is mechanical, not cosmetic: those fields feed `SectorClassificationService`, so filling in e.g. employment/education status can change which sectors — and therefore which programs — a resident qualifies for.
- **My Profile** (`App\Http\Controllers\MyProfileController`, route `my-profile`) — residents edit a deliberately small field subset (contact info, address, civil status, occupation, employment/education status, income). Identity fields and certified vulnerability flags (PWD, solo parent, pregnant) stay staff-only, since those require document verification via `ResidentController`. Saving re-runs sector classification.
- **Sectors & why** — `SectorClassificationService::explain()` turns the resident's current `sector_criteria` matches into plain-English reasons (e.g. "Age 73 (must be 60 or older)"), so classification isn't an invisible backend rule.

### Accessibility for Low Digital Literacy, Language, and Seniors
Built after realizing residents who can't use a phone at all already have a safety net (BHWs can register and endorse them without a screen) — these three features are for residents who *can* use a phone but face literacy, language, or vision/motor barriers along the way.
- **Comfortable scale** (`resources/js/hooks/use-comfortable-scale.ts`) — resident sessions get a 120% root font-size bump (`html.comfortable-scale` in `app.css`), automatically, with no toggle needed since the role is already known at render time. Because Tailwind's spacing/sizing scale is rem-based, this proportionally enlarges text, buttons, icons, and tap targets together — the same effect as increasing browser zoom, just scoped to residents.
- **English / Filipino / Bisaya language toggle** — a shared header switcher is available to residents, BHWs, barangay admins, super admins, and partner agency users. It translates fixed UI chrome and staff navigation, and persists the preference in the `app_lang` cookie. Program titles, resident names, sector names, and other user-generated content remain unchanged.
- **Read-aloud** (`resources/js/components/read-aloud-button.tsx`) — a "listen" button on feed items, announcements, and program descriptions using the browser's built-in Web Speech API (free, no backend). Solves illiteracy, not just language — translation alone doesn't help someone who can't read at all. Voice quality/availability for Filipino/Cebuano depends on the resident's device; Android phones generally fare better than desktop browsers.

### Staff Account Management
`barangay_admin` and `bhw` previously had *identical* permissions everywhere in the app — same routes, same access — which undercuts the RBAC objective and doesn't match how a real barangay works (a BHW shouldn't be able to create other staff logins, including admin ones). This closes that gap and gives the two roles an actual functional difference.
- **`App\Http\Controllers\StaffController`** (routes under `/staff`, gated to `super_admin,barangay_admin` — explicitly excludes `bhw`) — list, create, and deactivate staff within your own barangay. A `barangay_admin` can only create `bhw` accounts; only `super_admin` can create a peer `barangay_admin`, for any barangay. Self-deactivation is blocked.
- **Deactivation now actually works.** Found while building this: `users.is_active` existed in the schema but nothing ever checked it — a "deactivated" account could still log in. Fixed in two places: `FortifyServiceProvider::authenticateUsing()` rejects login for an inactive account with a clear message, and `App\Http\Middleware\EnsureAccountIsActive` force-logs-out an already-open session the moment the account is deactivated, not just on the next login attempt.
- Also fixed while wiring this up: `is_active` defaults to `true` at the DB level, but that default only applies on INSERT — an in-memory object (like the one Fortify hands straight to `Auth::login()` during self-registration, or what `actingAs()` uses in tests) never saw it, which would have logged out every freshly-registered user immediately. Fixed by setting the default on the `User` model itself (`protected $attributes`), not just the migration — `ResidentFactory` already did this for the same reason; `UserFactory` just hadn't needed to until `is_active` was actually checked anywhere.

### Multi-Barangay Access Control
- `super_admin` users can access system-wide data and all barangays.
- `barangay_admin` and `bhw` users are scoped server-side to their assigned `barangay_id` for normal resident, household, staff, request, and agency-account operations.
- Partner agency accounts are scoped by both `agency_id` and `barangay_id` where the program is barangay-targeted.
- Duplicate and transfer detection intentionally remains system-wide so potential cross-barangay matches are not missed.
- Frontend filtering is not the security boundary; controllers, request validation, role middleware, and authorization checks enforce access.

## Testing

```bash
php artisan test
```

Feature tests cover role access control, automatic sector classification, compound-vulnerability detection, in-barangay duplicate flagging, cross-barangay transfer detection, resident dashboards, self-service edits, account deletion, account reactivation, barangay isolation, Partner Agency management, program targeting, and authorization boundaries.

## Roadmap

- **BHW offline sync** (table `offline_sync_logs` scaffolded).
- **Production deployment** to Supabase/PostgreSQL.
- Native email delivery for account and request notifications.
- Native-speaker review of Filipino and Bisaya translations.

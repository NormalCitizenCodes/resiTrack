# resiTrack

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-130%20passing-22C55E)

**A Web- and Mobile-Based Resident Profiling System for Data-Driven Decision-Making and Equitable Distribution of Social Services Across Barangays.**

*Track today. Brighter tomorrows.*

resiTrack is a multi-barangay resident profiling and social services platform for barangay staff, residents, partner agencies, and city administrators. It is a capstone implementation for Cagayan de Oro City that turns the approved research proposal into a working system.

The core design rule is:

> **Role determines what a user can do. `barangay_id` determines where they can do it.**

## Tech Stack

Matches the stack specified in the research paper (Chapter III, §3.5.1):

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Inertia.js + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui, Inter typeface, brand tokens in `resources/css/app.css` |
| Backend | Laravel 13 (PHP 8.4), Eloquent ORM |
| Auth | Laravel Fortify (role-based, 2FA, and passkeys available) |
| Database | SQLite for local dev - portable to PostgreSQL / Supabase for production |

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
composer test             # config clear + Pint check + PHPStan + tests
composer ci:check         # everything CI runs (ESLint, Prettier, tsc, tests)
npm run types:check       # TypeScript validation
npm run build             # Production frontend build
npm run lint:check        # ESLint validation
php artisan route:list    # Registered routes and middleware
```

## Test Accounts

The seeded staff and agency accounts use their email address as their password. The sample resident account is the exception.

| Role | Email | Password | Scope |
| --- | --- | --- | --- |
| Super Admin | `superadmin@resitrack.test` | Same as email | City-wide, read-only for resident and household records |
| Barangay Admin | `secretary@resitrack.test` | Same as email | Barangay 22 |
| BHW | `bhw@resitrack.test` | Same as email | Barangay 22 field operations |
| Barangay Admin | `secretary.b23@resitrack.test` | Same as email | Barangay 23 |
| BHW | `bhw.b23@resitrack.test` | Same as email | Barangay 23 field operations |
| Partner Agency | `agency@resitrack.test` | Same as email | Assigned agency programs |
| Resident | `resident@resitrack.test` | `password` | A profiled resident in Barangay 22 |

Seeded reference barangays include Barangays 21, 22, 23, and 24. Test data may add resident accounts during profiling tests or local workflows. The database migration `2026_09_20_000001` adds the duplicate-alert escalation columns, so run `php artisan migrate` after pulling.

## What's Implemented

### Foundation
- Full relational database schema from the ERD (`resiTrack-ERD.png`): barangays, zones, households, residents, vulnerability sectors, sector criteria, programs, applications, beneficiaries, duplicate alerts, notifications, audit logs, account requests, offline-sync logs, and more.
- Eloquent models with relationships for every table.
- Role-based access control across the 5 user roles (`role` middleware).

### Module 1 - Resident Profiling & Duplicate Detection (Objective 1)
- **Household registration** (RBI Form A) and **resident registration** (RBI Form B) with point-of-entry data validation (format, range, and cross-field consistency checks).
- **Rule-based compound-vulnerability classification** - a resident may belong to several sectors at once. Senior Citizen and Out-of-School Youth are derived from age/education; PWD, Solo Parent, and Pregnant are certified flags. Rules live in the `sector_criteria` table (`App\Services\SectorClassificationService`).
- **Duplicate & cross-barangay transfer detection** - every new/edited resident is screened across *all* barangays (PhilSys number, name + DOB, name + address). Matches in another barangay are surfaced as transfers (`App\Services\DuplicateDetectionService`). A review UI lets staff resolve (keep one, deactivate the other) or dismiss false positives, and a BHW can escalate a case they cannot settle to the barangay admin (see *Duplicate Review and Escalation*).
- **Barangay dashboard** - total residents, total households, pending alerts, age distribution, and per-sector counts.

### Module 2 - Partner-Agency Programs (Objective 2)
- **Agencies** (DSWD, PESO, CEDO) publish social service programs, targeting specific vulnerability sectors with slots and dates.
- **Sector-based eligibility matching** (`App\Services\ProgramEligibilityService`) connects a program to the residents who qualify - the bridge from Module 1's classification to service delivery.
- **Barangay targeting** - a program can optionally be restricted to one barangay (`programs.barangay_id`, null = city-wide). resiTrack is one shared system across every barangay that adopts it (not a separate deployment per barangay - that's what makes cross-barangay duplicate/transfer detection possible at all), so without this, a Barangay-22-only relief fund would show as "eligible" to every other barangay's residents too. Agencies pick a target barangay the same way they pick target sectors.
- **Barangay staff** browse programs, see their sector-eligible residents, and endorse them (apply on their behalf, reflecting the low-digital-literacy field context).
- **Residents** browse programs matched to their sectors (and barangay, if targeted), apply, and track application status under *My Applications*.
- **Application review** - agencies approve (creates a `beneficiary` record and fills a slot) or reject applications, with ownership enforced so an agency only reviews its own programs.

### Module 3 - Reporting & Visualization Dashboard (Objective 3)
- **Reports & Sector Dashboard** for barangay staff - sector summary (5 vulnerability sectors + 4Ps beneficiary households) and a 30-day audit summary (records updated, new registrations, duplicate alerts resolved, program applications).
- **Exports for LGU compliance** - the *Sector Dashboard* report as a printable **PDF** (`barryvdh/laravel-dompdf`, pure-PHP) and a *Resident Population* roster as **CSV** (streamed).
- **Real audit trail** (`App\Services\AuditLogger`) - meaningful mutations across Modules 1 & 2 (resident/household create & update, duplicate resolve/dismiss, program apply/approve/reject) and report generation are recorded in `audit_logs`, which also powers the "previously generated reports" history table.
- All stats are barangay-scoped (super admin sees city-wide), reusing `DashboardStatsService` to avoid duplicating aggregation logic.

### Community Features
- **Household Wellbeing Assessment** - barangay staff record a household's wellbeing tier (Survival / Subsistence / Self-Sufficient) with a dated, append-only history on the household page, complementing resident-level sector classification with a household-level need signal.
- **Announcements** - staff post barangay-wide broadcasts or target one or more vulnerability sectors at once (`announcement_sectors` pivot, same shape as program targeting); residents see a filtered feed (their barangay + broadcasts or any of their own sectors).
- **In-app Notifications** (`App\Services\NotificationService`) - notifications use contextual `action_url` destinations, are pressable from the notification page and dashboard feed, mark themselves read on navigation, and support `read_at` timestamps. BHW and admin notifications open the exact registration, profiling form, recovery request, deletion request, or reactivation request.

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
Residents get a distinct dashboard from barangay staff - a feed, not the aggregate stats view (`App\Http\Controllers\DashboardController` branches by role; the previous behavior had every role sharing the staff stats page, including a "Pending Duplicate Alerts" card residents couldn't actually open).
- **Feed** - the resident's own notifications (program matches, announcements, application outcomes) rendered as a chronological card feed, with mark-read wired to the existing notification routes.
- **Profile completeness nudge** (`App\Services\ResidentDashboardService`) - a percent-complete bar over contact/socio-economic fields, linking to a new self-service **My Profile** page. This is mechanical, not cosmetic: those fields feed `SectorClassificationService`, so filling in e.g. employment/education status can change which sectors - and therefore which programs - a resident qualifies for.
- **My Profile** (`App\Http\Controllers\MyProfileController`, route `my-profile`) - residents edit a deliberately small field subset (contact info, address, civil status, occupation, employment/education status, income). Identity fields and certified vulnerability flags (PWD, solo parent, pregnant) stay staff-only, since those require document verification via `ResidentController`. Saving re-runs sector classification.
- **Sectors & why** - `SectorClassificationService::explain()` turns the resident's current `sector_criteria` matches into plain-English reasons (e.g. "Age 73 (must be 60 or older)"), so classification isn't an invisible backend rule.

### Accessibility for Low Digital Literacy, Language, and Seniors
Built after realizing residents who can't use a phone at all already have a safety net (BHWs can register and endorse them without a screen) - these three features are for residents who *can* use a phone but face literacy, language, or vision/motor barriers along the way.
- **Comfortable scale** (`resources/js/hooks/use-comfortable-scale.ts`) - resident sessions get a 120% root font-size bump (`html.comfortable-scale` in `app.css`), automatically, with no toggle needed since the role is already known at render time. Because Tailwind's spacing/sizing scale is rem-based, this proportionally enlarges text, buttons, icons, and tap targets together - the same effect as increasing browser zoom, just scoped to residents.
- **English / Filipino / Bisaya language toggle** - a shared header switcher is available to residents, BHWs, barangay admins, super admins, and partner agency users. It translates fixed UI chrome and staff navigation, and persists the preference in the `app_lang` cookie. Program titles, resident names, sector names, and other user-generated content remain unchanged.
- **Read-aloud** (`resources/js/components/read-aloud-button.tsx`) - a "listen" button on feed items, announcements, and program descriptions using the browser's built-in Web Speech API (free, no backend). Solves illiteracy, not just language - translation alone doesn't help someone who can't read at all. Voice quality/availability for Filipino/Cebuano depends on the resident's device; Android phones generally fare better than desktop browsers.

### Staff Account Management
`barangay_admin` and `bhw` previously had *identical* permissions everywhere in the app - same routes, same access - which undercuts the RBAC objective and doesn't match how a real barangay works (a BHW shouldn't be able to create other staff logins, including admin ones). This closes that gap and gives the two roles an actual functional difference.
- **`App\Http\Controllers\StaffController`** (routes under `/staff`, gated to `super_admin,barangay_admin` - explicitly excludes `bhw`) - list, create, and deactivate staff within your own barangay. A `barangay_admin` can only create `bhw` accounts; only `super_admin` can create a peer `barangay_admin`, for any barangay. Self-deactivation is blocked.
- **Deactivation now actually works.** Found while building this: `users.is_active` existed in the schema but nothing ever checked it - a "deactivated" account could still log in. Fixed in two places: `FortifyServiceProvider::authenticateUsing()` rejects login for an inactive account with a clear message, and `App\Http\Middleware\EnsureAccountIsActive` force-logs-out an already-open session the moment the account is deactivated, not just on the next login attempt.
- Also fixed while wiring this up: `is_active` defaults to `true` at the DB level, but that default only applies on INSERT - an in-memory object (like the one Fortify hands straight to `Auth::login()` during self-registration, or what `actingAs()` uses in tests) never saw it, which would have logged out every freshly-registered user immediately. Fixed by setting the default on the `User` model itself (`protected $attributes`), not just the migration - `ResidentFactory` already did this for the same reason; `UserFactory` just hadn't needed to until `is_active` was actually checked anywhere.

### Duplicate Review and Escalation
- BHWs and barangay admins review duplicate and transfer alerts for their own barangay. Every alert action checks the alert belongs to the acting user's barangay, so an alert from another barangay cannot be resolved by passing its ID.
- A BHW who cannot settle a case can **escalate** it with an optional note. Every active barangay admin in that barangay is notified, the alert moves to an *Escalated* tab, and from then on only a barangay admin can resolve or dismiss it. Escalation is audit-logged (`duplicate_alerts.escalated_at`, `escalated_by`, `escalation_note`).
- The super admin can view alerts city-wide but cannot act on them.

### Super Admin: Read-only Oversight
The super admin represents the city or municipality, so the role is deliberately limited to oversight rather than day-to-day record keeping.
- Residents and households are **read-only** for the super admin (no create, edit, deactivate, wellbeing assessments, or alert actions). Permanent resident deletion remains a super admin action, as before.
- The Residents and Households lists gain a **Barangay filter and column** for the super admin, and the dashboard gains a **By Barangay** summary (active residents, households, pending alerts).
- Write routes live in a `role:barangay_admin,bhw` group in `routes/web.php`, registered before the read routes so `residents/create` is not captured by `residents/{resident}`.

### Barangay Staff Conveniences
- **Household filters** for purok, current wellbeing level (including "not yet assessed"), and 4Ps status.
- **Household picker** in the resident form shows household number, family name, and address.
- **Quick resident search** in the top bar for BHWs and admins, which opens the Residents list with the query (name, Resident ID, email, or PhilSys number).
- **Sidebar badges** for pending duplicate alerts and pending resident accounts, and a role-aware quick action ("Register resident" for staff, "New program" for agencies). Counts are barangay-scoped and computed lazily in `HandleInertiaRequests`.
- Email is required when a BHW creates a resident portal account.
- BHWs have no access to announcements.

### Public Site
- **Landing page** (`/`) with a hero, live aggregate numbers for Barangay 22 (`App\Http\Controllers\LandingController`, totals only, cached for five minutes, never any resident data), a *For partner agencies* section (before and after, how an agency uses it, why the data can be trusted), a resident *How it works* guide, and a shared footer.
- **Privacy Notice** (`/privacy`), **Terms of Use** (`/terms`), and **FAQ** (`/faq`). The Privacy Notice and Terms are drafts and carry a visible banner: they should be reviewed by the barangay and its data protection officer before public use.
- The footer intentionally uses no government seals or "Republic of the Philippines" wording, because resiTrack is a capstone system and not an official government site.
- Screenshots on the landing page live in `public/images/landing/` and use seeded sample data only. Retake them if the dashboards change.

### Sign In and Sign Up
- Centered card with a Log in / Sign up switch, field icons, and Terms and Privacy links.
- The sign-up page shows a **live password checklist** built from the server's own password rules (`Password::defaults()`), so it always matches what the server enforces: 8 characters locally, and 12 with mixed case, a number, and a symbol in production.
- Sign-up reminds residents that verification is finished in person at the Barangay Hall.

### Design System and Responsive Behavior
- Brand tokens (navy, blue, cyan, green), status colors (success, warning, info), and Inter live in `resources/css/app.css`. **Light is the default theme**; dark mode is one toggle away in the sidebar (browsers that had the old "system" default are reset to light once). Restrained gradients are defined as utilities (`bg-sidebar-gradient`, `bg-brand-gradient`, `bg-page-gradient`, `bg-footer-gradient`).
- Below **1024px** the sidebar becomes a slide-out drawer that closes after each link and never remembers a collapsed state. On larger screens the collapsed or expanded choice persists across pages through the `sidebar_state` cookie.
- The breadcrumb shows only the current page name on phones. The landing header collapses to a menu button below 768px.
- Server-rendered pages avoid hydration mismatches by never reading `window`, the clock, or media queries during render; browser-only values use `useSyncExternalStore` with a server snapshot.

### Multi-Barangay Access Control
- `super_admin` users can view system-wide data across all barangays. For residents and households the access is read-only.
- `barangay_admin` and `bhw` users are scoped server-side to their assigned `barangay_id` for normal resident, household, staff, request, and agency-account operations.
- Partner agency accounts are scoped by both `agency_id` and `barangay_id` where the program is barangay-targeted.
- Duplicate and transfer detection intentionally remains system-wide so potential cross-barangay matches are not missed.
- Frontend filtering is not the security boundary; controllers, request validation, role middleware, and authorization checks enforce access.

## Testing

```bash
php artisan test
```

Feature tests cover role access control, automatic sector classification, compound-vulnerability detection, in-barangay duplicate flagging, cross-barangay transfer detection, duplicate escalation, super admin read-only access, resident dashboards, self-service edits, account deletion, account reactivation, barangay isolation, Partner Agency management, program targeting, the public landing page (aggregate totals only), and authorization boundaries.

## Known Issues

- `composer types:check` (PHPStan level 7) reports existing issues in older code, mostly Eloquent property typing. CI's test job runs it, so expect it to flag until those are cleaned up.
- `npm run lint:check` and `composer lint:check` report style issues in older files. CI's lint job runs the auto-fixers rather than the checkers, so it does not fail on them.
- The sign-in and sign-up copy is English only, so the language switcher is not shown on those pages yet.
- The Privacy Notice and Terms of Use are drafts awaiting review.

## Roadmap

- **Partner agency onboarding:** confirm with city hall or the barangay chairman who may add partner agencies, then decide on a request flow.
- **Agency applications tab** and a notification when someone applies to a program.
- **Resident username login** for residents without an email, with staff-assisted recovery.
- **BHW offline sync** (table `offline_sync_logs` scaffolded).
- **Production deployment** to Supabase/PostgreSQL.
- Native email delivery for account and request notifications.
- Native-speaker review of Filipino and Bisaya translations, and translated sign-in and sign-up pages.
- A logo variant for dark backgrounds, and vector (SVG) artwork.

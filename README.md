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

### Sample database

`database/sample/resitrack-sample.sqlite` is a ready-made database with the test accounts below, 54 fake residents, 12 households, and 4 programs, so you can explore the app without seeding. It contains no real people and no login sessions.

```bash
copy database\sample\resitrack-sample.sqlite database\database.sqlite   # Windows PowerShell
# cp database/sample/resitrack-sample.sqlite database/database.sqlite   # macOS/Linux
php artisan migrate       # applies any migrations newer than the snapshot
php artisan psgc:import   # loads the address lists (kept out of the snapshot to keep it small)
```

Never commit `database/database.sqlite` itself: it is your working database and is ignored on purpose. Only the sample snapshot is tracked. If you add a migration or change the seeders, regenerate the snapshot against a scratch file so your own database is untouched:

```powershell
$env:DB_DATABASE = "$PWD\database\sample\resitrack-sample.sqlite"
php artisan migrate:fresh --seed --force
php artisan db:seed --class=SampleResidentSeeder --force
Remove-Item Env:\DB_DATABASE
```

### Demo and load-test data

Realistic data for development, so the landing page, dashboards, map and every list show a full system instead of a handful of rows. The command refuses to run in production.

**Add the load-test data to the database you are running now** (the usual way): it copies your database file to `database/backup-<time>.sqlite` first, only adds rows, leaves everything already there untouched, and refuses to run twice. Stop the app before, start it after.

```powershell
php artisan data:seed loadtest --here                  # about 1,000 residents added, 7 seconds
```

To undo it, stop the app and copy the backup file back over `database/database.sqlite`.

The same data can also be built into its **own** SQLite file (`database/demo.sqlite`, `database/loadtest.sqlite`, both git-ignored) that never touches the working database, the sample snapshot or the live site:

```powershell
php artisan data:seed demo                     # about 30 named people and one story, 3 seconds
php artisan data:seed loadtest                 # about 1,000 residents in database/loadtest.sqlite, 7 seconds
php artisan data:seed loadtest --residents=3000

# Run the app against one of them (PHP's own server keeps the override; `php artisan serve` drops it):
$env:DB_DATABASE = "$PWD\database\demo.sqlite"
php -S 127.0.0.1:8000 "$PWD\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"   # run from the public folder
Remove-Item Env:DB_DATABASE                    # when done
```

Both are reproducible: one fixed random seed, so a rebuild gives the same people and records. Every date is in the past, over the last six months.

**Demo set** (`DemoStorySeeder`): hand-made names, nothing random on screen. Use it for screenshots and the defense demo. Staff and agency passwords are the email; residents use `password`.

| Login | Who | What to show |
| --- | --- | --- |
| `lola.nena@demo.test` | Lola Nena Ramirez, 68, Barangay 22 | Senior and solo parent, approved for the Social Pension, a payout date in 3 days, a Certificate of Indigency ready for pickup, a streetlight report in progress |
| `mang.ernesto@demo.test` | Ernesto Cabahug, 71, Barangay 22 | Qualifies for programs and has applied to none, so *Programs for you* is full |
| `teresita@demo.test`, `jocelyn@demo.test` | A solo parent, a pregnant mother | Pending applications, certificate and report requests for staff to work |
| `rosa@demo.test` | Signed up online, not yet verified | Shows up under Pending Resident Accounts for a BHW |
| `secretary@`, `bhw@`, `bhw2@resitrack.test` | Barangay 22 admin and two health workers | Activity Log with fresh activity, a duplicate pair, the request queues |
| `secretary.b21@`, `bhw.b21@`, `secretary.b23@`, `bhw.b23@`, `secretary.b24@`, `bhw.b24@resitrack.test` | The other three barangays | Barangay separation |
| `agency@`, `peso@`, `cedo@resitrack.test` | DSWD, PESO and CEDO officers | Applications to review, claim schedules, ID checks |
| `superadmin@resitrack.test` | Super admin | City-wide dashboard and map |

It also plants two duplicate cases: the same woman registered twice in Barangay 22, and a resident who moved from Barangay 23 to 22 (a transfer).

**Load-test set** (`LoadTestSeeder`): about 1,000 residents in about 280 households across the four barangays (Barangay 22 the largest), with realistic ages and sectors (the real sector rules classify everyone: about 12% seniors, 3% persons with disability, 5% solo parents, 5% out-of-school youth, some pregnant mothers), real PSGC addresses (region, province, city, barangay, street and zip) and birthplaces, 26 planted duplicate and transfer alerts in mixed states, about 200 resident logins and 15 waiting for verification, 25 programs (some full, expired or inactive) with about 800 applications and 350 beneficiaries, claim dates, 28 announcements with about 1,700 notifications, 200 certificate requests, 150 reports, household assessments, account deletion, reactivation and password recovery requests, and about 7,500 activity-log entries over the last six months. Every account ends in `@loadtest.test`:

| Login | Who |
| --- | --- |
| `admin.b21@` to `admin.b24@loadtest.test` | Barangay admin of each barangay |
| `bhw1.b22@` to `bhw4.b22@loadtest.test` (and `.b21`, `.b23`, `.b24`) | Four health workers per barangay |
| `agency.dswd.city@`, `agency.peso.city@`, `agency.cedo.city@loadtest.test` | City-wide agency accounts |
| `agency.dswd.b22@`, `agency.dswd.b23@`, `agency.peso.b21@`, `agency.peso.b23@`, `agency.cedo.b22@`, `agency.cedo.b24@loadtest.test` | Agency accounts tied to one barangay |
| `resident1@` to `resident200@loadtest.test` (password `password`) | Residents with a linked record |
| `pending1@` to `pending15@loadtest.test` (password `password`) | Signed up online, not yet verified |
| `superadmin@resitrack.test` | Super admin |

On a laptop every page for every role loaded in under 250 ms with this data, and a barangay admin saw exactly their barangay's numbers. Passwords in these files use a cheap hash (4 rounds) so seeding is fast; never copy the files anywhere real.

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
- **Printable reports** (`ReportController::print`, `PrintableReportService`, `reports/print`): *Create a report* on the Reports page opens the browser's print window right over the Reports page (the report is drawn in a hidden frame, so nothing navigates); choosing "Save as PDF" there keeps a file. The same report is also reachable as its own page at `/reports/print`. Three kinds: a **barangay summary** (population, sectors, ages, sex, purok, and activity for a chosen period beside the period just before it), a **resident list** (filter by sector, sex, age, purok, registration dates, active or all; with names or counts only) and **program reach** (for each program: who could qualify, who applied, were approved, are active beneficiaries, the share reached and the gap). The page has a header that repeats on every printed page, no browser URL or date header, signature lines ("Prepared by" is whoever prints, "Noted by" is typed once and remembered in that browser) and a confidentiality line when names are listed. Staff report on their own barangay; the super admin on the whole city or one barangay. Every print is recorded in the Activity Log, including whether names were printed. Name lists show only name, sex, age, sector, purok and household, and are capped at 5,000 names. The older PDF and CSV downloads remain as secondary buttons.
- **Reports & Sector Dashboard** for barangay staff - sector summary (5 vulnerability sectors + 4Ps beneficiary households) and a 30-day audit summary (records updated, new registrations, duplicate alerts resolved, program applications).
- **Exports for LGU compliance** - the *Sector Dashboard* report as a printable **PDF** (`barryvdh/laravel-dompdf`, pure-PHP) and a *Resident Population* roster as **CSV** (streamed).
- **Real audit trail** (`App\Services\AuditLogger`) - meaningful mutations across Modules 1 & 2 (resident/household create & update, duplicate resolve/dismiss, program apply/approve/reject) and report generation are recorded in `audit_logs`, which also powers the "previously generated reports" history table.
- All stats are barangay-scoped (super admin sees city-wide), reusing `DashboardStatsService` to avoid duplicating aggregation logic.
- **Staff dashboard** opens with a *Needs attention* strip (pending duplicate alerts, plus resident accounts to verify for BHWs, or account deletion and reactivation requests for admins), each linking to its page and scoped to the user's barangay. Below it, an **Age and Sex** population pyramid (male and female per age group, with children, working-age and senior totals) and **Vulnerable Sectors** ranked largest first with their share of residents.
- **Compound vulnerability** is shown on the dashboard, not just computed: how many residents belong to two or more sectors and the most common pairings (`DashboardStatsService::compoundVulnerability`). Sector counts overlap by design, which is why they add up to more than the number of residents.

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
- Agency accounts get their own sidebar: **Applications to Review** (one queue across all their programs, filterable by status, with a pending-count badge), **Beneficiaries** (everyone accepted into any of their programs, filterable by program), **Announcements** (broadcasts, read-only) and **Agency Profile** (the agency edits its own contact details; the agency is taken from the signed-in account, never from the URL).
- Approving or rejecting an application checks the reviewer's barangay as well as their agency, so a barangay-scoped agency account cannot review another barangay's applications under the same agency.

### Resident Self-Service Dashboard
Residents get a distinct dashboard from barangay staff - a feed, not the aggregate stats view (`App\Http\Controllers\DashboardController` branches by role; the previous behavior had every role sharing the staff stats page, including a "Pending Duplicate Alerts" card residents couldn't actually open).
- **Programs for you** (`DashboardController::matchedPrograms`) comes first: up to three open programs the resident qualifies for and has not applied to yet, with the agency, slots left, closing date and target sectors, and a *View and apply* button, plus a link to the rest. It uses the same barangay and sector rule as the Apply button and leaves out programs that are full, closed, expired, or aimed at another barangay. The welcome band has a *Show my ID* button, and a *Coming up for you* card sits above everything when the resident has a claim date coming (see Resident Services). A *Barangay services* row links to Certificates, Report a Concern, My Household and Hotlines. On phones the order is claim dates, programs, services, profile and qualifications, then news.
- **Feed** - the resident's own notifications (program matches, announcements, application outcomes) as a chronological card feed: the text gets the full card width, with the date, read-aloud and *Mark read* on a row underneath and a *New* badge on unread items. Application statuses are translated with the rest of the page.
- **Profile completeness nudge** (`App\Services\ResidentDashboardService`) - a percent-complete bar over contact/socio-economic fields, linking to a new self-service **My Profile** page. This is mechanical, not cosmetic: those fields feed `SectorClassificationService`, so filling in e.g. employment/education status can change which sectors - and therefore which programs - a resident qualifies for.
- **My Profile** (`App\Http\Controllers\MyProfileController`, route `my-profile`) - residents edit a deliberately small field subset (contact info, address, civil status, occupation, employment/education status, income). Identity fields and certified vulnerability flags (PWD, solo parent, pregnant) stay staff-only, since those require document verification via `ResidentController`. Saving re-runs sector classification.
- **Sectors & why** - `SectorClassificationService::explain()` turns the resident's current `sector_criteria` matches into plain-English reasons (e.g. "Age 73 (must be 60 or older)"), so classification isn't an invisible backend rule.
- **Bottom tab bar on phones and tablets** (`components/resident-tab-bar.tsx`): Dashboard, Programs, Applications, Notifications (with the unread count) and Profile, below 1024px and for residents only; staff keep the sidebar. The highlight slides between tabs. Inertia remounts the layout on each visit here, so the last position is kept in a module variable and the new pill starts there. My ID and My Household count as the Profile tab. It leaves room for the iPhone home bar (`env(safe-area-inset-bottom)`) and resident pages get matching bottom padding (`app-sidebar-layout.tsx`) so the last button on a page is never hidden behind it.

### Resident Services
Things a resident would otherwise walk to the Barangay Hall for. Every resident page is translated (English, Filipino, Bisaya); the staff desks are English. Each staff endpoint is scoped to the user's own barangay, and `tests/Feature/ResidentServicesTest.php` checks that another barangay cannot see or act on them.
- **Program claim tracking**: the agency that owns a program records that a beneficiary actually claimed (from the program page, or with one tap after scanning their ID card). It shows "12 of 40 claimed" for each claim day, lets the agency list who has not come, can be undone if recorded by mistake, notifies the resident, and appears in the Activity Log and the Program Reach report. Only the owning agency records claims.
- **Program size estimate**: while an agency sets a program's sectors and barangay, the form shows "About 181 active residents would qualify (16% of 1,127)" before anything is published.
- **Pregnancy sector that ends by itself**: reporting a pregnancy needs the expected month of delivery, and the Pregnant tag is removed automatically 30 days after that month ends, with no staff step (`PregnancyStatus`, the `sectors:expire-pregnancies` command, and a once-a-day check on the first request of each day for hosts without a scheduler). Staff record it on the resident form; a resident can report or end their own pregnancy on My Profile (marked "reported by the resident"). Only female residents aged 10 to 55, with a month within the next 10 months (or up to a month ago), are accepted.
- **Resident ID format**: `RES0182600045`, shown as `RES 018 26 00045`. `RES`, then the barangay's three-digit code (the last three digits of its PSGC code, so Barangay 22 is `018`), then the two-digit registration year, then a five-digit number that counts the barangay's residents in order and never resets. The shape follows the DOH and NCDA PWD ID (geographic code plus a running number), and it holds nothing personal, unlike the PhilSys number's opposite approach of a random secret. The ID stays with the person when they transfer barangays. It is typed with or without spaces and hyphens, and in any letter case, at login, account recovery and search. A migration converted older `RES-2026-000123` IDs; printed cards from before it carry the old ID and need reprinting.
- **Digital resident ID** (`ResidentIdController`, `/my-id`): a card with the resident's name, Resident ID, barangay, birth date, sex, qualifying sectors and a QR code. It is labelled a resiTrack card, not a government ID. The QR code holds `/verify/{resident id}?s={signature}`, where the signature is an HMAC of the Resident ID keyed on `APP_KEY` (`Resident::idSignature`), so a typed or guessed number does not verify; rotating `APP_KEY` invalidates printed codes. Scanning it needs a staff or partner agency login and shows a short result (genuine and active, genuine but inactive, or not genuine). Staff of the same barangay get a link to the full record; an agency sees which of its own programs the person is a beneficiary of, for checking people in on payout day. Every check is audit-logged. The QR is drawn on the server with `bacon/bacon-qr-code`, already installed for two-factor setup.
- **Claim schedules** (`ProgramScheduleController`, table `program_schedules`): the agency that owns a program posts when and where beneficiaries claim (title, date and time, place, what to bring, notes) from the program page. Active beneficiaries with an account are notified at once, and upcoming dates appear on their dashboard (*Coming up for you*, marked Today or Tomorrow) and on the program page. Removing a future date notifies them it was cancelled. Times are the venue's wall-clock time and are sent to the browser without a time zone, so they print exactly as entered. There is no day-before reminder: that needs a scheduled job, and the free Render plan has no cron.
- **Certificate requests** (`DocumentRequestController`, table `document_requests`): residents request a Certificate of Residency, Certificate of Indigency or Barangay Clearance and say what it is for (one open request per type; pending ones can be cancelled). Barangay admins and BHWs work the queue at *Certificate Requests*: mark ready for pickup (the resident is notified), released, or declined with a reason. Each gets a reference like `DOC-2026-000012`. The paper is still printed, signed and handed over at the hall; fees, if any, are paid there.
- **Report a concern** (`ConcernController`, table `concerns`): streetlight, garbage, drainage, road, peace and order, noise, a correction to the resident's own record, or other, with an optional location. At most five a day per resident. Staff answer at *Resident Reports*, setting the status (new, in progress, resolved, closed) and a reply; resolving or closing needs a reply, and every change notifies the resident. My Household's *Request a correction* opens this form with the correction category picked.
- **My Household** (`MyHouseholdController`, `/my-household`): the household number, purok, address, 4Ps status and the active members, with names, ages and sex only. Members' sectors and income stay private.
- **Hotlines** (`HotlineController`, table `hotlines`, open to every role): tap-to-call numbers. Only the national 911 and Philippine Red Cross 143 are built in; each barangay admin adds their barangay's own numbers and the super admin adds city-wide ones. No local numbers are seeded on purpose: a wrong number in an emergency list is worse than none, so enter real ones (and call each one first) before a demo.
- Staff see the new queues in a **Services** sidebar group with badges, and as *Needs attention* tiles on their dashboard. The super admin has no service desk (read-only oversight) and only sees Hotlines.

### Accessibility for Low Digital Literacy, Language, and Seniors
Built after realizing residents who can't use a phone at all already have a safety net (BHWs can register and endorse them without a screen) - these three features are for residents who *can* use a phone but face literacy, language, or vision/motor barriers along the way.
- **Comfortable scale** (`resources/js/hooks/use-comfortable-scale.ts`) - resident sessions get a 110% root font-size bump (`html.comfortable-scale` in `app.css`), automatically, with no toggle needed since the role is already known at render time. Because Tailwind's spacing/sizing scale is rem-based, this proportionally enlarges text, buttons, icons, and tap targets together - the same effect as increasing browser zoom, just scoped to residents. It is removed again when the resident leaves the app shell, so the log-in page after logging out is normal size.
- **English / Filipino / Bisaya language toggle** - a shared header switcher is available to residents, BHWs, barangay admins, super admins, and partner agency users. It translates fixed UI chrome and staff navigation, and persists the preference in the `app_lang` cookie. Program titles, resident names, sector names, and other user-generated content remain unchanged.
- **Read-aloud** (`resources/js/components/read-aloud-button.tsx`) - a "listen" button on feed items, announcements, and program descriptions using the browser's built-in Web Speech API (free, no backend). Solves illiteracy, not just language - translation alone doesn't help someone who can't read at all. Voice quality/availability for Filipino/Cebuano depends on the resident's device; Android phones generally fare better than desktop browsers.

### Staff Account Management
`barangay_admin` and `bhw` previously had *identical* permissions everywhere in the app - same routes, same access - which undercuts the RBAC objective and doesn't match how a real barangay works (a BHW shouldn't be able to create other staff logins, including admin ones). This closes that gap and gives the two roles an actual functional difference.
- **`App\Http\Controllers\StaffController`** (routes under `/staff`, gated to `super_admin,barangay_admin` - explicitly excludes `bhw`) - list, create, and deactivate staff within your own barangay. A `barangay_admin` can only create `bhw` accounts; only `super_admin` can create a peer `barangay_admin`, for any barangay. Self-deactivation is blocked.
- **Deactivation now actually works.** Found while building this: `users.is_active` existed in the schema but nothing ever checked it - a "deactivated" account could still log in. Fixed in two places: `FortifyServiceProvider::authenticateUsing()` rejects login for an inactive account with a clear message, and `App\Http\Middleware\EnsureAccountIsActive` force-logs-out an already-open session the moment the account is deactivated, not just on the next login attempt.
- Also fixed while wiring this up: `is_active` defaults to `true` at the DB level, but that default only applies on INSERT - an in-memory object (like the one Fortify hands straight to `Auth::login()` during self-registration, or what `actingAs()` uses in tests) never saw it, which would have logged out every freshly-registered user immediately. Fixed by setting the default on the `User` model itself (`protected $attributes`), not just the migration - `ResidentFactory` already did this for the same reason; `UserFactory` just hadn't needed to until `is_active` was actually checked anywhere.

### Activity Log
- **`/activity-log`** (`ActivityLogController`, for barangay admins and the super admin): the audit trail as readable sentences ("Maria (BHW) registered resident Juan Dela Cruz"), grouped by day, newest first, in Philippine time. `ActivityLogPresenter` turns each `audit_logs` row into a sentence and a category; an unknown action still shows as a plain fallback, so nothing silently disappears.
- A barangay admin sees everything done by people of their own barangay (staff, agency accounts assigned to it, and residents' self-service actions); the super admin sees every barangay and can narrow to one. Filters: person (or residents as a group), kind of work (residents and households, programs, certificates and reports, accounts, report exports, sign-ins) and dates.
- **Staff at a glance**: each staff member's actions in the last 30 days (sign-ins not counted) and their last sign-in, with a shortcut to their own activity.
- Every entry is written by the server; there is no screen to edit or delete one.
- Actions that were not recorded before and now are: sign-ins (a `Login` listener in `AppServiceProvider`), permanent resident deletion (logged before the row is gone, with the name), deactivating a resident from the record's Delete button, a BHW approving or rejecting a password recovery and setting the new password, programs being published, edited or deleted, and announcements being deleted.

### Duplicate Review and Escalation
- BHWs and barangay admins review duplicate and transfer alerts for their own barangay. Every alert action checks the alert belongs to the acting user's barangay, so an alert from another barangay cannot be resolved by passing its ID.
- A BHW who cannot settle a case can **escalate** it with an optional note. Every active barangay admin in that barangay is notified, the alert moves to an *Escalated* tab, and from then on only a barangay admin can resolve or dismiss it. Escalation is audit-logged (`duplicate_alerts.escalated_at`, `escalated_by`, `escalation_note`).
- The super admin can view alerts city-wide but cannot act on them.
- Alerts that share a person are grouped ("4 records may be the same person"), and fields that differ between two records (name, birth date, PhilSys number, barangay) are highlighted. Grouping covers the alerts on the current page.

### Super Admin: Read-only Oversight
The super admin represents the city or municipality, so the role is deliberately limited to oversight rather than day-to-day record keeping.
- Residents and households are **read-only** for the super admin (no create, edit, deactivate, wellbeing assessments, or alert actions). Permanent resident deletion remains a super admin action, as before.
- The Residents and Households lists gain a **Barangay filter and column** for the super admin, and the dashboard gains a **By Barangay** summary (active residents, households, pending alerts), plus a city-wide **heatmap** coloring each barangay by resident count or a chosen vulnerability sector. Partner agency accounts see the same city-wide summary and heatmap (their own stat cards stay scoped to their assigned barangay), to help decide where to target future programs.
  - The heatmap's barangay boundary shapes (`public/data/cdo-barangays.geojson`) are from the Philippine Statistics Authority's official PSGC barangay boundary layer, queried via the [GeoRisk Philippines](https://georisk.gov.ph) ArcGIS service and filtered to Cagayan de Oro's 80 barangays. Only barangays that have actually adopted resiTrack are colored by density; the rest render as "not yet using resiTrack."
  - The map sits beside its controls and the barangay table. It uses a muted Esri gray basemap (light and dark, no API key), frames the active barangays with a *Show whole city* toggle, prints each barangay's count on its shape, and colors on a square-root scale so one large barangay does not flatten the rest. Legend bins are rounded and grow with the data. Hovering a table row outlines its shape and the other way round; staff can click a shape to open that barangay's residents.
  - Leaflet is loaded only in the browser (it reads `window` on import), so the dashboard still renders on the server.
- Write routes live in a `role:barangay_admin,bhw` group in `routes/web.php`, registered before the read routes so `residents/create` is not captured by `residents/{resident}`.

### Barangay Staff Conveniences
- **Household filters** for purok, current wellbeing level (including "not yet assessed"), and 4Ps status.
- **Household picker** in the resident form shows household number, family name, and address.
- **Quick resident search** in the top bar for BHWs and admins, which opens the Residents list with the query (name, Resident ID, email, or PhilSys number).
- **Sidebar badges** for pending duplicate alerts and pending resident accounts, and a role-aware quick action ("Register resident" for staff, "New program" for agencies). Counts are barangay-scoped and computed lazily in `HandleInertiaRequests`.
- **Cascading address pickers** (Region, Province, City or Municipality, Barangay, then street and zip) for a resident's home address, place of birth and previous address, and for a household's address. The lists come from the PSA's Philippine Standard Geographic Code (PSGC), stored in the `psgc_locations` table (about 43,800 places) and served by `PsgcController`. Picked places are saved as codes next to the readable line, which the server builds itself and checks (a barangay must belong to the chosen city). New records start on the staff member's own barangay.
  - The table is filled by `php artisan psgc:import` from `database/data/psgc.json.gz`. Render runs it on every boot (a no-op once loaded). **After pulling this change, run `php artisan migrate` and `php artisan psgc:import` on your own database.** Migrations deliberately do not load the data, so the test suite stays fast.
  - Zip codes are typed, not looked up: PSGC has no zip data.
- **Grouped sidebar** for staff: Records (Residents, Households, Duplicate Alerts, Reports), Outreach (Programs, Announcements, Partner Agencies), Services (Certificate Requests, Resident Reports, Hotlines) and Admin (Staff, Activity Log, account requests).
- **Residents table**: whole rows open the record, and only *Flagged* or *Inactive* is shown (next to the name), since "Active" on every row said nothing. The top-bar search is hidden on this page, which has its own.
- Email is required when a BHW creates a resident portal account.
- BHWs have no access to announcements.

### Public Site
- **Landing page** (`/`) with a hero, live aggregate numbers for Barangay 22 (`App\Http\Controllers\LandingController`, totals only, cached for five minutes, never any resident data), a *For partner agencies* section (before and after, how an agency uses it, why the data can be trusted), a resident *How it works* guide, and a shared footer.
- **Privacy Notice** (`/privacy`), **Terms of Use** (`/terms`), and **FAQ** (`/faq`). The Privacy Notice and Terms are drafts and carry a visible banner: they should be reviewed by the barangay and its data protection officer before public use.
- The footer intentionally uses no government seals or "Republic of the Philippines" wording, because resiTrack is a capstone system and not an official government site.
- Screenshots on the landing page live in `public/images/landing/` and use seeded sample data only. Retake them if the dashboards change.
- **Intro splash** (`components/intro-splash.tsx`): on the first visit of a tab session the wordmark fills in left to right, the logo glides into the header, and the hero heading blurs in word by word. Scrolling is locked until it finishes, and the stats count-up and scroll reveals wait for it (`lib/intro.ts`). Add `?intro=1` to replay it. Whether it plays is decided by a small script in `app.blade.php` before first paint; it is skipped for reduced motion.

### Help and Getting Started
- **Getting started checklist** on the dashboard for staff and partner agencies (`App\Services\OnboardingService`, `components/getting-started.tsx`). Each role gets its own first steps (a BHW: register a household, register a resident, place a resident in a household, verify a self-registered resident; an admin, the super admin and agencies get theirs). Steps tick themselves off from real data, scoped to the user's barangay or agency. The card can be hidden (`users.onboarding_dismissed_at`, so it stays hidden on every device) and brought back from Help. Residents do not get it: their dashboard already walks them through verification and profile completion.
- **Help page** (`/help`, a *Help* link at the bottom of every sidebar): task-by-task guides for the signed-in role, with links straight to the right page, plus a *Good to know* list. The resident version is translated (English, Filipino, Bisaya); staff guides are English, like the rest of the staff screens. Both point to the public FAQ.

### Search and Link Previews
- Every page carries a description, and public pages (landing, programs, FAQ, privacy, terms) have their own title and description; pages behind a login are marked `noindex`. Sharing a link on Messenger or Facebook shows a branded preview card (`public/images/og-image.png`, 1200 by 630).
- These tags are in `resources/views/app.blade.php`, not in React, because production does not server-render pages and link crawlers only see the Blade template.
- `/robots.txt` and `/sitemap.xml` are generated (`SeoController`) so their URLs follow `APP_URL`.

### Error Pages
- One branded screen (`components/error-screen.tsx`, page `pages/error.tsx`) for 401, 403, 404, 500 and 503, and a **No internet connection** screen (`components/network-guard.tsx`) that covers the app while the browser is offline and goes away by itself when the connection returns. Each has a big code, a plain message, two buttons, a flat illustration (`components/error-art.tsx`, drawn in the brand colors) and a help box. The offline screen stores nothing: resiTrack does not work offline.
- `bootstrap/app.php` renders them for every visit. In debug mode 500 and 503 keep Laravel's detailed developer page; 401, 403 and 404 look the same everywhere. A 403 also shows the reason we gave ("This resident belongs to another barangay."); a 404 never shows Laravel's own message, which can name internal models. JSON requests stay JSON.
- Because an Inertia request now gets this page back instead of raw HTML, a forbidden click no longer opens the plain grey error box over the app.
- To use finished artwork instead of the drawn illustrations, point a kind at an `<img>` in `components/error-screen.tsx`.

### Sign In and Sign Up
- Centered card with a Log in / Sign up switch (the highlight slides between the two), field icons, and Terms and Privacy links. The two columns have fixed proportions and every page reserves the scrollbar's width, so the divider does not jump when switching to the taller sign-up form.
- The sign-up page shows a **live password checklist** built from the server's own password rules (`Password::defaults()`), so it always matches what the server enforces: 8 characters locally, and 12 with mixed case, a number, and a symbol in production.
- Sign-up reminds residents that verification is finished in person at the Barangay Hall.

### Design System and Responsive Behavior
- Brand tokens (navy, blue, cyan, green), status colors (success, warning, info), and Inter live in `resources/css/app.css`. **Light is the default theme**; dark mode is a switch in the account menu (click your name at the bottom of the sidebar), which stays open so you see the change (browsers that had the old "system" default are reset to light once). Restrained gradients are defined as utilities (`bg-sidebar-gradient`, `bg-brand-gradient`, `bg-page-gradient`, `bg-footer-gradient`).
- Data tables (`components/ui/table.tsx`) have faint alternating row stripes; the hovered row goes a solid muted tone so it still stands out on striped rows.
- Below **1024px** the sidebar becomes a slide-out drawer that closes after each link and never remembers a collapsed state. Residents also get the bottom tab bar there. On larger screens the collapsed or expanded choice persists across pages through the `sidebar_state` cookie.
- The breadcrumb shows only the current page name on phones. The landing header collapses to a menu button below 768px.
- Server-rendered pages avoid hydration mismatches by never reading `window`, the clock, or media queries during render; browser-only values use `useSyncExternalStore` with a server snapshot. Dates (`hooks/use-relative-date.ts`) print in one fixed form (English, UTC) on the server and during hydration, then switch to the viewer's language, time zone and relative wording, because the server cannot know any of those and Bisaya month names differ between Node and the browser.

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

Feature tests cover role access control, automatic sector classification, compound-vulnerability detection, in-barangay duplicate flagging, cross-barangay transfer detection, duplicate escalation, super admin read-only access, resident dashboards, self-service edits, account deletion, account reactivation, barangay isolation, Partner Agency management, program targeting, the public landing page (aggregate totals only), the Needs attention counts and dashboard charts, address picking (codes stored, readable line built server-side, mismatched places rejected), agency applications and beneficiaries, and authorization boundaries.

## Known Issues

- `composer types:check` (PHPStan level 7) reports existing issues in older code, mostly Eloquent property typing. CI's test job runs it, so expect it to flag until those are cleaned up.
- `npm run lint:check` and `composer lint:check` report style issues in older files. CI's lint job runs the auto-fixers rather than the checkers, so it does not fail on them.
- The sign-in and sign-up copy is English only, so the language switcher is not shown on those pages yet.
- The Privacy Notice and Terms of Use are drafts awaiting review.
- Claim schedules notify beneficiaries when a date is posted or cancelled, but there is no reminder the day before: that needs a scheduled job, and Render's free plan has no cron.
- The Hotlines page only has the national 911 and Red Cross 143 until each barangay admin enters their local numbers (none are seeded on purpose).
- Activity Log entries from before 2026-09-25 have no sign-ins, and some older entries have no name (for example "Registered resident"), because the code at the time did not record them.

## Deployment

The database is already hosted on Supabase (Postgres). The app itself deploys separately,
as a Docker container, to [Render](https://render.com)'s free tier, in the Singapore
region (same region as the Supabase project, to keep the app-to-database hop fast).

One-time setup:

1. On Render, choose **New > Blueprint**, point it at this repo. It reads `render.yaml`
   and creates the web service automatically.
2. In the service's Environment tab, fill in the variables marked `sync: false` in
   `render.yaml`: `APP_KEY` (`php artisan key:generate --show` run locally), `APP_URL`
   (the `https://...onrender.com` URL Render assigns), the Supabase `DB_HOST`/
   `DB_USERNAME`/`DB_PASSWORD` (same values as `.env.supabase` locally), and the Google
   OAuth credentials if "Sign in with Google" is enabled.
3. Redeploy once those are saved (Render doesn't restart automatically after an env var
   change made outside the initial blueprint run).

Every deploy (`git push` to the connected branch) rebuilds the Docker image, runs
`php artisan migrate --force` and `php artisan psgc:import --if-empty` on boot (the import only does work the first time, and a failure there does not stop the site from starting), then serves the app. On the free plan the
container spins down after ~15 minutes idle and takes 30-60 seconds to wake on the next
request, open the URL once before a demo rather than relying on the first click being
instant.

Supabase's free tier behaves differently: a project with no activity for 7 days is
**paused**, and does not wake on the next request. It has to be restored from the
Supabase dashboard. If the site has gone unused for a while, check the project before a
defense or demo.

Keep `APP_KEY` fixed once the site is live. Besides sessions, it signs the QR code on every resident's digital ID card (`Resident::idSignature`), so changing it makes every existing card fail verification until residents reopen *My ID*.

`MAIL_MAILER` stays `log` (no real email sent) until a real provider is configured;
`config/services.php` already has a `resend` block ready, set `MAIL_MAILER=resend` and
`RESEND_API_KEY` when real email delivery is needed.

## Roadmap

- **Partner agency onboarding:** confirm with city hall or the barangay chairman who may add partner agencies, then decide on a request flow.
- **Resident username login** for residents without an email, with staff-assisted recovery.
- **BHW offline sync.** In progress: a PWA-based offline draft queue for the resident/household intake forms (see the implementation plan), not the full local-database mirror the capstone paper's System Architecture describes.
- Native email delivery for account and request notifications (currently `MAIL_MAILER=log`; see Deployment below for switching to a real provider).
- Native-speaker review of Filipino and Bisaya translations, and translated sign-in and sign-up pages.
- A logo variant for dark backgrounds, and vector (SVG) artwork.

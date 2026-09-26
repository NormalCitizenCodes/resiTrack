# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

resiTrack: a multi-barangay resident profiling and social-services platform (capstone, Cagayan de Oro City). Laravel 13 (PHP 8.4) + Inertia.js + React 19 + TypeScript + Tailwind 4 / shadcn-ui. SQLite locally, meant to be portable to PostgreSQL/Supabase. `README.md` has the full feature list and seeded test accounts (staff and agency password = the email, e.g. `superadmin@resitrack.test`; the sample resident `resident@resitrack.test` uses `password`).

Brand: the name is written `resiTrack`, the tagline is "Track today. Brighter tomorrows." Never use em dashes anywhere (copy, comments, docs, commit messages).

## Commands

```bash
composer run dev          # php artisan serve + queue:listen + vite (http://localhost:8000)
php artisan migrate:fresh --seed   # reset local DB (never against a shared DB)

php artisan data:seed demo|loadtest      # realistic data in its OWN sqlite file (see README, "Demo and load-test data")
php artisan test                          # all Pest tests (in-memory SQLite, see phpunit.xml)
php artisan test --filter=ResidentProfiling   # one test file/class/name
php artisan test tests/Feature/StaffManagementTest.php

composer test             # config:clear + pint --test + phpstan + artisan test
composer lint             # Pint (PHP formatter), fix mode; lint:check = dry run
composer types:check      # PHPStan/Larastan level 7 over app, config, database, routes
npm run types:check       # tsc --noEmit
npm run lint:check        # ESLint (npm run lint to fix); npm run format:check for Prettier
composer ci:check         # everything CI runs
```

On this Windows machine `composer`/`php` are only on PATH in PowerShell (Herd Lite), not in the Bash tool.

Database files: never commit `database/database.sqlite` (it is the local working DB, holds real emails and sessions, and git cannot replace it while the dev server has it open). The only tracked database is the clean sample at `database/sample/resitrack-sample.sqlite`; regenerate it after migration or seeder changes as described in the README, and check it has no non-`.test` accounts before committing.

Dev server gotchas: restart `composer run dev` after changing `vite.config.ts`. If Vite serves an empty module after a file is rewritten while it is running (the browser then reports a missing export and nothing is clickable), `touch` the file or restart Vite. PHPStan and ESLint both report existing issues in older code; do not treat those as regressions from new work.

## Architecture

**Core access rule: role determines what a user can do; `barangay_id` determines where.** Roles are constants on `User` (`super_admin`, `barangay_admin`, `bhw`, `partner_agency`, `resident`).

- Role gating is route-level via the `role:a,b` middleware (`EnsureUserHasRole`) in `routes/web.php`. `barangay_admin` and `bhw` share most routes; `StaffController`/partner-agency management are the deliberate exception (BHWs excluded), and BHWs have no announcement access.
- **The super admin is read-only for residents and households** (city-wide oversight, not record keeping). Write routes sit in a `role:barangay_admin,bhw` group that is registered before the read routes, so `residents/create` is not captured by `residents/{resident}`. Keep that order when adding routes.
- **Barangay scoping is NOT a global Eloquent scope.** Each controller/query manually applies `->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))`, and on create forces the user's own `barangay_id`. Any new query or endpoint touching resident/household/staff/request data must add this itself. The frontend is not a security boundary. Careful with `->when($a && $b, fn ($q, $value) => ...)`: the callback receives the boolean, not `$b`.
- Duplicate/transfer detection (`DuplicateDetectionService`) is intentionally system-wide across barangays. Alert actions (`DuplicateAlertController`) check the alert belongs to the acting user's barangay. A BHW can escalate; once escalated only a barangay admin can resolve or dismiss.
- Programs may be city-wide (`programs.barangay_id` null) or barangay-targeted; agency users are scoped by both `agency_id` and `barangay_id`.

**Business logic lives in `app/Services/`**, not controllers: `SectorClassificationService` (rule-based compound vulnerability sectors, driven by rows in the `sector_criteria` table, plus `explain()` for plain-English reasons), `ProgramEligibilityService`, `DuplicateDetectionService`, `NotificationService`, `AuditLogger`, and the stats services (`DashboardStatsService` is reused by reports and the super admin per-barangay summary). Resident create/edit re-runs classification and duplicate screening; meaningful mutations should go through `AuditLogger`. The Activity Log page (`ActivityLogController`) shows that trail to admins, scoped by the acting user's barangay, and `ActivityLogPresenter` turns each `(action, table)` pair into a sentence: when you add an `AuditLogger::record()` call, add its pair there too (unknown pairs fall back to a generic line) and put a name or reference in the payload so the entry can say what was touched. Sign-ins are logged by a `Login` listener in `AppServiceProvider`.

**Auth/accounts:** Laravel Fortify (`app/Actions/Fortify`, `FortifyServiceProvider`). Inactive accounts (`users.is_active`) are rejected at login and force-logged-out mid-session by `EnsureAccountIsActive`. Residents can't delete accounts; they file deletion/reactivation requests handled by barangay admins. `User::$attributes` sets the `is_active` default in-model because the DB default only applies on INSERT.

**Addresses:** residents and households store PSGC codes (`address_*_code`, `birth_*_code`, `previous_*_code`) beside the readable text column. The text is always composed server-side from the codes (`HasStructuredAddresses` trait on the form requests, `PsgcAddress` service), and the chain is validated (barangay under city, city under province or region). Plain typed `address` text is still accepted when nothing is picked, for old records. The `psgc_locations` table is loaded by `php artisan psgc:import` (Dockerfile runs it with `--if-empty`), never by a migration.

**Metadata, help and onboarding:** search and link-preview tags live in `app.blade.php` (keyed by `$page['component']`), not React `<Head>`, because production has no SSR server and crawlers only see Blade; add new public pages to its `$publicPages` map and to `SeoController::PUBLIC_PATHS`. The Help page copy is in `pages/help.tsx` (resident text via `help.*` translation keys). The dashboard checklist logic is `OnboardingService` (which steps, and done from real barangay-scoped data); its wording is in `components/getting-started.tsx`. The `app_lang` cookie is written by the browser, so it must stay in the `encryptCookies(except: ...)` list in `bootstrap/app.php`, or the language resets on every reload.

**Resident services** (digital ID, claim schedules, certificate requests, concerns, household view, hotlines; see the README section): the ID card's QR code is signed with `Resident::idSignature()` (HMAC keyed on `APP_KEY`, so rotating the key voids printed cards), and `/verify/{id}` needs a staff or agency login. Certificate and concern desks are `role:barangay_admin,bhw` and barangay-scoped; the super admin has none. Claim schedule times are the venue's wall-clock time, serialized without a zone (`ProgramController::scheduleData`) and printed with `useScheduleTime`; do not convert them. Never seed local hotline numbers (a wrong emergency number is worse than none); only 911 and 143 are built in. The demo resident account and sample service data come from `SampleResidentSeeder` / `ResidentServicesSeeder`, not `DatabaseSeeder`.

**Public site:** `/`, `/privacy`, `/terms`, `/faq` are unauthenticated. `LandingController` exposes cached aggregate totals only, never resident data (there is a test for this). The Privacy Notice and Terms are drafts pending barangay review. Do not add government seals or "Republic of the Philippines" wording: resiTrack is not an official government site. Landing screenshots are in `public/images/landing/` and must use seeded sample data only. The landing intro splash is gated by a pre-paint script in `app.blade.php` (`html.intro-pending`); anything that animates on first sight must wait for it with `whenIntroDone()` from `lib/intro.ts`, or it plays unseen behind the splash.

**Frontend:** Inertia pages in `resources/js/pages`, layouts in `resources/js/layouts` (resolved in `resources/js/app.tsx`; `welcome` and `legal/*` render with no layout and bring their own shell), shared props (auth user/barangay/agency, flash, unread notifications, lazy `navCounts` for sidebar badges, `sidebarOpen`, `language`) from `HandleInertiaRequests`. `DashboardController` renders different pages per role (staff stats vs resident feed).
- `resources/js/routes`, `resources/js/actions`, `resources/js/wayfinder` are **generated by the Wayfinder Vite plugin and gitignored**; run `npm run dev`/`build` to regenerate after changing routes or controllers, then import route helpers from `@/routes`.
- i18n is a custom dictionary in `resources/js/lib/translations.ts` (`en`/`fil`/`ceb`, cookie `app_lang`). Only fixed UI chrome is translated, never user-generated content. The sign-in and sign-up copy is not translated yet.
- Residents get a `comfortable-scale` root font bump (110%) and a read-aloud button (Web Speech API); keep resident-facing UI compatible with both. Below 1024px residents also get a fixed bottom tab bar (`components/resident-tab-bar.tsx`), so fixed or bottom-anchored resident UI must leave room for it. Inertia remounts the layout on every visit here, so anything that should animate across pages needs its previous state kept outside React (the tab bar uses a module variable).
- The light/dark switch lives in the account menu (`components/user-menu-content.tsx`), not the sidebar.
- **Theme:** all colors are tokens in `resources/css/app.css` (light default, `.dark` overrides, brand and status tokens, `--page-glow` and `--page-tint` knobs, gradient utilities `bg-sidebar-gradient`, `bg-brand-gradient`, `bg-page-gradient`, `bg-footer-gradient`). Prefer tokens over hardcoded Tailwind hues. Use `text-success-text` / `warning-text` / `info-text` for status text, not the fill colors.
- **Sidebar:** the drawer breakpoint is 1024px, defined in `hooks/use-mobile.tsx` and mirrored by the `lg:` classes in `components/ui/sidebar.tsx`; keep them in sync. Desktop collapsed state is read from the `sidebar_state` cookie in `components/app-shell.tsx` (the per-request prop can be stale). The drawer closes on Inertia `navigate`.
- **SSR and hydration:** never read `window`, `document`, the clock, or media queries during render. Use `useSyncExternalStore(subscribe, clientValue, () => serverValue)` for browser-only values (see `read-aloud-button.tsx`, `nav-theme-toggle.tsx`), and drive theme-dependent visuals with CSS `dark:` variants instead of state. Libraries that touch `window` as soon as they are imported (Leaflet) must be loaded with a dynamic `import()` inside an effect, never a top-level import (see `barangay-heatmap.tsx`); a top-level import crashes SSR for the whole page.
- The logo is rendered only through `components/app-logo-icon.tsx` (256px copy in `public/images/`, source artwork in `images/`). It is navy, so on dark or navy surfaces it needs the white tile until a reversed version exists.
- Sign-in and sign-up share `layouts/auth/auth-simple-layout.tsx` (the `tab` layout prop turns on the Log in / Sign up switch). `components/password-checklist.tsx` parses the server's `passwordRules` string, so keep its rule names in step with Laravel's `toPasswordRulesString()`.

**Tests:** Pest feature tests under `tests/Feature` cover role access, barangay isolation, super admin read-only access, classification, duplicate detection and escalation, account flows, and the public pages. When adding endpoints, add isolation tests (a user from barangay A must not reach barangay B's data).

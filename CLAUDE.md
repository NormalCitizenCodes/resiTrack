# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

resiTrack: a multi-barangay resident profiling and social-services platform (capstone, Cagayan de Oro City). Laravel 13 (PHP 8.4) + Inertia.js + React 19 + TypeScript + Tailwind 4 / shadcn-ui. SQLite locally, meant to be portable to PostgreSQL/Supabase. `README.md` has the full feature list and seeded test accounts (staff and agency password = the email, e.g. `superadmin@resitrack.test`; the sample resident `resident@resitrack.test` uses `password`).

Brand: the name is written `resiTrack`, the tagline is "Track today. Brighter tomorrows." Never use em dashes anywhere (copy, comments, docs, commit messages).

## Commands

```bash
composer run dev          # php artisan serve + queue:listen + vite (http://localhost:8000)
php artisan migrate:fresh --seed   # reset local DB (never against a shared DB)

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

Dev server gotchas: restart `composer run dev` after changing `vite.config.ts`. If Vite serves an empty module after a file is rewritten while it is running (the browser then reports a missing export and nothing is clickable), `touch` the file or restart Vite. PHPStan and ESLint both report existing issues in older code; do not treat those as regressions from new work.

## Architecture

**Core access rule: role determines what a user can do; `barangay_id` determines where.** Roles are constants on `User` (`super_admin`, `barangay_admin`, `bhw`, `partner_agency`, `resident`).

- Role gating is route-level via the `role:a,b` middleware (`EnsureUserHasRole`) in `routes/web.php`. `barangay_admin` and `bhw` share most routes; `StaffController`/partner-agency management are the deliberate exception (BHWs excluded), and BHWs have no announcement access.
- **The super admin is read-only for residents and households** (city-wide oversight, not record keeping). Write routes sit in a `role:barangay_admin,bhw` group that is registered before the read routes, so `residents/create` is not captured by `residents/{resident}`. Keep that order when adding routes.
- **Barangay scoping is NOT a global Eloquent scope.** Each controller/query manually applies `->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))`, and on create forces the user's own `barangay_id`. Any new query or endpoint touching resident/household/staff/request data must add this itself. The frontend is not a security boundary. Careful with `->when($a && $b, fn ($q, $value) => ...)`: the callback receives the boolean, not `$b`.
- Duplicate/transfer detection (`DuplicateDetectionService`) is intentionally system-wide across barangays. Alert actions (`DuplicateAlertController`) check the alert belongs to the acting user's barangay. A BHW can escalate; once escalated only a barangay admin can resolve or dismiss.
- Programs may be city-wide (`programs.barangay_id` null) or barangay-targeted; agency users are scoped by both `agency_id` and `barangay_id`.

**Business logic lives in `app/Services/`**, not controllers: `SectorClassificationService` (rule-based compound vulnerability sectors, driven by rows in the `sector_criteria` table, plus `explain()` for plain-English reasons), `ProgramEligibilityService`, `DuplicateDetectionService`, `NotificationService`, `AuditLogger`, and the stats services (`DashboardStatsService` is reused by reports and the super admin per-barangay summary). Resident create/edit re-runs classification and duplicate screening; meaningful mutations should go through `AuditLogger`.

**Auth/accounts:** Laravel Fortify (`app/Actions/Fortify`, `FortifyServiceProvider`). Inactive accounts (`users.is_active`) are rejected at login and force-logged-out mid-session by `EnsureAccountIsActive`. Residents can't delete accounts; they file deletion/reactivation requests handled by barangay admins. `User::$attributes` sets the `is_active` default in-model because the DB default only applies on INSERT.

**Public site:** `/`, `/privacy`, `/terms`, `/faq` are unauthenticated. `LandingController` exposes cached aggregate totals only, never resident data (there is a test for this). The Privacy Notice and Terms are drafts pending barangay review. Do not add government seals or "Republic of the Philippines" wording: resiTrack is not an official government site. Landing screenshots are in `public/images/landing/` and must use seeded sample data only.

**Frontend:** Inertia pages in `resources/js/pages`, layouts in `resources/js/layouts` (resolved in `resources/js/app.tsx`; `welcome` and `legal/*` render with no layout and bring their own shell), shared props (auth user/barangay/agency, flash, unread notifications, lazy `navCounts` for sidebar badges, `sidebarOpen`, `language`) from `HandleInertiaRequests`. `DashboardController` renders different pages per role (staff stats vs resident feed).
- `resources/js/routes`, `resources/js/actions`, `resources/js/wayfinder` are **generated by the Wayfinder Vite plugin and gitignored**; run `npm run dev`/`build` to regenerate after changing routes or controllers, then import route helpers from `@/routes`.
- i18n is a custom dictionary in `resources/js/lib/translations.ts` (`en`/`fil`/`ceb`, cookie `app_lang`). Only fixed UI chrome is translated, never user-generated content. The sign-in and sign-up copy is not translated yet.
- Residents get a `comfortable-scale` root font bump and a read-aloud button (Web Speech API); keep resident-facing UI compatible with both.
- **Theme:** all colors are tokens in `resources/css/app.css` (light default, `.dark` overrides, brand and status tokens, `--page-glow` and `--page-tint` knobs, gradient utilities `bg-sidebar-gradient`, `bg-brand-gradient`, `bg-page-gradient`, `bg-footer-gradient`). Prefer tokens over hardcoded Tailwind hues. Use `text-success-text` / `warning-text` / `info-text` for status text, not the fill colors.
- **Sidebar:** the drawer breakpoint is 1024px, defined in `hooks/use-mobile.tsx` and mirrored by the `lg:` classes in `components/ui/sidebar.tsx`; keep them in sync. Desktop collapsed state is read from the `sidebar_state` cookie in `components/app-shell.tsx` (the per-request prop can be stale). The drawer closes on Inertia `navigate`.
- **SSR and hydration:** never read `window`, `document`, the clock, or media queries during render. Use `useSyncExternalStore(subscribe, clientValue, () => serverValue)` for browser-only values (see `read-aloud-button.tsx`, `nav-theme-toggle.tsx`), and drive theme-dependent visuals with CSS `dark:` variants instead of state.
- The logo is rendered only through `components/app-logo-icon.tsx` (256px copy in `public/images/`, source artwork in `images/`). It is navy, so on dark or navy surfaces it needs the white tile until a reversed version exists.
- Sign-in and sign-up share `layouts/auth/auth-simple-layout.tsx` (the `tab` layout prop turns on the Log in / Sign up switch). `components/password-checklist.tsx` parses the server's `passwordRules` string, so keep its rule names in step with Laravel's `toPasswordRulesString()`.

**Tests:** Pest feature tests under `tests/Feature` cover role access, barangay isolation, super admin read-only access, classification, duplicate detection and escalation, account flows, and the public pages. When adding endpoints, add isolation tests (a user from barangay A must not reach barangay B's data).

# Change Record

## 2026-09-21: Role boundaries, duplicate escalation, brand system, public site

Applies the September walkthrough notes, tightens the super admin role, adds a duplicate escalation step, and rebuilds the visual layer around the resiTrack brand.

### Role boundaries and permissions
- The super admin is read-only for residents and households. Write routes are grouped under `role:barangay_admin,bhw`. Deactivating or restoring a resident is now barangay admin only. Permanent deletion stays a super admin action.
- BHWs lose all announcement access (sidebar item, list, create, delete).
- Duplicate alert actions now verify the acting user's barangay. Previously any staff member could resolve or dismiss another barangay's alert by ID.
- A household created by a super admin was silently filed under the first barangay in the database. Super admin creation is now blocked.

### Duplicate escalation
- New columns on `duplicate_alerts`: `escalated_at`, `escalated_by`, `escalation_note` (migration `2026_09_20_000001`).
- A BHW can escalate a pending alert with a note. Barangay admins in that barangay are notified. Once escalated, only a barangay admin can resolve or dismiss it. An Escalated tab lists them.

### Notes from the walkthrough
- Removed the emoji and sparkle icon from the resident dashboard; status is carried by color.
- Account reactivation request page no longer shows the sidebar.
- Household picker shows household number, family name, and address.
- Email is required when a BHW creates a resident portal account.
- Households list gains purok, wellbeing level, and 4Ps filters and a wellbeing column.
- Dashboard stat cards only link for roles that can open the target page.

### Super admin oversight
- Barangay filter and column on the Residents and Households lists, and a By Barangay summary on the dashboard.

### Staff conveniences
- Quick resident search in the top bar, sidebar badges (pending alerts, pending resident accounts), and a role-aware quick action.

### Brand and design system
- Light-first palette, Inter, status color tokens, and restrained navy gradients, all in `resources/css/app.css`. Light is now the default theme, with a one-time reset of browsers that had the old automatic "system" value.
- Real logo replaces the placeholder badge everywhere, with regenerated favicon and touch icons. The wordmark is standardized to `resiTrack`.
- Floating navy sidebar with a pill light and dark toggle, badges, and a quick action. The toggle animates in step with the sidebar.
- Resident dashboard rebuilt with a welcome band, quick links, and a two-column layout.

### Responsive behavior
- Below 1024px the sidebar is a drawer that closes after each link and does not remember state. On larger screens the collapsed or expanded state persists across pages via the `sidebar_state` cookie, which is now the source of truth over the per-request prop.
- Fixed overflow on the landing header, duplicate alert tabs and buttons, top bar, pagination, and notification titles. Phones show only the current page name in the breadcrumb.

### Public site
- New landing page with a hero, live aggregate numbers, a partner agency section, a resident guide, and a footer, served by `LandingController`.
- New Privacy Notice, Terms of Use, and FAQ pages (drafts for review).
- The landing header collapses to a menu drawer on phones.
- Redesigned sign-in and sign-up pages with a Log in / Sign up switch and a live password checklist built from the server's password rules.

### Bug fixes found along the way
- Logged-out visitors opening `/programs` saw a blank page (a missing language provider in the guest layout). Present since the first commit.
- React hydration mismatches on pages with read-aloud buttons (the button checked browser speech support during render). Fixed with `useSyncExternalStore`.
- All em dashes removed from copy, comments, and documentation.

### Tests
- New tests for super admin read-only access, per-barangay dashboard summary, duplicate escalation, alert barangay isolation, household filters, sidebar badge scoping, sidebar cookie state, the public landing page (totals only, no names), and the three legal pages. 130 tests pass.

### Sample database
- `database/sample/resitrack-sample.sqlite` is now tracked: a clean snapshot built from the seeders (6 test accounts, 54 fake residents, 12 households, 4 programs), with no real people, sessions or tokens. `database/database.sqlite` stays untracked and ignored. See the README for how to use and regenerate it.
- An earlier upload had force-added `database/database.sqlite` to `main`. It was removed from tracking: it was local state on an out-of-date schema.

### Operational notes
- Run `php artisan migrate` for the escalation columns.
- Restart `npm run dev` after pulling, since the font configuration in `vite.config.ts` changed.
- If Vite serves an empty module after a file is rewritten while the dev server runs, touch the file or restart Vite.

## Feature Branch

`feature/resident-registration-bhw-flow`

## Overview

This branch updates the resident account lifecycle so online registration creates a usable resident account immediately while keeping the account unlinked from the official resident registry until a BHW verifies the person in person and completes the official profile.

The branch also contains the supporting resident-profiling, account-recovery, notification, interface, seed-data, and test changes present in the working tree at the time of branching.

## Resident Registration and Verification

- Added barangay selection to resident self-registration.
- Validated that the selected barangay exists before creating the account.
- Created a `REG-XXXXXX` registration identifier for staff-side lookup while keeping it out of the resident's primary workflow.
- Kept new resident accounts linked to no official resident record by leaving `users.resident_id` null.
- Preserved immediate authentication after successful registration.
- Added a registration queue for BHWs that lists resident accounts with no linked resident record.
- Scoped the BHW queue to the BHW's barangay; super administrators can view registrations city-wide.
- Added the BHW verification action that:
  - checks the account is a resident account;
  - checks it is still unlinked;
  - verifies barangay access;
  - creates the initial official resident record from the account name and email;
  - links `users.resident_id` to the new resident record;
  - records an audit entry; and
  - redirects staff to complete the official profile.
- Updated the resident dashboard and email-verification screen to display:
  - the account is not yet linked to a resident record;
  - instructions to visit the Barangay Hall and approach a BHW; and
  - `Status: Pending Profiling`.
- Removed resident-facing instructions to present a registration ID as the main workflow.

## BHW Notifications

- Added automatic in-app notifications when a resident account is created.
- Notifications are sent to every BHW assigned to the selected barangay and are not sent to BHWs from other barangays.
- Notifications use the `system` type and remain independent of an official resident record because the account is initially unlinked.
- Updated notification wording to identify a newly created resident account and request in-person verification before official profiling.
- Added periodic unread-count polling to the notification bell so staff already using the application can see new alerts without navigating away or manually refreshing.
- Kept notification list, read, and mark-all-read behavior scoped to the authenticated user.

## Resident Profiling and Records

- Expanded resident creation and editing support for the profiling workflow.
- Added public identifiers for resident and household records.
- Added resident profile fields and validation needed by the updated forms.
- Updated resident and household controllers/models to use the new identifiers and profiling data.
- Preserved sector classification and resident-profile completeness behavior.
- Added and updated resident-facing resident list and detail views.
- Kept staff access and barangay scoping rules in place.

## Account Recovery

- Added a BHW-assisted account recovery request workflow.
- Added recovery request persistence, status handling, approval, rejection, and password update endpoints.
- Added BHW recovery screens and generated frontend route/action bindings.
- Added notifications to the relevant BHWs when a recovery request is submitted.
- Added migrations for the recovery request table and optional user email support where required by the workflow.

## Authentication and Authorization

- Updated Fortify registration to use the barangay-aware resident account creation action.
- Updated authentication lookup to support email, registration ID, and official resident ID where applicable.
- Preserved active-account checks so deactivated users cannot authenticate.
- Updated authentication screens and tests for the new account and recovery behavior.
- Kept resident, BHW, barangay administrator, partner agency, and super administrator role boundaries enforced through routes and controllers.

## Notifications and Shared Application Data

- Shared the authenticated user's unread notification count through Inertia middleware.
- Kept notification records associated with the receiving user and optional official resident record.
- Added notification navigation through the application header and sidebar layout.
- Updated notification-related types and UI behavior.

## Frontend and UX

- Updated registration, login, email verification, password recovery, resident dashboard, resident list/detail, and program screens.
- Added or refined translations used by authentication, navigation, notifications, and resident-facing pages.
- Updated shared authentication layouts, application header/sidebar, breadcrumbs, logo, and notification controls.
- Added responsive and visual styling adjustments in the application stylesheet.
- Updated TypeScript declarations and domain types for the expanded data model.
- Added account recovery and online resident registration navigation for the appropriate staff roles.

## Database and Seed Data

- Added a password recovery request table.
- Added public IDs for residents and households.
- Made user email optional where required by the account workflow.
- Added registration IDs to users.
- Updated seeders for the revised user and resident account model.
- Removed obsolete seed behavior that conflicted with the current account setup.

## Tests Added or Updated

- Registration tests now verify:
  - successful account creation;
  - immediate authentication;
  - a generated registration ID;
  - no automatic official resident record;
  - a null `resident_id`; and
  - notification delivery only to BHWs in the selected barangay.
- Resident dashboard tests cover linked and unlinked resident accounts.
- Resident profiling tests cover BHW verification, official record creation, account linking, profile completion, access control, sector classification, duplicate detection, and resident status behavior.
- Authentication tests cover the updated login and active-account behavior.
- Password reset and account-recovery tests cover the revised recovery workflow.
- Program module tests cover the related resident/account integration changes.

## Validation Performed

- TypeScript compilation with `npm run types:check`.
- Targeted Laravel tests for registration, resident dashboard, and profiling.
- Targeted registration regression test after the notification update.
- Prettier checks for changed frontend files.
- ESLint check for the changed notification bell component.
- Editor diagnostics for the changed PHP and TypeScript files.

## Operational Notes

Run migrations before using the new recovery, public-ID, and registration-ID fields:

```text
php artisan migrate
```

Install frontend dependencies and build the application as usual:

```text
npm install
npm run build
```

BHWs must have the `bhw` role and the correct `barangay_id` for new resident-account notifications to be delivered to their in-app notification feed.

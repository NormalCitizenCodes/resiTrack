# Change Record

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

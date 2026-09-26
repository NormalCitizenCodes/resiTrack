<?php

use App\Http\Controllers\AccountDeletionRequestController;
use App\Http\Controllers\AccountReactivationRequestController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\BeneficiaryController;
use App\Http\Controllers\ConcernController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentRequestController;
use App\Http\Controllers\DuplicateAlertController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\HelpController;
use App\Http\Controllers\HotlineController;
use App\Http\Controllers\HouseholdController;
use App\Http\Controllers\HouseholdMemberController;
use App\Http\Controllers\HouseholdWellbeingAssessmentController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MyHouseholdController;
use App\Http\Controllers\MyProfileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PartnerAgencyController;
use App\Http\Controllers\PasswordRecoveryController;
use App\Http\Controllers\ProgramApplicationController;
use App\Http\Controllers\ProgramClaimController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\ProgramScheduleController;
use App\Http\Controllers\PsgcController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResidentController;
use App\Http\Controllers\ResidentIdController;
use App\Http\Controllers\ResidentRegistrationController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\StaffController;
use Illuminate\Support\Facades\Route;

Route::get('/', LandingController::class)->name('home');
Route::inertia('privacy', 'legal/privacy')->name('privacy');
Route::inertia('terms', 'legal/terms')->name('terms');
Route::inertia('faq', 'legal/faq')->name('faq');
Route::get('robots.txt', [SeoController::class, 'robots'])->name('robots');
Route::get('sitemap.xml', [SeoController::class, 'sitemap'])->name('sitemap');

Route::post('forgot-password', [PasswordRecoveryController::class, 'store'])
    ->middleware('guest')
    ->name('password.email');

Route::get('account-reactivation/request', [AccountReactivationRequestController::class, 'create'])->name('account-reactivation.create');
Route::post('account-reactivation/request', [AccountReactivationRequestController::class, 'store'])->name('account-reactivation.store');

Route::middleware('guest')->group(function () {
    Route::get('auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
    Route::get('register/google/complete', [GoogleAuthController::class, 'create'])->name('register.google-complete');
    Route::post('register/google/complete', [GoogleAuthController::class, 'complete'])->name('register.google-complete.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('help', [HelpController::class, 'index'])->name('help');
    Route::post('onboarding/dismiss', [HelpController::class, 'dismissOnboarding'])->name('onboarding.dismiss');
    Route::post('onboarding/restore', [HelpController::class, 'restoreOnboarding'])->name('onboarding.restore');

    // Address lists for the cascading pickers (region > province > city > barangay).
    Route::get('psgc/regions', [PsgcController::class, 'regions'])->name('psgc.regions');
    Route::get('psgc/{code}/children', [PsgcController::class, 'children'])->name('psgc.children');

    // Writing resident/household records is barangay-level work; the super admin
    // has read-only, city-wide oversight. Registered before the read routes so
    // 'residents/create' is not captured by 'residents/{resident}'.
    Route::middleware('role:barangay_admin,bhw')->group(function () {
        Route::resource('residents', ResidentController::class)->except(['index', 'show']);
        Route::post('residents/{resident}/toggle', [ResidentController::class, 'toggleActive'])->name('residents.toggle');
        Route::post('duplicate-alerts/{alert}/resolve', [DuplicateAlertController::class, 'resolve'])->name('duplicate-alerts.resolve');
        Route::post('duplicate-alerts/{alert}/dismiss', [DuplicateAlertController::class, 'dismiss'])->name('duplicate-alerts.dismiss');
        Route::post('duplicate-alerts/{alert}/escalate', [DuplicateAlertController::class, 'escalate'])->middleware('role:bhw')->name('duplicate-alerts.escalate');
        Route::get('households/search', [HouseholdController::class, 'search'])->name('households.search');
        Route::resource('households', HouseholdController::class)->only(['create', 'store', 'edit', 'update']);
        Route::put('households/{household}/leader', [HouseholdController::class, 'setLeader'])->name('households.leader.update');
        Route::get('households/{household}/member-search', [HouseholdMemberController::class, 'search'])->name('households.members.search');
        Route::post('households/{household}/members', [HouseholdMemberController::class, 'store'])->name('households.members.store');
        Route::delete('households/{household}/members/{resident}', [HouseholdMemberController::class, 'destroy'])->name('households.members.destroy');
        Route::post('households/{household}/wellbeing-assessments', [HouseholdWellbeingAssessmentController::class, 'store'])
            ->name('households.wellbeing-assessments.store');
    });

    // Barangay resident-profiling module (barangay staff + super admin).
    Route::middleware('role:super_admin,barangay_admin,bhw')->group(function () {
        Route::resource('residents', ResidentController::class)->only(['index', 'show']);
        Route::get('resident-registrations', [ResidentRegistrationController::class, 'index'])->name('resident-registrations.index');
        Route::get('resident-registrations/{registration}', [ResidentRegistrationController::class, 'show'])->name('resident-registrations.show');
        Route::delete('residents/{resident}/permanent', [ResidentController::class, 'forceDestroy'])->middleware('role:super_admin')->name('residents.force-destroy');
        Route::resource('households', HouseholdController::class)->only(['index', 'show']);

        Route::get('duplicate-alerts', [DuplicateAlertController::class, 'index'])->name('duplicate-alerts.index');

        // Reporting & visualization module (Objective 3).
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/print', [ReportController::class, 'print'])->name('reports.print');
        Route::get('reports/export/pdf', [ReportController::class, 'exportPdf'])->name('reports.export.pdf');
        Route::get('reports/export/csv', [ReportController::class, 'exportCsv'])->name('reports.export.csv');
    });

    // Staff account management - admin-only (excludes bhw). The one route
    // group where barangay_admin and bhw actually differ.
    Route::middleware('role:super_admin,barangay_admin')->group(function () {
        Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
        Route::get('staff/create', [StaffController::class, 'create'])->name('staff.create');
        Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
        Route::post('staff/{staff}/toggle', [StaffController::class, 'toggleActive'])->name('staff.toggle');
        Route::get('partner-agencies', [PartnerAgencyController::class, 'index'])->name('partner-agencies.index');
        Route::post('partner-agencies', [PartnerAgencyController::class, 'storeAgency'])->middleware('role:super_admin')->name('partner-agencies.store');
        Route::put('partner-agencies/{agency}', [PartnerAgencyController::class, 'updateAgency'])->middleware('role:super_admin')->name('partner-agencies.update');
        Route::post('partner-agency-accounts', [PartnerAgencyController::class, 'storeAccount'])->name('partner-agency-accounts.store');
        Route::put('partner-agency-accounts/{account}', [PartnerAgencyController::class, 'updateAccount'])->name('partner-agency-accounts.update');
        Route::post('partner-agency-accounts/{account}/toggle', [PartnerAgencyController::class, 'toggleAccount'])->name('partner-agency-accounts.toggle');
    });

    Route::middleware('role:bhw')->group(function () {
        Route::get('account-recovery', [PasswordRecoveryController::class, 'index'])->name('account-recovery.index');
        Route::post('account-recovery/{recoveryRequest}/approve', [PasswordRecoveryController::class, 'approve'])->name('account-recovery.approve');
        Route::post('account-recovery/{recoveryRequest}/reject', [PasswordRecoveryController::class, 'reject'])->name('account-recovery.reject');
        Route::get('account-recovery/password/{token}', [PasswordRecoveryController::class, 'password'])->name('account-recovery.password');
        Route::post('account-recovery/password/{token}', [PasswordRecoveryController::class, 'updatePassword'])->name('account-recovery.password.update');
    });

    // Partner-agency programs module.
    // Program management (create/edit/delete) is restricted to agencies; browsing
    // and application review routes apply their own finer-grained checks.
    Route::get('my-applications', [ProgramApplicationController::class, 'mine'])->name('applications.mine');

    Route::middleware('role:partner_agency,super_admin')->group(function () {
        Route::get('programs/create', [ProgramController::class, 'create'])->name('programs.create');
        Route::get('programs/eligibility-preview', [ProgramController::class, 'eligibilityPreview'])->name('programs.eligibility-preview');
        Route::post('programs', [ProgramController::class, 'store'])->name('programs.store');
        Route::get('programs/{program}/edit', [ProgramController::class, 'edit'])->name('programs.edit');
        Route::put('programs/{program}', [ProgramController::class, 'update'])->name('programs.update');
        Route::delete('programs/{program}', [ProgramController::class, 'destroy'])->name('programs.destroy');
        Route::get('applications/review', [ProgramApplicationController::class, 'review'])->name('applications.review');
        Route::patch('applications/{application}', [ProgramApplicationController::class, 'update'])->name('applications.update');
        Route::get('beneficiaries', [BeneficiaryController::class, 'index'])->name('beneficiaries.index');
    });

    // An agency's own org profile - self-service editing of its own contact
    // details, distinct from partner-agencies.update which is super-admin-only
    // management of any agency (see PartnerAgencyController::ownAgency()).
    Route::middleware('role:partner_agency')->group(function () {
        Route::get('agency-profile', [PartnerAgencyController::class, 'showProfile'])->name('agency-profile.show');
        Route::put('agency-profile', [PartnerAgencyController::class, 'updateProfile'])->name('agency-profile.update');

        // Recording that beneficiaries actually claimed what a program gives (the agency's own counter).
        Route::post('programs/{program}/claims', [ProgramClaimController::class, 'store'])->name('program-claims.store');
        Route::delete('programs/{program}/claims/{claim}', [ProgramClaimController::class, 'destroy'])->name('program-claims.destroy');
    });

    Route::post('programs/{program}/apply', [ProgramApplicationController::class, 'store'])->name('programs.apply');

    // Announcements - BHWs have no access; posting/deleting restricted to admins.
    Route::get('announcements', [AnnouncementController::class, 'index'])
        ->middleware('role:super_admin,barangay_admin,partner_agency,resident')
        ->name('announcements.index');
    Route::middleware('role:super_admin,barangay_admin')->group(function () {
        Route::get('announcements/create', [AnnouncementController::class, 'create'])->name('announcements.create');
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });

    // In-app notifications - personal to the authenticated user.
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    Route::middleware('role:resident')->group(function () {
        Route::get('settings/account', [AccountDeletionRequestController::class, 'create'])->name('account-deletion.create');
        Route::post('settings/account/deletion-request', [AccountDeletionRequestController::class, 'store'])->name('account-deletion.store');

        // Resident services: digital ID, household, certificates, reports.
        Route::get('my-id', [ResidentIdController::class, 'show'])->name('resident-id.show');
        Route::get('my-household', [MyHouseholdController::class, 'show'])->name('my-household.show');
        Route::put('my-household/leader', [MyHouseholdController::class, 'setLeader'])->middleware('throttle:20,1')->name('my-household.leader');
        Route::get('documents', [DocumentRequestController::class, 'index'])->name('documents.index');
        Route::post('documents', [DocumentRequestController::class, 'store'])->middleware('throttle:10,1')->name('documents.store');
        Route::delete('documents/{documentRequest}', [DocumentRequestController::class, 'cancel'])->name('documents.cancel');
        Route::get('concerns', [ConcernController::class, 'index'])->name('concerns.index');
        Route::post('concerns', [ConcernController::class, 'store'])->middleware('throttle:10,1')->name('concerns.store');
    });

    // Barangay-level service desks: certificates and residents' reports.
    Route::middleware('role:barangay_admin,bhw')->group(function () {
        Route::get('document-requests', [DocumentRequestController::class, 'manage'])->name('document-requests.index');
        Route::patch('document-requests/{documentRequest}', [DocumentRequestController::class, 'update'])->name('document-requests.update');
        Route::get('resident-concerns', [ConcernController::class, 'manage'])->name('resident-concerns.index');
        Route::patch('resident-concerns/{concern}', [ConcernController::class, 'update'])->name('resident-concerns.update');
    });

    // Opened by scanning a resident's ID card QR code.
    Route::get('verify/{residentId}', [ResidentIdController::class, 'verify'])
        ->middleware('role:super_admin,barangay_admin,bhw,partner_agency')
        ->name('resident-id.verify');

    // Payout and service-day schedules; owner checks are in the controller.
    Route::middleware('role:partner_agency,super_admin')->group(function () {
        Route::post('programs/{program}/schedules', [ProgramScheduleController::class, 'store'])->name('program-schedules.store');
        Route::delete('program-schedules/{schedule}', [ProgramScheduleController::class, 'destroy'])->name('program-schedules.destroy');
    });

    // Who did what: the audit trail, scoped to the admin's barangay (city-wide for the super admin).
    Route::get('activity-log', [ActivityLogController::class, 'index'])
        ->middleware('role:super_admin,barangay_admin')
        ->name('activity-log.index');

    // Everyone signed in can read the hotlines; admins maintain their own list.
    Route::get('hotlines', [HotlineController::class, 'index'])->name('hotlines.index');
    Route::middleware('role:super_admin,barangay_admin')->group(function () {
        Route::post('hotlines', [HotlineController::class, 'store'])->name('hotlines.store');
        Route::delete('hotlines/{hotline}', [HotlineController::class, 'destroy'])->name('hotlines.destroy');
    });

    Route::middleware('role:super_admin,barangay_admin')->group(function () {
        Route::get('account-deletion-requests', [AccountDeletionRequestController::class, 'index'])->name('account-deletion-requests.index');
        Route::post('account-deletion-requests/{deletionRequest}/approve', [AccountDeletionRequestController::class, 'approve'])->name('account-deletion-requests.approve');
        Route::post('account-deletion-requests/{deletionRequest}/reject', [AccountDeletionRequestController::class, 'reject'])->name('account-deletion-requests.reject');
        Route::get('account-reactivation-requests', [AccountReactivationRequestController::class, 'index'])->name('account-reactivation-requests.index');
        Route::post('account-reactivation-requests/{reactivationRequest}/approve', [AccountReactivationRequestController::class, 'approve'])->name('account-reactivation-requests.approve');
        Route::post('account-reactivation-requests/{reactivationRequest}/reject', [AccountReactivationRequestController::class, 'reject'])->name('account-reactivation-requests.reject');
    });

    // Self-service profile editing - personal to whichever resident record the
    // acting user is linked to (not role-gated; scoped inside the controller).
    Route::get('my-profile', [MyProfileController::class, 'edit'])->name('my-profile.edit');
    Route::put('my-profile', [MyProfileController::class, 'update'])->name('my-profile.update');
});

Route::get('programs', [ProgramController::class, 'index'])->name('programs.index');
Route::get('programs/{program}', [ProgramController::class, 'show'])->name('programs.show');

require __DIR__.'/settings.php';

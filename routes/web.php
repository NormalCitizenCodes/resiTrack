<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DuplicateAlertController;
use App\Http\Controllers\HouseholdController;
use App\Http\Controllers\HouseholdWellbeingAssessmentController;
use App\Http\Controllers\MyProfileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProgramApplicationController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResidentController;
use App\Http\Controllers\StaffController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Barangay resident-profiling module (barangay staff + super admin).
    Route::middleware('role:super_admin,barangay_admin,bhw')->group(function () {
        Route::resource('residents', ResidentController::class);
        Route::resource('households', HouseholdController::class)->except(['edit', 'update', 'destroy']);
        Route::post('households/{household}/wellbeing-assessments', [HouseholdWellbeingAssessmentController::class, 'store'])
            ->name('households.wellbeing-assessments.store');

        Route::get('duplicate-alerts', [DuplicateAlertController::class, 'index'])->name('duplicate-alerts.index');
        Route::post('duplicate-alerts/{alert}/resolve', [DuplicateAlertController::class, 'resolve'])->name('duplicate-alerts.resolve');
        Route::post('duplicate-alerts/{alert}/dismiss', [DuplicateAlertController::class, 'dismiss'])->name('duplicate-alerts.dismiss');

        // Reporting & visualization module (Objective 3).
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/export/pdf', [ReportController::class, 'exportPdf'])->name('reports.export.pdf');
        Route::get('reports/export/csv', [ReportController::class, 'exportCsv'])->name('reports.export.csv');
    });

    // Staff account management — admin-only (excludes bhw). The one route
    // group where barangay_admin and bhw actually differ.
    Route::middleware('role:super_admin,barangay_admin')->group(function () {
        Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
        Route::get('staff/create', [StaffController::class, 'create'])->name('staff.create');
        Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
        Route::post('staff/{staff}/toggle', [StaffController::class, 'toggleActive'])->name('staff.toggle');
    });

    // Partner-agency programs module.
    // Program management (create/edit/delete) is restricted to agencies; browsing
    // and application review routes apply their own finer-grained checks.
    Route::get('my-applications', [ProgramApplicationController::class, 'mine'])->name('applications.mine');

    Route::middleware('role:partner_agency,super_admin')->group(function () {
        Route::get('programs/create', [ProgramController::class, 'create'])->name('programs.create');
        Route::post('programs', [ProgramController::class, 'store'])->name('programs.store');
        Route::get('programs/{program}/edit', [ProgramController::class, 'edit'])->name('programs.edit');
        Route::put('programs/{program}', [ProgramController::class, 'update'])->name('programs.update');
        Route::delete('programs/{program}', [ProgramController::class, 'destroy'])->name('programs.destroy');
        Route::patch('applications/{application}', [ProgramApplicationController::class, 'update'])->name('applications.update');
    });

    Route::get('programs', [ProgramController::class, 'index'])->name('programs.index');
    Route::get('programs/{program}', [ProgramController::class, 'show'])->name('programs.show');
    Route::post('programs/{program}/apply', [ProgramApplicationController::class, 'store'])->name('programs.apply');

    // Announcements — browsing open to all roles; posting/deleting restricted to staff.
    Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
    Route::middleware('role:super_admin,barangay_admin,bhw')->group(function () {
        Route::get('announcements/create', [AnnouncementController::class, 'create'])->name('announcements.create');
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });

    // In-app notifications — personal to the authenticated user.
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Self-service profile editing — personal to whichever resident record the
    // acting user is linked to (not role-gated; scoped inside the controller).
    Route::get('my-profile', [MyProfileController::class, 'edit'])->name('my-profile.edit');
    Route::put('my-profile', [MyProfileController::class, 'update'])->name('my-profile.update');
});

require __DIR__.'/settings.php';

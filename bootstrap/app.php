<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RunDailyHousekeeping;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Render (and most PaaS hosts) terminate HTTPS at their edge and forward
        // plain HTTP to the container. Without this, Laravel doesn't know the
        // original request was HTTPS, which breaks asset URLs (mixed content)
        // and secure cookies. '*' is safe here since the platform's own edge is
        // the only thing that can reach this container directly.
        $middleware->trustProxies(at: '*');

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'app_lang', 'resident_lang']);

        $middleware->web(append: [
            HandleAppearance::class,
            EnsureAccountIsActive::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            RunDailyHousekeeping::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // A page the browser only PRE-loads (Inertia link hover) while nobody is signed
        // in, for example the split second after logging out, must not become the
        // "intended" page: Laravel would send the next person to log in there (for
        // instance to Help) instead of their dashboard. Only a real visit is remembered.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->headers->get('Purpose') === 'prefetch' && ! $request->expectsJson()) {
                return redirect()->route('login');
            }

            return null;
        });

        // A mail transport failure (misconfigured provider, a sandboxed sender
        // rejecting the recipient, etc.) should never surface as a raw 500 -
        // covers built-in flows we don't control the internals of, like
        // Fortify's "resend verification email" button.
        $exceptions->render(function (TransportExceptionInterface $e, Request $request) {
            Log::error('Mail transport failed.', ['exception' => $e->getMessage()]);

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Could not send that email right now. Please try again shortly.'], 500);
            }

            return back()->with('error', 'Could not send that email right now. Please try again shortly.');
        });

        // Laravel's own default error pages are plain and unbranded. Render
        // resiTrack's own error page for the status codes a visitor could
        // actually hit, leave everything else (like validation's 422) alone.
        // In debug mode 500 and 503 keep Laravel's detailed page (that is what
        // a developer needs); 401, 403 and 404 are safe and look the same everywhere.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            $branded = $status === 500 || $status === 503 ? ! app()->hasDebugModeEnabled() : in_array($status, [401, 403, 404], true);

            if ($branded && ! $request->expectsJson()) {
                // Only a 403 carries our own words ("This resident belongs to another barangay."),
                // never another status: a 404's message can name internal models.
                $detail = $status === 403 && $e instanceof HttpExceptionInterface ? trim($e->getMessage()) : null;

                return Inertia::render('error', ['status' => $status, 'detail' => $detail ?: null])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();

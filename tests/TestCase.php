<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // GuestFormThrottle's rate limits live in the array cache, which
        // (unlike the database) isn't reset between tests by RefreshDatabase -
        // without this, a test hitting one of these forms several times would
        // silently start failing other, unrelated tests later in the same run.
        foreach (['register', 'password-recovery', 'account-reactivation'] as $form) {
            RateLimiter::clear("{$form}:127.0.0.1");
        }
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}

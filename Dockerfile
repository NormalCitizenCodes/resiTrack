# Single-stage build: installs PHP + Node side by side, builds the Vite/Inertia
# frontend during the image build (not at container start, so cold starts on
# Render's free tier stay fast), then serves the app with `php artisan serve`.
#
# Not nginx+php-fpm - deliberately kept simple since traffic here is a small
# barangay staff/BHW user base plus a defense demo, not high-volume production.
# `php artisan serve` is fine at that scale; swapping to nginx+php-fpm later is
# a reasonable improvement once traffic actually justifies the extra complexity.
FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip curl libpq-dev libzip-dev libicu-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip intl bcmath opcache \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Wayfinder's Vite plugin shells out to `php artisan` to discover routes while
# building the frontend, so Laravel needs to be bootable at build time. This
# APP_KEY is a throwaway - Render injects the real one as an env var at
# container start, which takes priority over anything baked into the image.
RUN php -r "file_exists('.env') || copy('.env.example', '.env');" \
    && php artisan key:generate --force

RUN npm ci && npm run build

ENV APP_ENV=production
ENV LOG_CHANNEL=stderr

EXPOSE 10000

# Runs on every boot (including every free-tier wake from sleep), not just the
# first deploy - migrate is safe to re-run (skips what's already applied), and
# this way a new migration merged into main gets applied automatically on the
# next boot without a manual step.
# The PSGC address lists load once (43,000+ places) and are skipped after that.
# A failed import must not keep the site from starting, so it is allowed to fail.
CMD php artisan migrate --force \
    && { php artisan psgc:import --if-empty || echo "PSGC import failed; address pickers will be empty until it is re-run"; } \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}

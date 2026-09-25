<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{--
            Search and link-preview metadata. It lives here, not in React <Head>, because
            production does not server-render the pages: crawlers and Messenger/Facebook
            previews only ever see this template. Public pages get their own title and
            description; everything behind a login is marked noindex.
        --}}
        @php
            $publicPages = [
                'welcome' => ['resiTrack: resident profiling for barangays', 'Track today. Brighter tomorrows. One verified record for every resident, so barangay staff see who needs help and partner agencies reach the right households in Cagayan de Oro City.'],
                'programs/index' => ['Social service programs | resiTrack', 'Programs from partner agencies for residents of participating barangays in Cagayan de Oro City, matched to seniors, PWDs, solo parents, out-of-school youth and pregnant residents.'],
                'programs/show' => ['Program details | resiTrack', 'Details, eligibility and open slots for a social service program on resiTrack.'],
                'legal/faq' => ['Frequently asked questions | resiTrack', 'How to register, why residents are verified at the Barangay Hall, and quick answers for residents, barangay staff and partner agencies.'],
                'legal/privacy' => ['Privacy Notice | resiTrack', 'How resiTrack collects, uses and protects resident information.'],
                'legal/terms' => ['Terms of Use | resiTrack', 'The terms for using resiTrack as a resident, barangay staff member or partner agency.'],
            ];
            $public = $publicPages[$page['component']] ?? null;
            $metaTitle = $public[0] ?? config('app.name', 'resiTrack');
            $metaDescription = $public[1] ?? 'resiTrack, a resident profiling and social services system for barangays in Cagayan de Oro City.';
        @endphp
        <meta name="description" content="{{ $metaDescription }}">
        @unless ($public)
            <meta name="robots" content="noindex, nofollow">
        @endunless
        <link rel="canonical" href="{{ url()->current() }}">
        <meta name="theme-color" content="#0b3d91" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#08224f" media="(prefers-color-scheme: dark)">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="resiTrack">
        <meta property="og:locale" content="en_PH">
        <meta property="og:title" content="{{ $metaTitle }}">
        <meta property="og:description" content="{{ $metaDescription }}">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ asset('images/og-image.png') }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="resiTrack: Track today. Brighter tomorrows.">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $metaTitle }}">
        <meta name="twitter:description" content="{{ $metaDescription }}">
        <meta name="twitter:image" content="{{ asset('images/og-image.png') }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Landing intro: decide before first paint whether the splash plays (home page only, once per tab session, never with reduced motion) so there is no flash. --}}
        <script>
            (function() {
                try {
                    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                    if (location.pathname === '/' && !reduce && (!sessionStorage.getItem('intro_seen') || /[?&]intro=1/.test(location.search))) {
                        document.documentElement.classList.add('intro-pending');
                    }
                } catch (e) {}
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #f5f8fc;
            }

            html.dark {
                background-color: #0a1120;
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $metaTitle }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>

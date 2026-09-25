<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * robots.txt and sitemap.xml, built per request so the URLs follow APP_URL
 * on every environment (a static file would hard-code one domain). Only the
 * public pages are listed; everything behind a login carries a noindex tag.
 */
class SeoController extends Controller
{
    private const PUBLIC_PATHS = ['/', '/programs', '/faq', '/privacy', '/terms'];

    public function robots(): Response
    {
        return response("User-agent: *\nDisallow:\n\nSitemap: ".url('sitemap.xml')."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $urls = collect(self::PUBLIC_PATHS)
            ->map(fn (string $path) => '    <url><loc>'.e(url($path)).'</loc></url>')
            ->implode("\n");

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{$urls}\n</urlset>\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}

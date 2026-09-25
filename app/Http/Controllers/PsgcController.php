<?php

namespace App\Http\Controllers;

use App\Models\PsgcLocation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * Read-only lookups that feed the cascading address pickers. The lists are
 * static reference data, so browsers may keep them for a day.
 */
class PsgcController extends Controller
{
    public function regions(): JsonResponse
    {
        return $this->respond(PsgcLocation::query()->where('level', PsgcLocation::REGION)->orderBy('code'));
    }

    /**
     * What sits directly under a place: provinces and independent cities under
     * a region, cities and municipalities under a province, barangays under a
     * city. Each item carries its level so the picker can tell them apart.
     */
    public function children(string $code): JsonResponse
    {
        abort_unless(preg_match('/^[0-9]{9}$/', $code) === 1, 404);

        return $this->respond(PsgcLocation::query()->where('parent_code', $code)->orderBy('name'));
    }

    /**
     * @param  Builder<PsgcLocation>  $query
     */
    private function respond($query): JsonResponse
    {
        return response()
            ->json($query->get(['code', 'name', 'level']))
            ->header('Cache-Control', 'private, max-age=86400');
    }
}

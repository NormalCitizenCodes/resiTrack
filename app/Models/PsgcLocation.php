<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One place in the PSA's Philippine Standard Geographic Code.
 *
 * @property string $code
 * @property string $name
 * @property string $level r = region, p = province, c = city or municipality, b = barangay
 * @property string|null $parent_code
 */
class PsgcLocation extends Model
{
    public const REGION = 'r';

    public const PROVINCE = 'p';

    public const CITY = 'c';

    public const BARANGAY = 'b';

    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $fillable = ['code', 'name', 'level', 'parent_code'];
}

<?php

namespace App\Console\Commands;

use App\Services\PregnancyStatus;
use Illuminate\Console\Command;

class ExpirePregnancies extends Command
{
    protected $signature = 'sectors:expire-pregnancies';

    protected $description = 'Remove the Pregnant tag from residents whose expected month plus 30 days has passed';

    public function handle(PregnancyStatus $pregnancy): int
    {
        $removed = $pregnancy->expireDue();

        $this->components->info($removed === 0 ? 'No pregnancy tags were due to end.' : "Removed {$removed} pregnancy tag(s).");

        return self::SUCCESS;
    }
}

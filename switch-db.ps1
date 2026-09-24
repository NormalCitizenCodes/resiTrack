<#
  Swaps the active .env for the saved local (SQLite) or Supabase copy.
  Usage:  .\switch-db.ps1 local
          .\switch-db.ps1 supabase
  Restart `composer run dev` afterwards; Laravel only reads .env at boot.
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('local', 'supabase')]
    [string]$Target
)

$source = ".env.$Target"

if (-not (Test-Path $source)) {
    Write-Error "$source does not exist. Nothing switched."
    exit 1
}

Copy-Item $source ".env" -Force
Write-Host "Switched to $Target. Restart 'composer run dev' for it to take effect." -ForegroundColor Green

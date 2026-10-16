<#
.SYNOPSIS
  Automated PowerShell E2E Test Suite Runner for NOVA 1.0

.DESCRIPTION
  Runs the comprehensive 4-tier E2E test suite covering Requirements R1 through R9.
  Returns Exit Code 0 on clean pass, Non-zero on any failure.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tests/e2e/run_tests.ps1
  powershell -ExecutionPolicy Bypass -File tests/e2e/run_tests.ps1 -Tier 1
#>

param (
  [ValidateSet('1', '2', '3', '4', 'all')]
  [string]$Tier = 'all'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "../..")

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "              NOVA 1.0 E2E AUTOMATED TEST RUNNER (PowerShell)                   " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Project Root : $ProjectRoot"
Write-Host "Tier Filter  : $Tier"
Write-Host "Timestamp    : $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
Write-Host "--------------------------------------------------------------------------------"

$RunnerScript = Join-Path $ProjectRoot "tests/e2e/runner.mjs"

$NodeArgs = @($RunnerScript)
if ($Tier -ne 'all') {
  $NodeArgs += "--tier=$Tier"
}

try {
  & node @NodeArgs
  $RunnerExitCode = $LASTEXITCODE

  if ($RunnerExitCode -eq 0) {
    Write-Host "`n[SUCCESS] All E2E test assertions passed successfully." -ForegroundColor Green
    exit 0
  } else {
    Write-Host "`n[FAILURE] E2E test runner reported failure (Exit code: $RunnerExitCode)." -ForegroundColor Red
    exit $RunnerExitCode
  }
} catch {
  Write-Host "`n[ERROR] An exception occurred while executing tests: $_" -ForegroundColor Red
  exit 2
}

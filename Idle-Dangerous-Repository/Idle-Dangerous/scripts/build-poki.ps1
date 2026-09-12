param([switch]$SkipPackage)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$nodeExecutable = & (Join-Path $PSScriptRoot "find-node.ps1")
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$tscScript = Join-Path $projectRoot "node_modules\typescript\bin\tsc"

if (-not (Test-Path -LiteralPath $viteScript) -or -not (Test-Path -LiteralPath $tscScript)) {
    throw "Project dependencies were not found. Run npm install first."
}

Set-Location -LiteralPath $projectRoot
$previousGamePush = $env:VITE_GAMEPUSH_ENABLED
$previousPlatform = $env:VITE_PLATFORM
$env:VITE_GAMEPUSH_ENABLED = "false"
$env:VITE_PLATFORM = "poki"

try {
    & $nodeExecutable $tscScript --noEmit
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $nodeExecutable $viteScript build --mode poki
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & (Join-Path $PSScriptRoot "verify-poki-build.ps1")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if (-not $SkipPackage) {
        & (Join-Path $PSScriptRoot "package-poki.ps1")
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
finally {
    $env:VITE_GAMEPUSH_ENABLED = $previousGamePush
    $env:VITE_PLATFORM = $previousPlatform
}

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = & (Join-Path $PSScriptRoot "find-node.ps1")
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$tscScript = Join-Path $projectRoot "node_modules\typescript\bin\tsc"
$testScripts = @(
    (Join-Path $projectRoot "tests\static-build.test.mjs"),
    (Join-Path $projectRoot "tests\progression.test.mjs"),
    (Join-Path $projectRoot "tests\point-run.test.mjs"),
    (Join-Path $projectRoot "tests\boss-flow.test.mjs"),
    (Join-Path $projectRoot "tests\coin-economy.test.mjs"),
    (Join-Path $projectRoot "tests\weapon-arsenal.test.mjs")
)
$packageScript = Join-Path $PSScriptRoot "package-gamepush.ps1"

if (-not (Test-Path -LiteralPath $viteScript)) {
    throw "Project dependencies were not found. Run npm install once."
}

Set-Location -LiteralPath $projectRoot

& $nodeExecutable $tscScript --noEmit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $nodeExecutable $viteScript build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $nodeExecutable --experimental-strip-types --test $testScripts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $packageScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Ready: release\mage-cleanse-gamepush.zip"

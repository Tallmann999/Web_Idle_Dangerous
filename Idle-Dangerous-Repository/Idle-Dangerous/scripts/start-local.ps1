$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = & (Join-Path $PSScriptRoot "find-node.ps1")
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"

if (-not (Test-Path -LiteralPath $viteScript)) {
    throw "Project dependencies were not found. Run npm install once."
}

Set-Location -LiteralPath $projectRoot
Write-Host "Game URL: http://127.0.0.1:5173/"
Write-Host "Press Ctrl+C or close this window to stop the game."
& $nodeExecutable $viteScript --host 127.0.0.1 --port 5173 --strictPort
exit $LASTEXITCODE

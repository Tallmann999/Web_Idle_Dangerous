$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = & (Join-Path $PSScriptRoot "find-node.ps1")
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
if (-not (Test-Path -LiteralPath $viteScript)) { throw "Run npm ci to install dependencies." }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "dist\index.html"))) { throw "Run npm run build first." }
Set-Location -LiteralPath $projectRoot
Write-Host "Game URL: http://127.0.0.1:4173/"
& $nodeExecutable $viteScript preview --host 127.0.0.1 --port 4173 --strictPort
exit $LASTEXITCODE

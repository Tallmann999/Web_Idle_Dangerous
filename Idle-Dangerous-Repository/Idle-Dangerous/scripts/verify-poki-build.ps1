$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$distPath = Join-Path $projectRoot "dist"
$indexPath = Join-Path $distPath "index.html"

if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "dist/index.html is missing. Run the Poki build first."
}

$index = Get-Content -LiteralPath $indexPath -Raw
$sdkUrl = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js"
$sdkCount = ([regex]::Matches($index, [regex]::Escape($sdkUrl))).Count
if ($sdkCount -ne 1) {
    throw "Expected exactly one official Poki SDK script, found $sdkCount."
}

$blockedDomainPattern = 'gs\.eponesh\.com|s3(-eu)?\.gamepush\.com|gamepush\.com/sdk|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com'
$blockedReferences = Get-ChildItem -LiteralPath $distPath -File -Recurse |
    Where-Object { $_.Extension -in @(".html", ".js", ".css", ".json") } |
    Select-String -Pattern $blockedDomainPattern
if ($blockedReferences) {
    throw "Blocked external reference found in the Poki build: $($blockedReferences[0].Path)"
}

$forbiddenFiles = Get-ChildItem -LiteralPath $distPath -File -Recurse |
    Where-Object { $_.Extension -in @(".map", ".psd", ".psb", ".xcf", ".blend", ".bak", ".tmp") }
if ($forbiddenFiles) {
    throw "Development file found in the Poki build: $($forbiddenFiles[0].FullName)"
}

$absoluteEntry = [regex]::Match($index, '(?:src|href)="/(?!/)')
if ($absoluteEntry.Success) {
    throw "Root-absolute entry URL found; Poki build entries must remain relative."
}

$files = Get-ChildItem -LiteralPath $distPath -File -Recurse
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host "Poki build verification: PASS"
Write-Host "Official SDK references: $sdkCount"
Write-Host "Files: $($files.Count)"
Write-Host ("Size: {0:N2} MiB ({1} bytes)" -f ($totalBytes / 1MB), $totalBytes)

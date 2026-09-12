param([string]$BuildLabel)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$distPath = Join-Path $projectRoot "dist"
$indexPath = Join-Path $distPath "index.html"
$releasePath = Join-Path $projectRoot "Poki production build"
$packageJsonPath = Join-Path $projectRoot "package.json"

if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "dist/index.html was not found. Run the Poki build first."
}

if ([string]::IsNullOrWhiteSpace($BuildLabel)) {
    $version = (Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json).version
    $BuildLabel = "v$version-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}

$safeLabel = $BuildLabel -replace '[^0-9A-Za-z._-]', '-'
if ([string]::IsNullOrWhiteSpace($safeLabel)) {
    throw "BuildLabel must contain at least one filename-safe character."
}

if (-not (Test-Path -LiteralPath $releasePath)) {
    New-Item -ItemType Directory -Path $releasePath | Out-Null
}

$archivePath = Join-Path $releasePath "Clicker-Weapon-Adventure-Poki-$safeLabel.zip"
if (Test-Path -LiteralPath $archivePath) {
    throw "A Poki release with this label already exists: $archivePath"
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $archivePath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    if ($entryNames -notcontains "index.html") {
        throw "The Poki archive is invalid: index.html is not at the ZIP root."
    }
    if ($entryNames | Where-Object { $_ -like "dist/*" }) {
        throw "The Poki archive is invalid: dist must not be a parent folder."
    }
}
finally {
    $archive.Dispose()
}

$archiveFile = Get-Item -LiteralPath $archivePath
$archiveHash = Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
Write-Host "Poki archive: $archivePath"
Write-Host ("Size: {0:N2} MiB" -f ($archiveFile.Length / 1MB))
Write-Host "SHA256: $($archiveHash.Hash)"

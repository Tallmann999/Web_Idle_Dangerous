$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist"
$indexPath = Join-Path $distPath "index.html"
$releasePath = Join-Path $projectRoot "release"
$archivePath = Join-Path $releasePath "mage-cleanse-gamepush.zip"

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "dist/index.html was not found. Run the production build first."
}

if (-not (Test-Path -LiteralPath $releasePath)) {
  New-Item -ItemType Directory -Path $releasePath | Out-Null
}

if (Test-Path -LiteralPath $archivePath) {
  Remove-Item -LiteralPath $archivePath
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $archivePath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $rootIndex = $archive.Entries | Where-Object { $_.FullName -eq "index.html" }
  if (-not $rootIndex) {
    throw "The archive is invalid: index.html is not at the ZIP root."
  }
}
finally {
  $archive.Dispose()
}

Write-Output "GamePush archive: $archivePath"

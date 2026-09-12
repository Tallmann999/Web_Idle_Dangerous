$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand -and $nodeCommand.Source) {
    return $nodeCommand.Source
}

$userProfilePath = [Environment]::GetFolderPath("UserProfile")
$profileFolders = @($userProfilePath)
$profileFolders += Get-ChildItem -LiteralPath "C:\Users" -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }

foreach ($profileFolder in $profileFolders) {
    $candidateNode = Join-Path $profileFolder ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    if (Test-Path -LiteralPath $candidateNode) {
        return $candidateNode
    }
}

throw "Node.js was not found. Install Node.js 22+ from https://nodejs.org/ and try again."


$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$gameNode = $null
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeVersion = & $nodeCommand.Source --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $nodeVersion -match '^v(\d+)\.') {
        if ([int]$Matches[1] -ge 22) { $gameNode = $nodeCommand.Source }
    }
}
if (-not $gameNode) {
    $bundledGameNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundledGameNode) { $gameNode = $bundledGameNode }
}
if (-not $gameNode) { throw 'Please install Node.js 22 or later, then run this script again.' }
& $gameNode (Join-Path $projectDirectory 'scripts\server.mjs')

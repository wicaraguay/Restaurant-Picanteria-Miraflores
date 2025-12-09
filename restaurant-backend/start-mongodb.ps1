# MongoDB Startup Script
# This script attempts to start MongoDB if it's installed

Write-Host "Searching for MongoDB installation..." -ForegroundColor Cyan

# Common MongoDB installation paths
$possiblePaths = @(
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe",
    "$env:USERPROFILE\mongodb\bin\mongod.exe"
)

$mongodPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $mongodPath = $path
        Write-Host "Found MongoDB at: $path" -ForegroundColor Green
        break
    }
}

if (-not $mongodPath) {
    Write-Host "MongoDB Server not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "MongoDB Compass is installed, but you need MongoDB Server." -ForegroundColor Yellow
    Write-Host "Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

# Create data directory if it doesn't exist
$dataDir = "$PSScriptRoot\mongodb-data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Host "Created data directory: $dataDir" -ForegroundColor Green
}

Write-Host "Starting MongoDB..." -ForegroundColor Cyan
Write-Host "Data directory: $dataDir" -ForegroundColor Gray
Write-Host "Connection URI: mongodb://127.0.0.1:27017/restaurant-pm" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop MongoDB" -ForegroundColor Yellow
Write-Host ""

# Start MongoDB
& $mongodPath --dbpath $dataDir --port 27017

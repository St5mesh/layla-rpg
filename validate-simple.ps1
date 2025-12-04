# Simple Environment Validation for Layla RPG
Write-Host "Validating environment..." -ForegroundColor Cyan

$valid = $true

# Check Node.js
try {
    $nodeVer = node --version 2>$null
    if ($nodeVer) {
        Write-Host "Node.js: $nodeVer - OK" -ForegroundColor Green
    } else {
        Write-Host "Node.js: Not found" -ForegroundColor Red
        $valid = $false
    }
} catch {
    Write-Host "Node.js: Not accessible" -ForegroundColor Red
    $valid = $false
}

# Check npm
try {
    $npmVer = npm --version 2>$null
    if ($npmVer) {
        Write-Host "npm: v$npmVer - OK" -ForegroundColor Green
    } else {
        Write-Host "npm: Not found" -ForegroundColor Red
        $valid = $false
    }
} catch {
    Write-Host "npm: Not accessible" -ForegroundColor Red
    $valid = $false
}

# Check project files
$files = @("package.json", "src/rpgEngine.ts", "src/apiServer.ts")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "$file - OK" -ForegroundColor Green
    } else {
        Write-Host "$file - Missing" -ForegroundColor Red
        $valid = $false
    }
}

# Test build
Write-Host "Testing build..." -NoNewline
try {
    npm run build >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " Failed" -ForegroundColor Red
        $valid = $false
    }
} catch {
    Write-Host " Error" -ForegroundColor Red
    $valid = $false
}

if ($valid) {
    Write-Host "Environment is ready!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Please fix issues above" -ForegroundColor Red
    exit 1
}
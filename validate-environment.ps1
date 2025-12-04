# Environment Validation Script
# Validates that the Layla RPG development environment is properly configured

Write-Host "🔍 Validating Layla RPG development environment..." -ForegroundColor Cyan
Write-Host ""

$validationPassed = $true
$warnings = @()

# ==================== ENVIRONMENT CHECKS ====================

Write-Host "📋 Environment Validation" -ForegroundColor Blue
Write-Host "=========================" -ForegroundColor Blue

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host " ✅ Found: $nodeVersion" -ForegroundColor Green
        
        # Validate Node.js version (should be v18+)
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 18) {
            $warnings += "Node.js version $nodeVersion is below recommended v18+"
        }
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $validationPassed = $false
    }
} catch {
    Write-Host " ❌ Not accessible" -ForegroundColor Red
    $validationPassed = $false
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host " ✅ Found: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $validationPassed = $false
    }
} catch {
    Write-Host " ❌ Not accessible" -ForegroundColor Red
    $validationPassed = $false
}

# Check TypeScript
Write-Host "Checking TypeScript..." -NoNewline
try {
    $tscVersion = npx tsc --version 2>$null
    if ($tscVersion) {
        Write-Host " ✅ Found: $tscVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $validationPassed = $false
    }
} catch {
    Write-Host " ❌ Not accessible" -ForegroundColor Red
    $validationPassed = $false
}

Write-Host ""

# ==================== PROJECT STRUCTURE CHECKS ====================

Write-Host "📁 Project Structure" -ForegroundColor Blue
Write-Host "===================" -ForegroundColor Blue

$requiredFiles = @(
    "package.json",
    "tsconfig.json", 
    "src/rpgEngine.ts",
    "src/apiServer.ts",
    "config/layla-rpg-agent.json",
    "tests/rpgEngine.test.ts"
)

$requiredDirs = @(
    "src",
    "tests", 
    "config",
    "node_modules"
)

# Check required files
foreach ($file in $requiredFiles) {
    Write-Host "Checking $file..." -NoNewline
    if (Test-Path $file) {
        Write-Host " ✅ Found" -ForegroundColor Green
    } else {
        Write-Host " ❌ Missing" -ForegroundColor Red
        $validationPassed = $false
    }
}

# Check required directories
foreach ($dir in $requiredDirs) {
    Write-Host "Checking $dir/..." -NoNewline
    if (Test-Path $dir -PathType Container) {
        Write-Host " ✅ Found" -ForegroundColor Green
    } else {
        Write-Host " ❌ Missing" -ForegroundColor Red
        if ($dir -eq "node_modules") {
            $warnings += "Run 'npm install' to install dependencies"
        } else {
            $validationPassed = $false
        }
    }
}

Write-Host ""

# ==================== BUILD VALIDATION ====================

Write-Host "🔨 Build System" -ForegroundColor Blue
Write-Host "===============" -ForegroundColor Blue

Write-Host "Testing TypeScript compilation..." -NoNewline
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ Success" -ForegroundColor Green
    } else {
        Write-Host " ❌ Failed" -ForegroundColor Red
        $validationPassed = $false
        Write-Host "Build output:" -ForegroundColor Yellow
        Write-Host $buildOutput -ForegroundColor Gray
    }
} catch {
    Write-Host " ❌ Error" -ForegroundColor Red
    $validationPassed = $false
}

Write-Host ""

# ==================== CORE FUNCTIONALITY TESTS ====================

Write-Host "🧪 Core Functionality" -ForegroundColor Blue
Write-Host "====================" -ForegroundColor Blue

Write-Host "Testing core RPG engine..." -NoNewline
try {
    $testOutput = npm run test:unit 2>&1
    if ($LASTEXITCODE -eq 0 -and $testOutput -match "Tests:.*passed") {
        Write-Host " ✅ All core tests pass" -ForegroundColor Green
    } else {
        Write-Host " ⚠ Some tests may need attention" -ForegroundColor Yellow
        $warnings += "Check test output for details"
    }
} catch {
    Write-Host " ❌ Error running tests" -ForegroundColor Red
    $validationPassed = $false
}

Write-Host ""

# ==================== RESULTS ====================

Write-Host "📊 Validation Results" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue

if ($validationPassed) {
    Write-Host "🎉 Environment validation PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your development environment is properly configured for Layla RPG development." -ForegroundColor Green
    
    # Show available commands
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Cyan
    Write-Host "  npm start          - Start development server" -ForegroundColor Gray
    Write-Host "  npm test           - Run all tests" -ForegroundColor Gray
    Write-Host "  npm run test:unit  - Run unit tests only" -ForegroundColor Gray
    Write-Host "  npm run build      - Compile TypeScript" -ForegroundColor Gray
    Write-Host "  npm run simulate   - Test without Layla" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Environment validation FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before proceeding with development." -ForegroundColor Red
    Write-Host "For help, see: docs/environment-setup.md" -ForegroundColor Yellow
}

# Show warnings if any
if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   $($warning)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Return appropriate exit code
if ($validationPassed) {
    exit 0
} else {
    exit 1
}
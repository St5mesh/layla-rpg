# Environment Setup Script for Layla RPG
# This script ensures Node.js and npm are properly configured for development

Write-Host "🔧 Setting up Layla RPG development environment..." -ForegroundColor Green

# Check if Node.js is installed
$nodeExePath = "C:\Program Files\nodejs\node.exe"
$nodePath = "C:\Program Files\nodejs"

if (Test-Path $nodeExePath) {
    Write-Host "✅ Node.js found at: $nodeExePath" -ForegroundColor Green
    
    # Get Node.js version
    $nodeVersion = & $nodeExePath --version
    Write-Host "📦 Node.js version: $nodeVersion" -ForegroundColor Blue
    
    # Check if Node.js path is in current session PATH
    if ($env:PATH -split ';' -notcontains $nodePath) {
        Write-Host "⚠️  Adding Node.js to PATH for current session..." -ForegroundColor Yellow
        $env:PATH = "$nodePath;" + $env:PATH
        Write-Host "✅ Node.js added to PATH for current PowerShell session" -ForegroundColor Green
    } else {
        Write-Host "✅ Node.js already in PATH" -ForegroundColor Green
    }
    
    # Test npm availability
    try {
        $npmVersion = npm --version
        Write-Host "📦 npm version: $npmVersion" -ForegroundColor Blue
    } catch {
        Write-Host "❌ npm not accessible. Check Node.js installation." -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "❌ Node.js not found at expected location: $nodeExePath" -ForegroundColor Red
    Write-Host "💡 Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the correct directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking project dependencies..." -ForegroundColor Blue

# Install dependencies if node_modules doesn't exist or is outdated
if (!(Test-Path "node_modules") -or !(Test-Path "node_modules/.package-lock.json")) {
    Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Verify build tools work
Write-Host "🔨 Verifying TypeScript compilation..." -ForegroundColor Blue
npm run build > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "⚠️  TypeScript compilation had issues. Check build output." -ForegroundColor Yellow
    npm run build
}

Write-Host ""
Write-Host "🎯 Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  npm start          - Start the development server" -ForegroundColor Gray
Write-Host "  npm test           - Run all tests" -ForegroundColor Gray  
Write-Host "  npm run test:unit  - Run unit tests only" -ForegroundColor Gray
Write-Host "  npm run build      - Compile TypeScript" -ForegroundColor Gray
Write-Host "  npm run simulate   - Test without Layla integration" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Note: Node.js has been added to PATH for this PowerShell session only." -ForegroundColor Yellow
Write-Host "   For permanent PATH configuration, see: docs/environment-setup.md" -ForegroundColor Yellow
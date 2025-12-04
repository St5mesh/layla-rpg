# Environment Setup Guide for Layla RPG

## Overview
This guide helps you set up the development environment for the Layla RPG engine, ensuring Node.js, npm, and all dependencies are properly configured.

## Prerequisites
- **Node.js v18+** (currently tested with v25.2.1)
- **npm v9+** (currently tested with v11.6.2)  
- **PowerShell 5+** (for Windows development)
- **Git** (for version control)

## Quick Setup

### Option 1: Automated Setup (Recommended)
Run the automated setup script from the project root:

```powershell
# From the layla-rpg directory
.\setup-environment.ps1
```

This script will:
- ✅ Detect Node.js installation
- ✅ Add Node.js to PATH for the current session
- ✅ Install npm dependencies
- ✅ Verify TypeScript compilation
- ✅ Display available npm commands

### Option 2: Manual Setup

#### 1. Install Node.js (if not installed)
Download and install from: https://nodejs.org/
- Choose the LTS version for stability
- The installer should automatically add Node.js to your system PATH

#### 2. Verify Installation
```powershell
node --version  # Should show v18+ 
npm --version   # Should show v9+
```

#### 3. Fix PATH Issues (if commands not found)
If `node` or `npm` commands are not recognized:

```powershell
# Temporary fix (current session only)
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Verify fix
node --version
npm --version
```

#### 4. Install Dependencies
```powershell
cd path\to\layla-rpg
npm install
```

#### 5. Verify Setup
```powershell
npm run build  # Should compile TypeScript successfully
npm test       # Should run test suite
```

## Permanent PATH Configuration

### Windows System PATH (Permanent Fix)
To permanently add Node.js to your system PATH:

1. **Open System Properties**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Or: Control Panel → System → Advanced System Settings

2. **Environment Variables**
   - Click "Environment Variables" button
   - In "System Variables" section, find and select "Path"
   - Click "Edit"

3. **Add Node.js Path**
   - Click "New" 
   - Add: `C:\Program Files\nodejs`
   - Click "OK" on all dialogs

4. **Restart Terminal**
   - Close and reopen PowerShell/Command Prompt
   - Test: `node --version` and `npm --version`

### PowerShell Profile (User-specific)
Alternative approach using PowerShell profile:

```powershell
# Check if profile exists
Test-Path $PROFILE

# Create profile if it doesn't exist  
if (!(Test-Path $PROFILE)) {
    New-Item -Type File -Force $PROFILE
}

# Add Node.js to PATH in profile
Add-Content $PROFILE '$env:PATH = "C:\Program Files\nodejs;" + $env:PATH'

# Reload profile
. $PROFILE
```

## Project Scripts

Once the environment is set up, these npm scripts are available:

```powershell
npm start              # Start development server (ts-node)
npm test               # Run all tests (Jest)
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests only  
npm run test:watch     # Run tests in watch mode
npm run build          # Compile TypeScript to dist/
npm run simulate       # Test game without Layla integration
```

## Common Issues & Solutions

### Issue: "npm is not recognized"
**Cause**: Node.js not in PATH or not installed  
**Solution**: 
1. Verify Node.js installation: Check `C:\Program Files\nodejs\`
2. Add to PATH manually (see above)
3. Restart terminal after PATH changes

### Issue: "Permission denied" during npm install  
**Cause**: Administrative permissions or npm cache issues  
**Solution**:
```powershell
# Clear npm cache
npm cache clean --force

# Run as administrator (if needed)
# Right-click PowerShell → "Run as administrator"
```

### Issue: TypeScript compilation errors
**Cause**: Version mismatch or missing dependencies  
**Solution**:
```powershell
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npx tsc --version  # Should be 5.9.3+
```

### Issue: Test failures after environment setup
**Cause**: Test expectations don't match implementation  
**Solution**: This is expected - the test failures indicate areas where the implementation needs alignment with test expectations. Run the automated setup script and check the test output for specific issues.

## Development Workflow

### Typical Development Session
```powershell
# 1. Setup environment (once per session)
.\setup-environment.ps1

# 2. Start development server
npm start

# 3. Run tests (separate terminal)
npm test

# 4. Build for production
npm run build
```

### Environment Validation
To verify everything is working:

```powershell
# Environment check
.\setup-environment.ps1

# Quick test
npm run build && npm test
```

## IDE Configuration

### VS Code (Recommended)
Ensure these extensions are installed:
- TypeScript and JavaScript Language Features (built-in)
- Jest (for test integration)
- ESLint (for code quality)

The project includes VS Code settings in `.vscode/` for optimal development experience.

## Troubleshooting

If you encounter persistent issues:

1. **Check Node.js installation**:
   - Visit https://nodejs.org/
   - Download and reinstall the LTS version

2. **Clear all caches**:
   ```powershell
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Verify project structure**:
   - Ensure you're in the correct directory (contains `package.json`)
   - Check that `src/`, `tests/`, and `config/` directories exist

4. **Contact support**:
   - Include your `node --version` and `npm --version` output
   - Include any error messages
   - Describe your operating system and environment

## Environment Variables

The following environment variables can be configured:

```powershell
# Auto-save configuration (optional)
$env:AUTO_SAVE_ENABLED = "true"  # Enable auto-save feature
$env:MAX_SAVES = "100"           # Maximum number of save files

# Development settings
$env:NODE_ENV = "development"    # Development mode
$env:PORT = "3000"               # Server port (default: 3000)
```

This completes the environment setup guide for the Layla RPG development environment.
# Quick Start Environment Guide

## 🚀 One-Command Setup

For the fastest setup, run our automated environment configuration:

```powershell
# From the layla-rpg project directory
.\setup-environment.ps1
```

This will:
- ✅ Detect and configure Node.js/npm
- ✅ Install all dependencies
- ✅ Verify TypeScript compilation
- ✅ Run core functionality tests
- ✅ Display available commands

## 🔍 Environment Validation

To check if your environment is properly configured:

```powershell
# Validate everything is working
.\validate-environment.ps1

# Or use npm script
npm run env:validate
```

## 🛠️ Available npm Scripts

```powershell
# Environment management
npm run env:setup      # Run environment setup script
npm run env:validate   # Validate environment configuration

# Development workflow  
npm start              # Start development server (ts-node)
npm test               # Run all tests (with environment validation)
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests only
npm run build          # Compile TypeScript to dist/
npm run simulate       # Test game without Layla integration
```

## ⚠️ Troubleshooting

### "npm is not recognized" or "node is not recognized"
**Solution**: Run the setup script first
```powershell
.\setup-environment.ps1
```

### "Permission denied" errors
**Solution**: Run PowerShell as Administrator or check execution policy
```powershell
# Check execution policy
Get-ExecutionPolicy

# Allow scripts for current user (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Persistent PATH issues
**Solution**: See the complete guide at `docs/environment-setup.md` for permanent PATH configuration.

## 📋 System Requirements

- **Node.js**: v18.0.0 or higher (tested with v25.2.1)
- **npm**: v9.0.0 or higher (tested with v11.6.2)
- **PowerShell**: v5.0 or higher (for Windows)
- **Operating System**: Windows 10/11, macOS, or Linux

## 🔄 Automated Safeguards

The project includes several automated safeguards:

1. **Pre-test validation**: Environment is validated before running tests
2. **Post-install validation**: Environment is checked after installing dependencies
3. **Engine compatibility**: package.json specifies minimum Node.js/npm versions
4. **Comprehensive validation**: Scripts check all critical components

For complete setup instructions and troubleshooting, see `docs/environment-setup.md`.
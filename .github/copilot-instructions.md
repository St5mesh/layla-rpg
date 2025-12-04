# Layla RPG Codebase Instructions

## Architecture Overview

This is a **dual-architecture RPG system** designed for the Layla agent platform (Android app):

- **TypeScript Implementation** (`src/`): Production HTTP server that Layla connects to
- **Python Agents** (`agents/`): Reference modular design for future extensibility
- **Layla Integration** (`config/`): Configuration that maps natural language to API calls

## Core Components

### TypeScript Engine (`src/rpgEngine.ts`)
Pure functional design with immutable state. Key patterns:
- All functions accept `GameState` and return modified state
- Interfaces define strict contracts: `Player`, `Enemy`, `Location`, `CharacterStats`
- Combat uses deterministic damage calculation: `Math.max(1, attack - defense)`
- Location descriptions follow format: name → description → enemies → items → exits

### HTTP API Server (`src/apiServer.ts`)
Express server maintaining in-memory game state. Critical endpoints:
- `GET /describe_location` - Core exploration command
- `POST /attack` - Combat with damage calculation and XP rewards
- `POST /move` - Location validation and state updates
- `GET /get_stats` - Formatted character data

### Layla Configuration (`config/layla-rpg-agent.json`)
Maps natural language patterns to HTTP endpoints:
- `patterns[]` - Exact phrase matching
- `regexPatterns[]` - Flexible command parsing
- `responseField` - Extract specific response data
- `serverBaseUrl` - Must be updated for network play

## Development Workflows

### Testing Strategy
- Unit tests in `tests/rpgEngine.test.ts` cover pure functions only
- Integration testing via `npm run simulate` (bypasses Layla)
- Manual testing: `curl` commands in README match API exactly

### Build & Run Commands
```bash
npm start          # Development server with ts-node
npm test           # Jest unit tests
npm run simulate   # Test without Layla integration
npm run build      # Compile TypeScript to dist/
```

### Game State Management
Game state lives entirely in memory (`apiServer.ts:gameState`). No persistence layer exists - restarting server resets all progress.

## Critical Conventions

### Function Signatures
All rpgEngine functions follow pattern: `(gameState: GameState, ...params) => GameState | result`

### Error Handling
API endpoints wrap engine calls in try/catch, returning `{ success: boolean, error?: string }` format

### TypeScript Strictness
All entities have explicit interfaces - avoid `any` type. Use type guards for user input validation.

### Networking Requirements
For non-localhost play, update `serverBaseUrl` in config AND ensure devices share network access.

## Python Agents (Reference Only)
The `agents/` directory contains a modular design concept but is NOT currently integrated. The GMAgent orchestrates multiple managers (Character, Dice, Progression, etc.) - this represents future extensibility goals.

## Key Files to Understand
- `src/rpgEngine.ts` - Core game logic and type definitions
- `src/apiServer.ts` - HTTP integration layer
- `config/layla-rpg-agent.json` - Natural language command mappings
- `tests/rpgEngine.test.ts` - Examples of proper function usage
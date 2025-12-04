# Layla RPG Engine

A modular, extensible RPG engine designed for integration with the Layla agent platform (Android app). This project enables Layla to trigger external RPG gameplay logic via HTTP endpoints, creating an immersive text-based adventure experience.

## What is This?

This is a **text-based RPG game** that you can play through the Layla Android app. Simply import the agent configuration into Layla, and you can:

- Explore a fantasy world with multiple locations
- Fight monsters and gain experience
- Track your character's stats and inventory
- All through natural language commands!

## Quick Start

### Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository** (or download and extract the ZIP):
   ```bash
   git clone https://github.com/St5mesh/layla-rpg.git
   cd layla-rpg
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

   You should see:
   ```
   ==================================================
   Layla RPG Server Started!
   ==================================================
   Running at: http://localhost:3000
   ```

4. **Test the server** (optional):
   Open a new terminal and run:
   ```bash
   npm test
   ```

### Connecting Layla

1. Make sure your phone and computer are on the **same WiFi network**
2. Find your computer's IP address (e.g., `192.168.1.100`)
3. Open `config/layla-rpg-agent.json`
4. Change `"serverBaseUrl": "http://localhost:3000"` to `"serverBaseUrl": "http://YOUR_IP:3000"`
5. Import the config file into Layla (instructions in Layla's documentation)

## How to Play

### Available Commands

| Command | What it does |
|---------|--------------|
| `look around` | See your current location |
| `go to [place]` | Travel to another location |
| `check stats` | View your character's stats |
| `check inventory` | See what items you have |
| `scan` | Check for enemies nearby |
| `attack [enemy]` | Fight an enemy |
| `new game` | Start a fresh adventure |
| `help` | Show all commands |

### Example Game Session

```
You: "look around"
> The Rusty Dragon Tavern
> You stand in a cozy tavern filled with the smell of ale...
> Exits: town_square, cellar

You: "go to cellar"
> You travel to Tavern Cellar.
> Tavern Cellar
> A dark, musty cellar beneath the tavern...
> Enemies here: Giant Rat

You: "attack giant rat"
> You attack Giant Rat and deal 8 damage!
> Giant Rat has 7 health remaining.
> Giant Rat strikes back and deals 2 damage to you!

You: "attack giant rat"
> You attack Giant Rat and deal 9 damage!
> Victory! You have defeated Giant Rat!
> You gained 10 experience points!
```

## Project Structure

```
layla-rpg/
├── src/
│   ├── rpgEngine.ts      # Core game logic (stats, combat, locations)
│   └── apiServer.ts      # HTTP server that Layla connects to
├── config/
│   └── layla-rpg-agent.json  # Layla agent configuration
├── tests/
│   └── rpgEngine.test.ts     # Unit tests for game logic
├── examples/
│   └── simulateLaylaRequest.ts  # Script to test without Layla
├── agents/                # Python agents (for reference)
├── docs/                  # Additional documentation
├── data/                  # Sample game data
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # You are here!
```

## API Reference

The server exposes these HTTP endpoints:

### GET `/health`
Check if the server is running.
```bash
curl http://localhost:3000/health
```

### GET `/describe_location`
Get the description of the current (or specified) location.
```bash
curl http://localhost:3000/describe_location
curl "http://localhost:3000/describe_location?location=tavern"
```

### GET `/get_stats`
Get the player's current statistics.
```bash
curl http://localhost:3000/get_stats
```

### GET `/inventory`
Get the player's inventory.
```bash
curl http://localhost:3000/inventory
```

### GET `/enemies`
List enemies at the current location.
```bash
curl http://localhost:3000/enemies
```

### POST `/attack`
Attack an enemy.
```bash
curl -X POST http://localhost:3000/attack \
  -H "Content-Type: application/json" \
  -d '{"target": "Giant Rat"}'
```

### POST `/move`
Move to a different location.
```bash
curl -X POST http://localhost:3000/move \
  -H "Content-Type: application/json" \
  -d '{"location": "cellar"}'
```

### POST `/new_game`
Start a new game.
```bash
curl -X POST http://localhost:3000/new_game \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Hero"}'
```

## Testing

### Run Unit Tests
```bash
npm test
```

### Run Simulation Script
This simulates what Layla would do when you give commands:
```bash
# First, start the server in one terminal:
npm start

# Then, in another terminal, run the simulation:
npm run simulate
```

## Game World

The default game includes these locations:

| Location | Description | Enemies |
|----------|-------------|---------|
| **Rusty Dragon Tavern** | Starting location, cozy inn | None |
| **Town Square** | Central market area | None |
| **The Iron Forge** | Blacksmith shop | None |
| **Tavern Cellar** | Dark basement | Giant Rat |
| **Forest Entrance** | Edge of the woods | Goblin Scout |
| **Deep Forest** | Dangerous woodland | Shadow Wolf, Goblin Warrior |

## Development

### Building
```bash
npm run build
```

### Running in Development
```bash
npm start
```

### TypeScript Types
All game entities have explicit TypeScript interfaces:
- `Player` - Player character data
- `Enemy` - Enemy/NPC data
- `Location` - Game locations
- `GameState` - Complete game state
- `CharacterStats` - Stats for any character
- `AttackResult` - Combat outcome

## Layla Agent Configuration

The `config/layla-rpg-agent.json` file defines how Layla interprets your commands:

- **patterns**: Exact phrases that trigger the action
- **regexPatterns**: Flexible patterns that can capture variables
- **endpoint**: The API endpoint to call
- **responseField**: Which part of the response to show

You can customize these patterns to match your preferred command style!

## Architecture

### TypeScript Implementation (MVP)

The main integration uses TypeScript for:
- Type safety and better developer experience
- Easy HTTP server setup with Express
- Clear interfaces for all game entities

### Python Agents (Reference)

The `agents/` folder contains Python-based agent implementations for reference:
- `CharacterManager` - Heroes/NPCs management
- `DiceManager` - Randomness and skill checks
- `ProgressionManager` - XP and leveling
- `InventoryManager` - Items and transfers
- `LoreManager` - World notes and history
- `WorldStateManager` - Quest and event tracking
- `GMAgent` - Orchestrates gameplay

See [docs/agent_concept.md](docs/agent_concept.md) for design details.

## Contributing

Feel free to:
- Add new locations and enemies
- Create new items and abilities
- Improve the narrative descriptions
- Add new commands and features

## License

ISC License - see LICENSE file for details.

---

### Why Layla?

- **Local and Private**: All gameplay runs on your device/network
- **Extensible**: Easy to add new content or features
- **Natural Language**: Play the game by just talking!

For more technical details, see the [docs/](docs/) folder.

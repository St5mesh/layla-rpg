# Layla RPG Engine

This project implements a modular, extensible, and immersive tabletop RPG engine designed for the Layla agent platform. The goal: deliver an interactive, GM-driven adventure experience—complete with persistent characters, dice rolls, world state, and more—leveraging Layla's on-device agent and MCP capabilities.

## Overview

- **Game Master feels like a real tabletop GM:**  
  Players interact with a single friendly GM agent, who remembers the party, world, and ongoing events, responding dynamically.
- **Behind the scenes are “managers” (agents):**  
  - `CharacterManager` (heroes/NPCs)
  - `DiceManager` (randomness, rolls, skill checks)
  - `ProgressionManager` (stats, XP, leveling)
  - `InventoryManager` (items, inventory, transfers)
  - `LoreManager` (world notes, history, recaps)
  - `WorldStateManager` (state of locations, ongoing quests, story events)
  - `GMAgent` (orchestrates gameplay and narrative, interfaces with player)
- **Modular, testable, and designed for extension.**

## Repository Structure

```
agents/                   # Core agent scripts
data/                     # Example data for characters, world, etc.
docs/                     # Documentation and implementation plan
tests/                    # Unit and integration tests
README.md                 # You are here :)
requirements.txt          # Project dependencies
```

### Example: Gameplay Turn

1. GM receives action:  
   *"We open the door and check for traps."*
2. GM queries CharacterManager for party details
3. GM asks WorldStateManager if the trap is armed
4. GM calls DiceManager for a trap spot check
5. Based on result, GM narrates the outcome, updates WorldState and Lore, and notifies the player

## Implementation Plan

See [docs/implementation_plan.md](docs/implementation_plan.md) for a stepwise approach and checklist.

---

### Why Layla?

- **Local, private, and extensible:** All code runs on-device via Layla agents
- **Agent modularity:** Easy to expand features or swap models/backends
- **Repeatable, tabletop-style experience, anywhere**

For details on agent design and function interfaces, see [docs/agent_concept.md](docs/agent_concept.md).

---

*This project is inspired by AIDungeon/ST5mesh but is rebuilt to take full advantage of Layla’s agent and MCP features.*
# Agent Concept Design

## Agents and Their Responsibilities

### CharacterManager
- Tracks all player and NPC stats, traits, inventories
- APIs: add_character, update_character, get_character, describe_party

### DiceManager
- Provides random rolls, skill checks, result narration
- APIs: roll_dice, skill_check, show_roll

### ProgressionManager
- Handles XP, levels, ability progression
- APIs: add_xp, level_up, get_progression

### InventoryManager
- Tracks items, transfers, party/character bags
- APIs: add_item, remove_item, transfer_item, list_inventory

### LoreManager
- Stores snippets, recaps, lore entries, world encyclopedia
- APIs: add_lore, get_lore, query_lore

### WorldStateManager
- Tracks evolving world locations, quest status, timeline/tags
- APIs: update_state, get_state, event_log

### GMAgent
- Receives player input, parses intent, delegates to agents, returns narrative
- API: orchestrate_turn(action, party, world, dice...)

---

All agents use a defined schema for internal communication based on Layla’s MCP specification.
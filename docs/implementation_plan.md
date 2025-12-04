# Implementation Plan

A checklist for building the Layla Modular RPG Engine.

## Phase 1: Foundation

- [x] Set up repository & directory structure
- [ ] Create agent base classes and a generic agent framework compatible with Layla MCP
- [ ] Implement CharacterManager
  - [ ] Add, update, retrieve character/NPC data and inventories
- [ ] Implement DiceManager
  - [ ] Expose dice and skill check APIs
- [ ] Implement basic GM agent to route between above and return narrative responses

## Phase 2: Core Features

- [ ] ProgressionManager (XP, levels, skill unlocks)
- [ ] InventoryManager (add, remove, transfer, list items)
- [ ] LoreManager (notes, world encyclopedia)
- [ ] WorldStateManager (track story, events, quest status)

## Phase 3: Orchestration

- [ ] Expand GMAgent for robust action parsing, context handling, and function/agent calling
- [ ] Improve narrative prompt construction using real-time state from all managers

## Phase 4: Testing & Polish

- [ ] Add test cases for each manager agent and the GM agent
- [ ] Playtest scenarios & adjust interfaces for UX
- [ ] Documentation: finish agent_concept.md and prompt_examples.md

## Phase 5: Extension

- [ ] Support multiple campaigns or save slots
- [ ] Allow theme/content packs via agent/plugin system

---

*See agent_concept.md for technical design of each agent/manager.*
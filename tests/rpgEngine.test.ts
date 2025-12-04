/**
 * rpgEngine.test.ts - Unit Tests for the RPG Engine
 * 
 * These tests verify that all RPG engine functions work correctly.
 * Run tests with: npm test
 */

import {
  GameState,
  Player,
  CharacterStats,
  createDefaultPlayerStats,
  createPlayer,
  createDefaultGameState,
  describeLocation,
  moveToLocation,
  getStats,
  getPlayerData,
  attack,
  applyAttackResult,
  calculateDamage
} from '../src/rpgEngine';

// ==================== TEST UTILITIES ====================

/**
 * Creates a minimal game state for testing specific scenarios.
 */
function createTestGameState(): GameState {
  return {
    player: {
      id: 'test_player',
      name: 'Tester',
      stats: {
        health: 100,
        maxHealth: 100,
        attack: 10,
        defense: 5,
        level: 1,
        experience: 0
      },
      currentLocation: 'test_room',
      inventory: ['sword', 'potion']
    },
    locations: {
      test_room: {
        id: 'test_room',
        name: 'Test Room',
        description: 'A simple room for testing.',
        exits: ['hallway'],
        enemies: [
          {
            id: 'test_enemy',
            name: 'Test Goblin',
            description: 'A goblin for testing',
            stats: { health: 20, maxHealth: 20, attack: 5, defense: 2, level: 1, experience: 0 },
            experienceReward: 10
          }
        ],
        items: ['key']
      },
      hallway: {
        id: 'hallway',
        name: 'Hallway',
        description: 'A long hallway.',
        exits: ['test_room'],
        enemies: [],
        items: []
      }
    }
  };
}

// ==================== PLAYER CREATION TESTS ====================

describe('Player Creation', () => {
  test('createDefaultPlayerStats returns correct default values', () => {
    const stats = createDefaultPlayerStats();
    
    expect(stats.health).toBe(100);
    expect(stats.maxHealth).toBe(100);
    expect(stats.attack).toBe(10);
    expect(stats.defense).toBe(5);
    expect(stats.level).toBe(1);
    expect(stats.experience).toBe(0);
  });

  test('createPlayer creates player with given name', () => {
    const player = createPlayer('TestHero');
    
    expect(player.name).toBe('TestHero');
    expect(player.currentLocation).toBe('tavern'); // default location
    expect(player.inventory).toEqual([]);
    expect(player.id).toContain('player_');
  });

  test('createPlayer allows custom starting location', () => {
    const player = createPlayer('TestHero', 'forest');
    
    expect(player.currentLocation).toBe('forest');
  });
});

// ==================== GAME STATE TESTS ====================

describe('Game State Creation', () => {
  test('createDefaultGameState creates valid game with locations', () => {
    const state = createDefaultGameState('TestHero');
    
    expect(state.player.name).toBe('TestHero');
    expect(state.player.currentLocation).toBe('tavern');
    expect(state.locations).toHaveProperty('tavern');
    expect(state.locations).toHaveProperty('town_square');
    expect(state.locations).toHaveProperty('forest_entrance');
  });

  test('default locations have proper exits', () => {
    const state = createDefaultGameState();
    
    // Tavern should connect to town_square and cellar
    expect(state.locations['tavern'].exits).toContain('town_square');
    expect(state.locations['tavern'].exits).toContain('cellar');
    
    // Town square should connect back to tavern
    expect(state.locations['town_square'].exits).toContain('tavern');
  });

  test('cellar has enemy', () => {
    const state = createDefaultGameState();
    
    expect(state.locations['cellar'].enemies.length).toBeGreaterThan(0);
    expect(state.locations['cellar'].enemies[0].name).toBe('Giant Rat');
  });
});

// ==================== LOCATION DESCRIPTION TESTS ====================

describe('Location Description', () => {
  test('describeLocation returns description for current location', () => {
    const state = createTestGameState();
    const description = describeLocation(state);
    
    expect(description).toContain('Test Room');
    expect(description).toContain('A simple room for testing');
  });

  test('describeLocation shows enemies when present', () => {
    const state = createTestGameState();
    const description = describeLocation(state);
    
    expect(description).toContain('Enemies here');
    expect(description).toContain('Test Goblin');
  });

  test('describeLocation shows items when present', () => {
    const state = createTestGameState();
    const description = describeLocation(state);
    
    expect(description).toContain('Items');
    expect(description).toContain('key');
  });

  test('describeLocation shows exits', () => {
    const state = createTestGameState();
    const description = describeLocation(state);
    
    expect(description).toContain('Exits');
    expect(description).toContain('hallway');
  });

  test('describeLocation with specific locationId', () => {
    const state = createTestGameState();
    const description = describeLocation(state, 'hallway');
    
    expect(description).toContain('Hallway');
  });

  test('describeLocation handles unknown location gracefully', () => {
    const state = createTestGameState();
    const description = describeLocation(state, 'unknown_place');
    
    expect(description).toContain('unknown');
  });
});

// ==================== MOVEMENT TESTS ====================

describe('Movement', () => {
  test('moveToLocation succeeds for valid exit', () => {
    const state = createTestGameState();
    const result = moveToLocation(state, 'hallway');
    
    expect(result.success).toBe(true);
    expect(result.state.player.currentLocation).toBe('hallway');
  });

  test('moveToLocation fails for invalid exit', () => {
    const state = createTestGameState();
    const result = moveToLocation(state, 'nonexistent');
    
    expect(result.success).toBe(false);
    expect(result.state.player.currentLocation).toBe('test_room'); // unchanged
    expect(result.message).toContain("can't go");
  });

  test('moveToLocation returns appropriate message', () => {
    const state = createTestGameState();
    const result = moveToLocation(state, 'hallway');
    
    expect(result.message).toContain('Hallway');
  });
});

// ==================== STATS DISPLAY TESTS ====================

describe('Stats Display', () => {
  test('getStats returns formatted stats string', () => {
    const state = createTestGameState();
    const stats = getStats(state.player);
    
    expect(stats).toContain("Tester's Stats");
    expect(stats).toContain('Health');
    expect(stats).toContain('Attack');
    expect(stats).toContain('Defense');
    expect(stats).toContain('Level');
    expect(stats).toContain('Experience');
  });

  test('getStats shows inventory', () => {
    const state = createTestGameState();
    const stats = getStats(state.player);
    
    expect(stats).toContain('Inventory');
    expect(stats).toContain('sword');
    expect(stats).toContain('potion');
  });

  test('getStats shows current location', () => {
    const state = createTestGameState();
    const stats = getStats(state.player);
    
    expect(stats).toContain('Location');
    expect(stats).toContain('test_room');
  });

  test('getPlayerData returns player object', () => {
    const state = createTestGameState();
    const data = getPlayerData(state.player);
    
    expect(data.name).toBe('Tester');
    expect(data.stats.health).toBe(100);
    expect(data.inventory).toContain('sword');
  });
});

// ==================== COMBAT TESTS ====================

describe('Combat', () => {
  test('calculateDamage returns positive damage', () => {
    // Run multiple times due to randomness
    for (let i = 0; i < 10; i++) {
      const damage = calculateDamage(10, 5);
      expect(damage).toBeGreaterThanOrEqual(1);
    }
  });

  test('calculateDamage minimum is 1', () => {
    // Even with high defense, damage should be at least 1
    for (let i = 0; i < 10; i++) {
      const damage = calculateDamage(1, 100);
      expect(damage).toBeGreaterThanOrEqual(1);
    }
  });

  test('attack fails if enemy not present', () => {
    const state = createTestGameState();
    const result = attack(state, 'Dragon');
    
    expect(result.success).toBe(false);
    expect(result.damage).toBe(0);
    expect(result.message).toContain('no');
  });

  test('attack succeeds against present enemy', () => {
    const state = createTestGameState();
    const result = attack(state, 'Test Goblin');
    
    expect(result.success).toBe(true);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.message).toContain('attack');
    expect(result.message).toContain('Test Goblin');
  });

  test('attack is case-insensitive', () => {
    const state = createTestGameState();
    const result = attack(state, 'test goblin'); // lowercase
    
    expect(result.success).toBe(true);
  });

  test('attack can defeat enemy', () => {
    // Create a weak enemy
    const state = createTestGameState();
    state.locations['test_room'].enemies[0].stats.health = 1;
    
    const result = attack(state, 'Test Goblin');
    
    expect(result.success).toBe(true);
    expect(result.enemyDefeated).toBe(true);
    expect(result.experienceGained).toBe(10);
  });

  test('applyAttackResult updates game state', () => {
    const state = createTestGameState();
    const result = attack(state, 'Test Goblin');
    const updatedState = applyAttackResult(state, result, 'Test Goblin');
    
    // Enemy health should be reduced
    if (!result.enemyDefeated) {
      expect(updatedState.locations['test_room'].enemies[0].stats.health)
        .toBeLessThan(20);
    }
  });

  test('applyAttackResult removes defeated enemy', () => {
    const state = createTestGameState();
    state.locations['test_room'].enemies[0].stats.health = 1;
    
    const result = attack(state, 'Test Goblin');
    expect(result.enemyDefeated).toBe(true);
    
    const updatedState = applyAttackResult(state, result, 'Test Goblin');
    expect(updatedState.locations['test_room'].enemies.length).toBe(0);
  });

  test('failed attack does not modify state', () => {
    const state = createTestGameState();
    const result = attack(state, 'NonExistent');
    const updatedState = applyAttackResult(state, result, 'NonExistent');
    
    // State should be unchanged
    expect(updatedState.locations['test_room'].enemies.length).toBe(1);
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Integration', () => {
  test('full gameplay flow: look, move, attack', () => {
    // Start game
    let state = createDefaultGameState('Hero');
    expect(state.player.currentLocation).toBe('tavern');
    
    // Look around
    let description = describeLocation(state);
    expect(description).toContain('Rusty Dragon Tavern');
    
    // Move to cellar
    let moveResult = moveToLocation(state, 'cellar');
    expect(moveResult.success).toBe(true);
    state = moveResult.state;
    
    // Look at cellar
    description = describeLocation(state);
    expect(description).toContain('Cellar');
    expect(description).toContain('Giant Rat');
    
    // Attack rat
    let attackResult = attack(state, 'Giant Rat');
    expect(attackResult.success).toBe(true);
    state = applyAttackResult(state, attackResult, 'Giant Rat');
    
    // Continue attacking until defeated
    while (!attackResult.enemyDefeated && state.player.stats.health > 0) {
      attackResult = attack(state, 'Giant Rat');
      if (attackResult.success) {
        state = applyAttackResult(state, attackResult, 'Giant Rat');
      }
    }
    
    // Verify rat is defeated (assuming player survives)
    if (state.player.stats.health > 0) {
      expect(attackResult.enemyDefeated).toBe(true);
      expect(state.locations['cellar'].enemies.length).toBe(0);
    }
  });
});

/**
 * rpgEngine.ts - Core RPG Engine for Layla Integration
 * 
 * This module provides pure functions to manage the RPG game state including:
 * - Player statistics (health, attack, defense, etc.)
 * - Game locations with descriptions and connections
 * - Combat actions and damage calculations
 * 
 * All functions are designed to be stateless and testable.
 * The game state is passed in and returned, making it easy to persist
 * and integrate with external systems like Layla.
 */

// ==================== TYPE DEFINITIONS ====================

/**
 * Represents the statistics for a player or enemy character.
 * All stats are numeric values that affect gameplay mechanics.
 */
export interface CharacterStats {
  /** Character's current health points */
  health: number;
  /** Maximum health points the character can have */
  maxHealth: number;
  /** Attack power for calculating damage */
  attack: number;
  /** Defense value for reducing incoming damage */
  defense: number;
  /** Character's experience level */
  level: number;
  /** Current experience points */
  experience: number;
}

/**
 * Represents a player character in the game.
 */
export interface Player {
  /** Unique identifier for the player */
  id: string;
  /** Display name of the player */
  name: string;
  /** Player's combat and progression stats */
  stats: CharacterStats;
  /** Current location ID where the player is */
  currentLocation: string;
  /** Items the player is carrying */
  inventory: string[];
}

/**
 * Represents an enemy or NPC that can be encountered.
 */
export interface Enemy {
  /** Unique identifier for the enemy */
  id: string;
  /** Display name of the enemy */
  name: string;
  /** Enemy's combat stats */
  stats: CharacterStats;
  /** Description of the enemy */
  description: string;
  /** Experience points awarded when defeated */
  experienceReward: number;
}

/**
 * Represents a location in the game world.
 */
export interface Location {
  /** Unique identifier for the location */
  id: string;
  /** Display name of the location */
  name: string;
  /** Detailed description of what the player sees */
  description: string;
  /** List of location IDs that can be reached from here */
  exits: string[];
  /** Enemies present at this location (can be empty) */
  enemies: Enemy[];
  /** Items that can be found here */
  items: string[];
}

/**
 * The complete game state containing all game data.
 */
export interface GameState {
  /** The player character */
  player: Player;
  /** All locations in the game world, keyed by ID */
  locations: Record<string, Location>;
}

/**
 * Result of an attack action.
 */
export interface AttackResult {
  /** Whether the attack was successful */
  success: boolean;
  /** Amount of damage dealt (0 if attack missed or failed) */
  damage: number;
  /** Human-readable description of what happened */
  message: string;
  /** Updated player stats after the attack */
  playerStats: CharacterStats;
  /** Updated enemy stats after the attack (null if enemy defeated) */
  enemyStats: CharacterStats | null;
  /** Whether the enemy was defeated */
  enemyDefeated: boolean;
  /** Experience points gained (if enemy defeated) */
  experienceGained: number;
}

// ==================== DEFAULT VALUES ====================

/**
 * Creates default stats for a new player character.
 * Call this when starting a new game.
 */
export function createDefaultPlayerStats(): CharacterStats {
  return {
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    level: 1,
    experience: 0
  };
}

/**
 * Creates a new player with default values.
 * @param name - The display name for the player
 * @param startingLocation - The ID of the starting location (default: "tavern")
 */
export function createPlayer(name: string, startingLocation: string = "tavern"): Player {
  return {
    id: `player_${Date.now()}`,
    name,
    stats: createDefaultPlayerStats(),
    currentLocation: startingLocation,
    inventory: []
  };
}

// ==================== LOCATION FUNCTIONS ====================

/**
 * Gets the description of a location.
 * This is the main function called when a player enters or looks around a location.
 * 
 * @param state - The current game state
 * @param locationId - The ID of the location to describe (optional, defaults to player's current location)
 * @returns A formatted string describing the location
 */
export function describeLocation(state: GameState, locationId?: string): string {
  // Use player's current location if none specified
  const targetLocationId = locationId || state.player.currentLocation;
  const location = state.locations[targetLocationId];
  
  // Handle case where location doesn't exist
  if (!location) {
    return `You look around but see nothing familiar. The location "${targetLocationId}" seems to be unknown.`;
  }
  
  // Build the description
  let description = `📍 **${location.name}**\n\n`;
  description += `${location.description}\n\n`;
  
  // List enemies if present
  if (location.enemies.length > 0) {
    description += `⚔️ **Enemies here:**\n`;
    for (const enemy of location.enemies) {
      description += `  - ${enemy.name}: ${enemy.description}\n`;
    }
    description += '\n';
  }
  
  // List items if present
  if (location.items.length > 0) {
    description += `🎒 **Items you can see:**\n`;
    for (const item of location.items) {
      description += `  - ${item}\n`;
    }
    description += '\n';
  }
  
  // List exits
  if (location.exits.length > 0) {
    description += `🚪 **Exits:** ${location.exits.join(', ')}`;
  } else {
    description += `🚪 **Exits:** None - you seem to be trapped!`;
  }
  
  return description;
}

/**
 * Moves the player to a new location if valid.
 * 
 * @param state - The current game state
 * @param targetLocationId - The ID of the location to move to
 * @returns Object with success status, message, and updated state
 */
export function moveToLocation(
  state: GameState, 
  targetLocationId: string
): { success: boolean; message: string; state: GameState } {
  const currentLocation = state.locations[state.player.currentLocation];
  
  // Check if target is a valid exit
  if (!currentLocation.exits.includes(targetLocationId)) {
    return {
      success: false,
      message: `You can't go to "${targetLocationId}" from here. Available exits: ${currentLocation.exits.join(', ')}`,
      state
    };
  }
  
  // Check if target location exists
  if (!state.locations[targetLocationId]) {
    return {
      success: false,
      message: `The path to "${targetLocationId}" seems blocked or doesn't exist.`,
      state
    };
  }
  
  // Move the player
  const updatedState: GameState = {
    ...state,
    player: {
      ...state.player,
      currentLocation: targetLocationId
    }
  };
  
  return {
    success: true,
    message: `You travel to ${state.locations[targetLocationId].name}.`,
    state: updatedState
  };
}

// ==================== STATS FUNCTIONS ====================

/**
 * Gets a formatted display of the player's current stats.
 * Called when the player wants to check their character.
 * 
 * @param player - The player whose stats to display
 * @returns A formatted string showing all player stats
 */
export function getStats(player: Player): string {
  const stats = player.stats;
  const healthPercent = Math.round((stats.health / stats.maxHealth) * 100);
  
  // Create health bar visualization
  const healthBarLength = 20;
  const filledBars = Math.round((healthPercent / 100) * healthBarLength);
  const healthBar = '█'.repeat(filledBars) + '░'.repeat(healthBarLength - filledBars);
  
  let output = `📊 **${player.name}'s Stats**\n\n`;
  output += `❤️ Health: [${healthBar}] ${stats.health}/${stats.maxHealth}\n`;
  output += `⚔️ Attack: ${stats.attack}\n`;
  output += `🛡️ Defense: ${stats.defense}\n`;
  output += `📈 Level: ${stats.level}\n`;
  output += `✨ Experience: ${stats.experience} XP\n`;
  output += `📍 Location: ${player.currentLocation}\n`;
  
  // Show inventory if not empty
  if (player.inventory.length > 0) {
    output += `\n🎒 **Inventory:** ${player.inventory.join(', ')}`;
  } else {
    output += `\n🎒 **Inventory:** Empty`;
  }
  
  return output;
}

/**
 * Gets raw player stats as an object (useful for API responses).
 * 
 * @param player - The player whose stats to retrieve
 * @returns The player object with all stats
 */
export function getPlayerData(player: Player): Player {
  return { ...player };
}

// ==================== COMBAT FUNCTIONS ====================

/**
 * Calculates damage dealt from attacker to defender.
 * Uses a simple formula: damage = max(1, attacker.attack - defender.defense/2 + random)
 * 
 * @param attackerAttack - The attack stat of the attacker
 * @param defenderDefense - The defense stat of the defender
 * @returns The amount of damage to deal
 */
export function calculateDamage(attackerAttack: number, defenderDefense: number): number {
  // Add some randomness (-3 to +3)
  const randomModifier = Math.floor(Math.random() * 7) - 3;
  // Calculate base damage, minimum of 1
  const damage = Math.max(1, attackerAttack - Math.floor(defenderDefense / 2) + randomModifier);
  return damage;
}

/**
 * Performs an attack action against a target enemy.
 * This is the main combat function called when a player attacks.
 * 
 * @param state - The current game state
 * @param targetName - The name of the enemy to attack (case-insensitive)
 * @returns AttackResult with outcome details and updated stats
 */
export function attack(state: GameState, targetName: string): AttackResult {
  const currentLocation = state.locations[state.player.currentLocation];
  
  // Find the enemy by name (case-insensitive)
  const enemyIndex = currentLocation.enemies.findIndex(
    e => e.name.toLowerCase() === targetName.toLowerCase()
  );
  
  // Check if enemy exists at this location
  if (enemyIndex === -1) {
    return {
      success: false,
      damage: 0,
      message: `There is no "${targetName}" here to attack. Look around first!`,
      playerStats: state.player.stats,
      enemyStats: null,
      enemyDefeated: false,
      experienceGained: 0
    };
  }
  
  const enemy = currentLocation.enemies[enemyIndex];
  
  // Calculate and apply damage to enemy
  const damageToEnemy = calculateDamage(state.player.stats.attack, enemy.stats.defense);
  const newEnemyHealth = enemy.stats.health - damageToEnemy;
  
  // Check if enemy is defeated
  const enemyDefeated = newEnemyHealth <= 0;
  
  // Calculate enemy counterattack damage (if enemy survives)
  let damageToPlayer = 0;
  let counterAttackMessage = '';
  
  if (!enemyDefeated) {
    damageToPlayer = calculateDamage(enemy.stats.attack, state.player.stats.defense);
    counterAttackMessage = `\n\n${enemy.name} strikes back and deals ${damageToPlayer} damage to you!`;
  }
  
  // Update player stats
  const updatedPlayerStats: CharacterStats = {
    ...state.player.stats,
    health: Math.max(0, state.player.stats.health - damageToPlayer),
    experience: enemyDefeated 
      ? state.player.stats.experience + enemy.experienceReward 
      : state.player.stats.experience
  };
  
  // Build result message
  let message = `⚔️ You attack ${enemy.name} and deal ${damageToEnemy} damage!`;
  
  if (enemyDefeated) {
    message += `\n\n🎉 **Victory!** You have defeated ${enemy.name}!`;
    message += `\n✨ You gained ${enemy.experienceReward} experience points!`;
  } else {
    message += `\n${enemy.name} has ${newEnemyHealth} health remaining.`;
    message += counterAttackMessage;
    message += `\n\n❤️ Your health: ${updatedPlayerStats.health}/${updatedPlayerStats.maxHealth}`;
  }
  
  return {
    success: true,
    damage: damageToEnemy,
    message,
    playerStats: updatedPlayerStats,
    enemyStats: enemyDefeated ? null : {
      ...enemy.stats,
      health: newEnemyHealth
    },
    enemyDefeated,
    experienceGained: enemyDefeated ? enemy.experienceReward : 0
  };
}

/**
 * Updates the game state after an attack.
 * Call this with the attack result to persist changes.
 * 
 * @param state - The current game state
 * @param result - The result from the attack() function
 * @param targetName - The name of the attacked enemy
 * @returns Updated game state
 */
export function applyAttackResult(
  state: GameState, 
  result: AttackResult, 
  targetName: string
): GameState {
  if (!result.success) {
    return state;
  }
  
  const currentLocation = state.locations[state.player.currentLocation];
  const enemyIndex = currentLocation.enemies.findIndex(
    e => e.name.toLowerCase() === targetName.toLowerCase()
  );
  
  // Update enemy or remove if defeated
  let updatedEnemies: Enemy[];
  if (result.enemyDefeated) {
    updatedEnemies = currentLocation.enemies.filter((_, i) => i !== enemyIndex);
  } else {
    updatedEnemies = currentLocation.enemies.map((enemy, i) => {
      if (i === enemyIndex && result.enemyStats) {
        return { ...enemy, stats: result.enemyStats };
      }
      return enemy;
    });
  }
  
  // Build updated state
  return {
    player: {
      ...state.player,
      stats: result.playerStats
    },
    locations: {
      ...state.locations,
      [state.player.currentLocation]: {
        ...currentLocation,
        enemies: updatedEnemies
      }
    }
  };
}

// ==================== DEFAULT GAME DATA ====================

/**
 * Creates the default game world with sample locations and enemies.
 * Call this to initialize a new game.
 * 
 * @param playerName - The name for the player character
 * @returns A complete GameState ready to play
 */
export function createDefaultGameState(playerName: string = "Hero"): GameState {
  return {
    player: createPlayer(playerName, "tavern"),
    locations: {
      tavern: {
        id: "tavern",
        name: "The Rusty Dragon Tavern",
        description: "You stand in a cozy tavern filled with the smell of ale and roasting meat. " +
          "A crackling fire warms the room. The barkeeper nods at you from behind the counter. " +
          "Adventurers share stories at wooden tables.",
        exits: ["town_square", "cellar"],
        enemies: [],
        items: ["mug of ale", "bread"]
      },
      town_square: {
        id: "town_square",
        name: "Town Square",
        description: "The bustling center of the town. Merchants call out their wares from colorful stalls. " +
          "A stone fountain sits in the middle, its water sparkling in the sunlight. " +
          "Guards patrol the area keeping the peace.",
        exits: ["tavern", "forest_entrance", "blacksmith"],
        enemies: [],
        items: ["gold coin"]
      },
      blacksmith: {
        id: "blacksmith",
        name: "The Iron Forge",
        description: "Heat radiates from the forge where the blacksmith hammers away at glowing metal. " +
          "Weapons and armor line the walls, ready for purchase. " +
          "The clang of metal on metal fills the air.",
        exits: ["town_square"],
        enemies: [],
        items: ["iron sword", "leather armor"]
      },
      cellar: {
        id: "cellar",
        name: "Tavern Cellar",
        description: "A dark, musty cellar beneath the tavern. Barrels of ale line the walls. " +
          "Something squeaks in the shadows... you spot movement between the crates.",
        exits: ["tavern"],
        enemies: [
          {
            id: "rat_1",
            name: "Giant Rat",
            description: "A large rat with gleaming red eyes",
            stats: { health: 15, maxHealth: 15, attack: 3, defense: 1, level: 1, experience: 0 },
            experienceReward: 10
          }
        ],
        items: ["torch", "old key"]
      },
      forest_entrance: {
        id: "forest_entrance",
        name: "Forest Entrance",
        description: "The edge of a dense, dark forest. Tall trees loom overhead, their branches " +
          "blocking out most of the sunlight. A worn path leads deeper into the woods. " +
          "You hear strange sounds in the distance.",
        exits: ["town_square", "deep_forest"],
        enemies: [
          {
            id: "goblin_1",
            name: "Goblin Scout",
            description: "A sneaky goblin armed with a crude dagger",
            stats: { health: 25, maxHealth: 25, attack: 6, defense: 2, level: 2, experience: 0 },
            experienceReward: 25
          }
        ],
        items: ["mushroom", "fallen branch"]
      },
      deep_forest: {
        id: "deep_forest",
        name: "Deep Forest",
        description: "The forest grows darker and more menacing here. Ancient trees twist together, " +
          "their roots forming treacherous paths. You sense danger lurking nearby. " +
          "A faint glow comes from deeper within...",
        exits: ["forest_entrance"],
        enemies: [
          {
            id: "wolf_1",
            name: "Shadow Wolf",
            description: "A large wolf with dark fur that seems to absorb the light",
            stats: { health: 40, maxHealth: 40, attack: 10, defense: 4, level: 3, experience: 0 },
            experienceReward: 50
          },
          {
            id: "goblin_2",
            name: "Goblin Warrior",
            description: "A battle-scarred goblin wielding a rusty sword",
            stats: { health: 30, maxHealth: 30, attack: 8, defense: 3, level: 2, experience: 0 },
            experienceReward: 30
          }
        ],
        items: ["healing potion", "mysterious gem"]
      }
    }
  };
}

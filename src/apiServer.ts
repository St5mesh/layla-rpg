/**
 * apiServer.ts - HTTP API Server for Layla RPG Integration
 * 
 * This module provides an Express HTTP server that exposes the RPG engine
 * functionality through REST endpoints. Layla (Android app) can call these
 * endpoints to trigger RPG actions without modification to the app itself.
 * 
 * Endpoints:
 * - GET  /describe_location - Get description of current or specified location
 * - GET  /get_stats - Get player's current stats
 * - POST /attack - Attack a target enemy
 * - POST /move - Move to a different location
 * - POST /new_game - Start a new game with a player name
 * - GET  /health - Health check endpoint
 * 
 * The server maintains game state in memory. For persistence, the state
 * can be saved/loaded via the /save and /load endpoints (future feature).
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  GameState,
  createDefaultGameState,
  describeLocation,
  getStats,
  getPlayerData,
  attack,
  applyAttackResult,
  moveToLocation
} from './rpgEngine';
import {
  validateEnemyTarget,
  validateLocationMove,
  validateLocationForDescription,
  validatePlayerName,
  createValidationErrorResponse
} from './validation';
import {
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  notFoundMiddleware,
  formatSuccessResponse,
  createValidationError,
  createNotFoundError,
  asyncHandler,
  timeoutMiddleware
} from './errorHandling';
import {
  saveGame,
  loadGame,
  listSavedGames,
  deleteSavedGame
} from './persistence';

// ==================== SERVER CONFIGURATION ====================

/** Default port for the server */
const DEFAULT_PORT = 3000;

/** Get port from environment or use default */
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

// ==================== GAME STATE ====================

/**
 * Current game state - stored in memory.
 * Initialize with a default game for immediate play.
 */
let gameState: GameState = createDefaultGameState("Hero");

// ==================== AUTO-SAVE CONFIGURATION ====================

/** Enable/disable auto-save functionality */
const AUTO_SAVE_ENABLED = process.env.AUTO_SAVE_ENABLED !== 'false';

/** Auto-save events configuration */
const AUTO_SAVE_EVENTS = {
  ENEMY_DEFEATED: true,
  LEVEL_UP: true,
  LOCATION_CHANGE: true,
  GAME_START: false // Don't auto-save on game start
};

/**
 * Performs an auto-save operation if enabled
 * @param reason - The reason for the auto-save (for naming)
 * @param force - Force save even if auto-save is disabled
 */
async function performAutoSave(reason: string, force: boolean = false): Promise<void> {
  if (!AUTO_SAVE_ENABLED && !force) {
    return;
  }
  
  try {
    const saveName = `Auto-Save (${reason})`;
    const result = await saveGame(gameState, saveName);
    
    if (result.success) {
      console.log(`✅ Auto-saved: ${saveName} → ${result.filename}`);
    } else {
      console.warn(`⚠️ Auto-save failed for ${reason}:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Auto-save error for ${reason}:`, error);
  }
}

// ==================== EXPRESS APP SETUP ====================

/** Create Express application */
const app = express();

/** Enable JSON body parsing for POST requests */
app.use(express.json());

/** Enable URL-encoded body parsing */
app.use(express.urlencoded({ extended: true }));

/** Add request timeout protection (30 seconds) */
app.use(timeoutMiddleware(30000));

/** Enhanced request logging middleware */
app.use(requestLoggingMiddleware);

// ==================== API ENDPOINTS ====================

/**
 * GET /health
 * 
 * Health check endpoint to verify the server is running.
 * Use this to test connectivity before making game requests.
 * 
 * Response: { status: "ok", message: "Layla RPG Server is running" }
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Layla RPG Server is running',
    player: gameState.player.name,
    location: gameState.player.currentLocation
  });
});

/**
 * GET /describe_location
 * 
 * Get the description of the current location or a specified location.
 * This is called when a player "looks around" or enters a new area.
 * 
 * Query Parameters:
 * - location (optional): The ID of the location to describe.
 *                        If not provided, describes the player's current location.
 * 
 * Response: { success: true, description: "..." }
 * 
 * Example Layla Trigger: "look around", "where am I", "enter tavern"
 */
app.get('/describe_location', asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.location as string | undefined;
  
  // Validate location if provided
  const validation = validateLocationForDescription(gameState, locationId);
  if (!validation.isValid) {
    return res.status(400).json(createValidationErrorResponse(validation));
  }
  
  const description = describeLocation(gameState, locationId);
  res.json({
    success: true,
    description,
    currentLocation: gameState.player.currentLocation
  });
}));

/**
 * GET /get_stats
 * 
 * Get the player's current statistics.
 * Returns both a formatted string and raw data.
 * 
 * Response: { 
 *   success: true, 
 *   stats: "formatted string", 
 *   data: { player object } 
 * }
 * 
 * Example Layla Trigger: "check stats", "show my stats", "character"
 */
app.get('/get_stats', asyncHandler(async (_req: Request, res: Response) => {
  const formattedStats = getStats(gameState.player);
  const playerData = getPlayerData(gameState.player);
  
  res.json({
    success: true,
    stats: formattedStats,
    data: playerData
  });
}));

/**
 * POST /attack
 * 
 * Attack a target enemy at the current location.
 * Damage is calculated based on player attack vs enemy defense.
 * 
 * Request Body:
 * - target (required): Name of the enemy to attack (case-insensitive)
 * 
 * Response: { success: true/false, result: AttackResult }
 * 
 * Example Layla Trigger: "attack goblin", "fight rat", "attack wolf"
 */
app.post('/attack', asyncHandler(async (req: Request, res: Response) => {
  const { target } = req.body;
  
  // Validate enemy target
  const validation = validateEnemyTarget(gameState, target);
  if (!validation.isValid) {
    return res.status(400).json(createValidationErrorResponse(validation));
  }
  
  // Perform the attack
  const result = attack(gameState, target);
  
  // Update game state if attack was successful
  if (result.success) {
    gameState = applyAttackResult(gameState, result, target);
    
    // Auto-save if enemy was defeated
    if (result.enemyDefeated && AUTO_SAVE_EVENTS.ENEMY_DEFEATED) {
      performAutoSave(`Enemy Defeated: ${target}`);
    }
    
    // Auto-save if player leveled up (check if XP crossed level boundary)
    // Note: This is a simple check - in a more complex system, you'd track level changes
    if (result.experienceGained > 0 && AUTO_SAVE_EVENTS.LEVEL_UP) {
      const newLevel = Math.floor(result.playerStats.experience / 100) + 1; // Simple level calculation
      if (newLevel > gameState.player.stats.level) {
        performAutoSave(`Level Up: Level ${newLevel}`);
      }
    }
  }
  
  res.json({
    success: result.success,
    result: {
      message: result.message,
      damage: result.damage,
      enemyDefeated: result.enemyDefeated,
      experienceGained: result.experienceGained,
      playerHealth: result.playerStats.health,
      playerMaxHealth: result.playerStats.maxHealth
    }
  });
}));

/**
 * POST /move
 * 
 * Move the player to a different location.
 * The location must be accessible from the current location (in exits list).
 * 
 * Request Body:
 * - location (required): ID of the location to move to
 * 
 * Response: { success: true/false, message: "...", description: "..." }
 * 
 * Example Layla Trigger: "go to tavern", "enter forest", "move to town square"
 */
app.post('/move', asyncHandler(async (req: Request, res: Response) => {
  const { location } = req.body;
  
  // Validate location parameter
  const validation = validateLocationMove(gameState, location);
  if (!validation.isValid) {
    return res.status(400).json(createValidationErrorResponse(validation));
  }
  
  const result = moveToLocation(gameState, location);
  
  // Update game state if move was successful
  if (result.success) {
    const previousLocation = gameState.player.currentLocation;
    gameState = result.state;
    
    // Auto-save on location change
    if (AUTO_SAVE_EVENTS.LOCATION_CHANGE) {
      const newLocationName = gameState.locations[gameState.player.currentLocation]?.name || 
                              gameState.player.currentLocation;
      performAutoSave(`Moved to ${newLocationName}`);
    }
  }
  
  // Get description of new location if move was successful
  const description = result.success 
    ? describeLocation(gameState)
    : undefined;
  
  res.json({
    success: result.success,
    message: result.message,
    description,
    currentLocation: gameState.player.currentLocation
  });
}));

/**
 * POST /new_game
 * 
 * Start a new game with a fresh character.
 * This resets all game state.
 * 
 * Request Body:
 * - playerName (optional): Name for the player character (default: "Hero")
 * 
 * Response: { success: true, message: "...", description: "..." }
 * 
 * Example Layla Trigger: "start new game", "new character"
 */
app.post('/new_game', asyncHandler(async (req: Request, res: Response) => {
  const { playerName } = req.body;
  let validatedPlayerName = 'Hero'; // default
  
  // Validate player name if provided
  if (playerName) {
    const nameValidation = validatePlayerName(playerName);
    if (nameValidation) {
      return res.status(400).json({
        success: false,
        error: nameValidation.code,
        message: nameValidation.message,
        details: [nameValidation]
      });
    }
    validatedPlayerName = playerName.trim();
  }
  
  // Create a fresh game state
  gameState = createDefaultGameState(validatedPlayerName);
  
  // Get the starting location description
  const description = describeLocation(gameState);
  
  res.json({
    success: true,
    message: `Welcome, ${validatedPlayerName}! Your adventure begins...`,
    description,
    player: getPlayerData(gameState.player)
  });
}));

/**
 * GET /inventory
 * 
 * Get the player's current inventory.
 * 
 * Response: { success: true, inventory: [...] }
 * 
 * Example Layla Trigger: "check inventory", "what do I have"
 */
app.get('/inventory', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    inventory: gameState.player.inventory,
    message: gameState.player.inventory.length > 0
      ? `You are carrying: ${gameState.player.inventory.join(', ')}`
      : 'Your inventory is empty.'
  });
}));

/**
 * GET /enemies
 * 
 * Get the enemies at the current location.
 * 
 * Response: { success: true, enemies: [...] }
 * 
 * Example Layla Trigger: "who is here", "list enemies", "scan area"
 */
app.get('/enemies', asyncHandler(async (_req: Request, res: Response) => {
  const currentLocation = gameState.locations[gameState.player.currentLocation];
  const enemies = currentLocation.enemies.map(e => ({
    name: e.name,
    description: e.description,
    health: e.stats.health,
    maxHealth: e.stats.maxHealth
  }));
  
  res.json({
    success: true,
    enemies,
    message: enemies.length > 0
      ? `Enemies here: ${enemies.map(e => e.name).join(', ')}`
      : 'There are no enemies here.'
  });
}));

// ==================== PERSISTENCE ENDPOINTS ====================

/**
 * POST /save_game
 * 
 * Save the current game state to a file.
 * 
 * Request Body:
 * - saveName (optional): Name for the save file (default: "Auto Save")
 * 
 * Response: { success: true/false, filename?: string, message: string }
 * 
 * Example Layla Trigger: "save game", "save my progress"
 */
app.post('/save_game', asyncHandler(async (req: Request, res: Response) => {
  const { saveName = 'Auto Save' } = req.body;
  
  // Validate saveName if provided
  if (saveName && (typeof saveName !== 'string' || saveName.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_SAVE_NAME',
      message: 'Save name must be a non-empty string',
      timestamp: new Date().toISOString()
    });
  }
  
  const result = await saveGame(gameState, saveName.trim());
  
  if (result.success) {
    res.json({
      success: true,
      filename: result.filename,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'SAVE_FAILED',
      message: result.message,
      details: result.error,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * POST /load_game
 * 
 * Load a saved game state from a file.
 * 
 * Request Body:
 * - filename (required): Name of the save file to load
 * 
 * Response: { success: true/false, message: string, description?: string }
 * 
 * Example Layla Trigger: "load game", "load my save"
 */
app.post('/load_game', asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.body;
  
  // Validate filename
  if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FILENAME',
      message: 'Filename is required and must be a non-empty string',
      timestamp: new Date().toISOString()
    });
  }
  
  const result = await loadGame(filename.trim());
  
  if (result.success && result.gameState) {
    // Update the server's game state
    gameState = result.gameState;
    
    // Get description of the loaded location
    const description = describeLocation(gameState);
    
    res.json({
      success: true,
      message: result.message,
      description,
      player: getPlayerData(gameState.player),
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'LOAD_FAILED',
      message: result.message,
      details: result.error,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /saved_games
 * 
 * List all available saved games with metadata.
 * 
 * Response: { success: true, saves: SaveGameMetadata[] }
 * 
 * Example Layla Trigger: "list saves", "show saved games"
 */
app.get('/saved_games', asyncHandler(async (_req: Request, res: Response) => {
  const saves = await listSavedGames();
  
  res.json({
    success: true,
    saves,
    count: saves.length,
    message: saves.length > 0 
      ? `Found ${saves.length} saved game${saves.length === 1 ? '' : 's'}`
      : 'No saved games found',
    timestamp: new Date().toISOString()
  });
}));

/**
 * DELETE /saved_games/:filename
 * 
 * Delete a specific saved game file.
 * 
 * URL Parameters:
 * - filename (required): Name of the save file to delete
 * 
 * Response: { success: true/false, message: string }
 * 
 * Example: DELETE /saved_games/Hero_AutoSave_2023-12-04T10-30-00-000Z.json
 */
app.delete('/saved_games/:filename', asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename || filename.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FILENAME',
      message: 'Filename parameter is required',
      timestamp: new Date().toISOString()
    });
  }
  
  const result = await deleteSavedGame(filename.trim());
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'DELETE_FAILED',
      message: result.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /autosave_status
 * 
 * Get the current auto-save configuration and status.
 * 
 * Response: { success: true, enabled: boolean, events: object }
 */
app.get('/autosave_status', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    enabled: AUTO_SAVE_ENABLED,
    events: AUTO_SAVE_EVENTS,
    message: AUTO_SAVE_ENABLED ? 'Auto-save is enabled' : 'Auto-save is disabled',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /manual_save
 * 
 * Trigger a manual auto-save (useful for testing or explicit saves).
 * This bypasses the auto-save enabled check.
 * 
 * Request Body:
 * - reason (optional): Custom reason for the save
 * 
 * Response: { success: true/false, message: string }
 */
app.post('/manual_save', asyncHandler(async (req: Request, res: Response) => {
  const { reason = 'Manual Save' } = req.body;
  
  try {
    await performAutoSave(reason, true); // Force save regardless of auto-save setting
    
    res.json({
      success: true,
      message: `Manual save completed: ${reason}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'MANUAL_SAVE_FAILED',
      message: 'Failed to perform manual save',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

// ==================== ERROR HANDLING ====================

/**
 * 404 handler for unknown routes using standardized middleware
 */
app.use(notFoundMiddleware);

/**
 * Global error handling middleware
 */
app.use(errorHandlingMiddleware);

// ==================== SERVER STARTUP ====================

/**
 * Start the server if this file is run directly.
 * When imported as a module, the server won't start automatically.
 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🎮 Layla RPG Server Started!');
    console.log('='.repeat(50));
    console.log(`📍 Running at: http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /health            - Check server status');
    console.log('  GET  /describe_location - Get location description');
    console.log('  GET  /get_stats         - Get player stats');
    console.log('  GET  /inventory         - Get player inventory');
    console.log('  GET  /enemies           - Get enemies at location');
    console.log('  GET  /saved_games       - List saved games');
    console.log('  GET  /autosave_status   - Check auto-save config');
    console.log('  POST /attack            - Attack an enemy');
    console.log('  POST /move              - Move to a location');
    console.log('  POST /new_game          - Start a new game');
    console.log('  POST /save_game         - Save current progress');
    console.log('  POST /load_game         - Load a saved game');
    console.log('  POST /manual_save       - Force manual save');
    console.log('  DEL  /saved_games/:file - Delete a saved game');
    console.log('');
    console.log('💾 Auto-save:', AUTO_SAVE_ENABLED ? '✅ Enabled' : '❌ Disabled');
    if (AUTO_SAVE_ENABLED) {
      console.log('   Events: Enemy Defeats, Location Changes');
    }
    console.log('');
    console.log('Press Ctrl+C to stop the server.');
    console.log('='.repeat(50));
  });
}

// Export for testing
export { app, gameState };

/**
 * Reset game state - useful for testing
 */
export function resetGameState(playerName: string = 'Hero'): void {
  gameState = createDefaultGameState(playerName);
}

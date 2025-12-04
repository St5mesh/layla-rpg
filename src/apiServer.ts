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

// ==================== EXPRESS APP SETUP ====================

/** Create Express application */
const app = express();

/** Enable JSON body parsing for POST requests */
app.use(express.json());

/** Enable URL-encoded body parsing */
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware.
 * Logs all incoming requests for debugging.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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
app.get('/describe_location', (req: Request, res: Response) => {
  const locationId = req.query.location as string | undefined;
  
  try {
    const description = describeLocation(gameState, locationId);
    res.json({
      success: true,
      description,
      currentLocation: gameState.player.currentLocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to describe location',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
app.get('/get_stats', (_req: Request, res: Response) => {
  try {
    const formattedStats = getStats(gameState.player);
    const playerData = getPlayerData(gameState.player);
    
    res.json({
      success: true,
      stats: formattedStats,
      data: playerData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
app.post('/attack', (req: Request, res: Response) => {
  const { target } = req.body;
  
  // Validate target parameter
  if (!target || typeof target !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing or invalid target parameter',
      message: 'Please specify who you want to attack. Example: { "target": "goblin" }'
    });
    return;
  }
  
  try {
    // Perform the attack
    const result = attack(gameState, target);
    
    // Update game state if attack was successful
    if (result.success) {
      gameState = applyAttackResult(gameState, result, target);
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Attack failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
app.post('/move', (req: Request, res: Response) => {
  const { location } = req.body;
  
  // Validate location parameter
  if (!location || typeof location !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing or invalid location parameter',
      message: 'Please specify where you want to go. Example: { "location": "tavern" }'
    });
    return;
  }
  
  try {
    const result = moveToLocation(gameState, location);
    
    // Update game state if move was successful
    if (result.success) {
      gameState = result.state;
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Move failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
app.post('/new_game', (req: Request, res: Response) => {
  const playerName = req.body.playerName || 'Hero';
  
  try {
    // Create a fresh game state
    gameState = createDefaultGameState(playerName);
    
    // Get the starting location description
    const description = describeLocation(gameState);
    
    res.json({
      success: true,
      message: `Welcome, ${playerName}! Your adventure begins...`,
      description,
      player: getPlayerData(gameState.player)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start new game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /inventory
 * 
 * Get the player's current inventory.
 * 
 * Response: { success: true, inventory: [...] }
 * 
 * Example Layla Trigger: "check inventory", "what do I have"
 */
app.get('/inventory', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      inventory: gameState.player.inventory,
      message: gameState.player.inventory.length > 0
        ? `You are carrying: ${gameState.player.inventory.join(', ')}`
        : 'Your inventory is empty.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /enemies
 * 
 * Get the enemies at the current location.
 * 
 * Response: { success: true, enemies: [...] }
 * 
 * Example Layla Trigger: "who is here", "list enemies", "scan area"
 */
app.get('/enemies', (_req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get enemies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== ERROR HANDLING ====================

/**
 * 404 handler for unknown routes.
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'Available endpoints: /health, /describe_location, /get_stats, /attack, /move, /new_game, /inventory, /enemies'
  });
});

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
    console.log('  POST /attack            - Attack an enemy');
    console.log('  POST /move              - Move to a location');
    console.log('  POST /new_game          - Start a new game');
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

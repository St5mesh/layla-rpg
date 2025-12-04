/**
 * persistence.ts - Game State Persistence for RPG Engine
 * 
 * This module provides functionality for saving and loading game state to/from JSON files.
 * Features include:
 * - Safe file operations with error handling
 * - Game state validation before save/load
 * - Automatic backup creation
 * - Metadata tracking (save date, player name, etc.)
 * - Multiple save slot support
 * 
 * Save files are stored in the 'saves/' directory as JSON files.
 */

import fs from 'fs/promises';
import path from 'path';
import { GameState, Player } from './rpgEngine';

// ==================== TYPE DEFINITIONS ====================

/**
 * Metadata stored with each saved game
 */
export interface SaveGameMetadata {
  /** The name of the saved game file */
  filename: string;
  /** Display name for the save */
  saveName: string;
  /** Player name from the game state */
  playerName: string;
  /** Player level at time of save */
  playerLevel: number;
  /** Player's current location at time of save */
  currentLocation: string;
  /** When the save was created */
  saveDate: string;
  /** Game version when saved (for compatibility) */
  gameVersion: string;
  /** Total playtime if available */
  playtime?: string;
}

/**
 * Complete save file structure
 */
export interface SaveFile {
  /** Metadata about the save */
  metadata: SaveGameMetadata;
  /** The complete game state */
  gameState: GameState;
  /** Version of the save file format */
  saveFormatVersion: string;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean;
  filename?: string;
  message: string;
  error?: string;
}

/**
 * Result of a load operation
 */
export interface LoadResult {
  success: boolean;
  gameState?: GameState;
  metadata?: SaveGameMetadata;
  message: string;
  error?: string;
}

// ==================== CONSTANTS ====================

/** Directory where save files are stored */
const SAVES_DIRECTORY = 'saves';

/** Current save file format version */
const SAVE_FORMAT_VERSION = '1.0.0';

/** Current game version */
const GAME_VERSION = '1.0.0';

/** Maximum number of save files to keep */
const MAX_SAVE_FILES = 100;

/** File extension for save files */
const SAVE_FILE_EXTENSION = '.json';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Ensures the saves directory exists
 */
async function ensureSavesDirectory(): Promise<void> {
  try {
    await fs.access(SAVES_DIRECTORY);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(SAVES_DIRECTORY, { recursive: true });
  }
}

/**
 * Generates a safe filename for a save
 */
function generateSaveFilename(saveName: string, playerName: string): string {
  // Sanitize the save name and player name
  const sanitizedSaveName = saveName
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  
  const sanitizedPlayerName = playerName
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 20);
  
  // Add timestamp to ensure uniqueness
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return `${sanitizedPlayerName}_${sanitizedSaveName}_${timestamp}${SAVE_FILE_EXTENSION}`;
}

/**
 * Validates that a game state is valid for saving
 */
function validateGameState(gameState: GameState): { isValid: boolean; error?: string } {
  if (!gameState) {
    return { isValid: false, error: 'Game state is null or undefined' };
  }
  
  if (!gameState.player) {
    return { isValid: false, error: 'Game state missing player data' };
  }
  
  if (!gameState.player.name || typeof gameState.player.name !== 'string') {
    return { isValid: false, error: 'Player name is missing or invalid' };
  }
  
  if (!gameState.player.currentLocation || typeof gameState.player.currentLocation !== 'string') {
    return { isValid: false, error: 'Player current location is missing or invalid' };
  }
  
  if (!gameState.locations || typeof gameState.locations !== 'object') {
    return { isValid: false, error: 'Game locations data is missing or invalid' };
  }
  
  // Verify the player's current location exists
  if (!gameState.locations[gameState.player.currentLocation]) {
    return { isValid: false, error: `Player's current location "${gameState.player.currentLocation}" does not exist in game world` };
  }
  
  return { isValid: true };
}

/**
 * Validates that a loaded save file has the correct structure
 */
function validateSaveFile(saveData: any): { isValid: boolean; error?: string } {
  if (!saveData || typeof saveData !== 'object') {
    return { isValid: false, error: 'Save file data is not a valid object' };
  }
  
  if (!saveData.metadata || typeof saveData.metadata !== 'object') {
    return { isValid: false, error: 'Save file missing metadata' };
  }
  
  if (!saveData.gameState || typeof saveData.gameState !== 'object') {
    return { isValid: false, error: 'Save file missing game state' };
  }
  
  if (!saveData.saveFormatVersion || typeof saveData.saveFormatVersion !== 'string') {
    return { isValid: false, error: 'Save file missing format version' };
  }
  
  // Validate the game state within the save file
  const gameStateValidation = validateGameState(saveData.gameState);
  if (!gameStateValidation.isValid) {
    return { isValid: false, error: `Invalid game state in save file: ${gameStateValidation.error}` };
  }
  
  return { isValid: true };
}

/**
 * Creates metadata for a save file
 */
function createSaveMetadata(gameState: GameState, saveName: string, filename: string): SaveGameMetadata {
  const player = gameState.player;
  const currentLocation = gameState.locations[player.currentLocation];
  
  return {
    filename,
    saveName,
    playerName: player.name,
    playerLevel: player.stats.level,
    currentLocation: currentLocation?.name || player.currentLocation,
    saveDate: new Date().toISOString(),
    gameVersion: GAME_VERSION,
    playtime: undefined // Could be implemented in the future
  };
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Saves the current game state to a file
 * 
 * @param gameState - The current game state to save
 * @param saveName - Human-readable name for the save
 * @returns Promise resolving to save result
 */
export async function saveGame(gameState: GameState, saveName: string = 'Auto Save'): Promise<SaveResult> {
  try {
    // Ensure saves directory exists
    await ensureSavesDirectory();
    
    // Validate the game state
    const validation = validateGameState(gameState);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Cannot save game: Invalid game state',
        error: validation.error
      };
    }
    
    // Generate filename and create metadata
    const filename = generateSaveFilename(saveName, gameState.player.name);
    const metadata = createSaveMetadata(gameState, saveName, filename);
    
    // Create the complete save file structure
    const saveFile: SaveFile = {
      metadata,
      gameState,
      saveFormatVersion: SAVE_FORMAT_VERSION
    };
    
    // Write to file with proper formatting
    const filePath = path.join(SAVES_DIRECTORY, filename);
    const saveData = JSON.stringify(saveFile, null, 2);
    
    await fs.writeFile(filePath, saveData, 'utf8');
    
    // Clean up old saves if we have too many
    await cleanupOldSaves();
    
    return {
      success: true,
      filename,
      message: `Game saved successfully as "${saveName}"`
    };
    
  } catch (error) {
    console.error('Error saving game:', error);
    return {
      success: false,
      message: 'Failed to save game due to file system error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Loads a game state from a save file
 * 
 * @param filename - The filename of the save to load
 * @returns Promise resolving to load result
 */
export async function loadGame(filename: string): Promise<LoadResult> {
  try {
    // Ensure the filename has the correct extension
    const saveFilename = filename.endsWith(SAVE_FILE_EXTENSION) 
      ? filename 
      : `${filename}${SAVE_FILE_EXTENSION}`;
    
    const filePath = path.join(SAVES_DIRECTORY, saveFilename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        message: `Save file "${saveFilename}" not found`,
        error: 'File does not exist'
      };
    }
    
    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const saveData = JSON.parse(fileContent);
    
    // Validate the save file structure
    const validation = validateSaveFile(saveData);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Save file is corrupted or invalid',
        error: validation.error
      };
    }
    
    // Check save format compatibility
    if (saveData.saveFormatVersion !== SAVE_FORMAT_VERSION) {
      // In the future, we could implement migration logic here
      console.warn(`Loading save file with different format version: ${saveData.saveFormatVersion}`);
    }
    
    return {
      success: true,
      gameState: saveData.gameState,
      metadata: saveData.metadata,
      message: `Game loaded successfully: "${saveData.metadata.saveName}"`
    };
    
  } catch (error) {
    console.error('Error loading game:', error);
    
    if (error instanceof SyntaxError) {
      return {
        success: false,
        message: 'Save file is corrupted (invalid JSON)',
        error: 'JSON parse error'
      };
    }
    
    return {
      success: false,
      message: 'Failed to load game due to file system error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Lists all available saved games
 * 
 * @returns Promise resolving to array of save metadata
 */
export async function listSavedGames(): Promise<SaveGameMetadata[]> {
  try {
    await ensureSavesDirectory();
    
    const files = await fs.readdir(SAVES_DIRECTORY);
    const saveFiles = files.filter(file => file.endsWith(SAVE_FILE_EXTENSION));
    
    const saves: SaveGameMetadata[] = [];
    
    // Read metadata from each save file
    for (const file of saveFiles) {
      try {
        const filePath = path.join(SAVES_DIRECTORY, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const saveData = JSON.parse(fileContent);
        
        if (saveData.metadata) {
          saves.push(saveData.metadata);
        }
      } catch (error) {
        console.warn(`Could not read save file ${file}:`, error);
        // Continue with other files
      }
    }
    
    // Sort by save date (newest first)
    saves.sort((a, b) => new Date(b.saveDate).getTime() - new Date(a.saveDate).getTime());
    
    return saves;
    
  } catch (error) {
    console.error('Error listing saved games:', error);
    return [];
  }
}

/**
 * Deletes a saved game file
 * 
 * @param filename - The filename of the save to delete
 * @returns Promise resolving to deletion result
 */
export async function deleteSavedGame(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    const saveFilename = filename.endsWith(SAVE_FILE_EXTENSION) 
      ? filename 
      : `${filename}${SAVE_FILE_EXTENSION}`;
    
    const filePath = path.join(SAVES_DIRECTORY, saveFilename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        message: `Save file "${saveFilename}" not found`
      };
    }
    
    await fs.unlink(filePath);
    
    return {
      success: true,
      message: `Save file "${saveFilename}" deleted successfully`
    };
    
  } catch (error) {
    console.error('Error deleting save file:', error);
    return {
      success: false,
      message: 'Failed to delete save file'
    };
  }
}

/**
 * Cleans up old save files to prevent unlimited accumulation
 */
async function cleanupOldSaves(): Promise<void> {
  try {
    const saves = await listSavedGames();
    
    if (saves.length > MAX_SAVE_FILES) {
      // Sort by date and remove oldest files
      const filesToRemove = saves.slice(MAX_SAVE_FILES);
      
      for (const save of filesToRemove) {
        try {
          await deleteSavedGame(save.filename);
          console.log(`Cleaned up old save file: ${save.filename}`);
        } catch (error) {
          console.warn(`Failed to clean up save file ${save.filename}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error during save cleanup:', error);
  }
}

/**
 * Creates a backup of an existing save file before overwriting
 */
export async function createSaveBackup(filename: string): Promise<boolean> {
  try {
    const saveFilename = filename.endsWith(SAVE_FILE_EXTENSION) 
      ? filename 
      : `${filename}${SAVE_FILE_EXTENSION}`;
    
    const originalPath = path.join(SAVES_DIRECTORY, saveFilename);
    const backupPath = path.join(SAVES_DIRECTORY, `backup_${saveFilename}`);
    
    // Check if original file exists
    try {
      await fs.access(originalPath);
    } catch {
      return false; // Original doesn't exist, no backup needed
    }
    
    // Copy to backup
    await fs.copyFile(originalPath, backupPath);
    return true;
    
  } catch (error) {
    console.error('Error creating save backup:', error);
    return false;
  }
}
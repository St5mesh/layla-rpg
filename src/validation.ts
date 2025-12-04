/**
 * validation.ts - Input validation utilities for RPG API
 * 
 * This module provides reusable validation functions for API endpoints
 * to ensure data integrity and provide clear error messages.
 */

import { GameState } from './rpgEngine';

// ==================== VALIDATION ERROR TYPES ====================

/**
 * Standard validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result with success status and errors
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== BASIC INPUT VALIDATORS ====================

/**
 * Validates that a string parameter is provided and not empty
 */
export function validateRequiredString(
  value: any, 
  fieldName: string, 
  minLength: number = 1
): ValidationError | null {
  if (!value) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'MISSING_REQUIRED_FIELD'
    };
  }

  if (typeof value !== 'string') {
    return {
      field: fieldName,
      message: `${fieldName} must be a string`,
      code: 'INVALID_TYPE'
    };
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} character${minLength === 1 ? '' : 's'} long`,
      code: 'INVALID_LENGTH'
    };
  }

  return null;
}

/**
 * Validates that a player name is valid
 */
export function validatePlayerName(playerName: any): ValidationError | null {
  const stringError = validateRequiredString(playerName, 'playerName', 1);
  if (stringError) return stringError;

  const trimmed = playerName.trim();
  if (trimmed.length > 50) {
    return {
      field: 'playerName',
      message: 'Player name must be 50 characters or less',
      code: 'INVALID_LENGTH'
    };
  }

  // Check for invalid characters (allow letters, numbers, spaces, basic punctuation)
  if (!/^[a-zA-Z0-9\s\-_'.]+$/.test(trimmed)) {
    return {
      field: 'playerName',
      message: 'Player name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, apostrophes, and periods are allowed',
      code: 'INVALID_CHARACTERS'
    };
  }

  return null;
}

// ==================== GAME-SPECIFIC VALIDATORS ====================

/**
 * Validates that an enemy name exists at the current location
 */
export function validateEnemyTarget(
  gameState: GameState, 
  targetName: any
): ValidationResult {
  const errors: ValidationError[] = [];

  // Basic string validation
  const stringError = validateRequiredString(targetName, 'target', 1);
  if (stringError) {
    errors.push(stringError);
    return { isValid: false, errors };
  }

  const currentLocation = gameState.locations[gameState.player.currentLocation];
  if (!currentLocation) {
    errors.push({
      field: 'gameState',
      message: 'Invalid game state: current location not found',
      code: 'INVALID_GAME_STATE'
    });
    return { isValid: false, errors };
  }

  // Check if enemy exists at current location (case-insensitive)
  const enemyExists = currentLocation.enemies.some(
    enemy => enemy.name.toLowerCase() === targetName.toLowerCase().trim()
  );

  if (!enemyExists) {
    const availableEnemies = currentLocation.enemies.map(e => e.name);
    errors.push({
      field: 'target',
      message: availableEnemies.length > 0
        ? `Enemy "${targetName}" not found at this location. Available enemies: ${availableEnemies.join(', ')}`
        : `No enemies found at this location. Try moving to a different area first.`,
      code: 'ENEMY_NOT_FOUND'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a location exists and is accessible from current location
 */
export function validateLocationMove(
  gameState: GameState,
  targetLocationId: any
): ValidationResult {
  const errors: ValidationError[] = [];

  // Basic string validation
  const stringError = validateRequiredString(targetLocationId, 'location', 1);
  if (stringError) {
    errors.push(stringError);
    return { isValid: false, errors };
  }

  const currentLocation = gameState.locations[gameState.player.currentLocation];
  if (!currentLocation) {
    errors.push({
      field: 'gameState',
      message: 'Invalid game state: current location not found',
      code: 'INVALID_GAME_STATE'
    });
    return { isValid: false, errors };
  }

  const targetId = targetLocationId.trim().toLowerCase();

  // Check if target location exists in the game
  const targetExists = Object.keys(gameState.locations).some(
    locationId => locationId.toLowerCase() === targetId
  );

  if (!targetExists) {
    const availableLocations = Object.keys(gameState.locations);
    errors.push({
      field: 'location',
      message: `Location "${targetLocationId}" does not exist. Available locations: ${availableLocations.join(', ')}`,
      code: 'LOCATION_NOT_FOUND'
    });
    return { isValid: false, errors };
  }

  // Check if target location is accessible from current location
  const actualLocationId = Object.keys(gameState.locations).find(
    id => id.toLowerCase() === targetId
  );

  if (actualLocationId && !currentLocation.exits.includes(actualLocationId)) {
    errors.push({
      field: 'location',
      message: `Cannot reach "${targetLocationId}" from ${currentLocation.name}. Available exits: ${currentLocation.exits.join(', ')}`,
      code: 'LOCATION_NOT_ACCESSIBLE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a location ID exists for description requests
 */
export function validateLocationForDescription(
  gameState: GameState,
  locationId?: any
): ValidationResult {
  const errors: ValidationError[] = [];

  // If no locationId provided, it's valid (will describe current location)
  if (!locationId) {
    return { isValid: true, errors: [] };
  }

  // Basic string validation
  const stringError = validateRequiredString(locationId, 'location', 1);
  if (stringError) {
    errors.push(stringError);
    return { isValid: false, errors };
  }

  const targetId = locationId.trim().toLowerCase();

  // Check if location exists
  const locationExists = Object.keys(gameState.locations).some(
    id => id.toLowerCase() === targetId
  );

  if (!locationExists) {
    const availableLocations = Object.keys(gameState.locations);
    errors.push({
      field: 'location',
      message: `Location "${locationId}" does not exist. Available locations: ${availableLocations.join(', ')}`,
      code: 'LOCATION_NOT_FOUND'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== VALIDATION HELPERS ====================

/**
 * Formats validation errors into a user-friendly error response
 */
export function formatValidationErrors(errors: ValidationError[]): {
  error: string;
  message: string;
  details: ValidationError[];
} {
  if (errors.length === 0) {
    return {
      error: 'Validation failed',
      message: 'Unknown validation error',
      details: []
    };
  }

  if (errors.length === 1) {
    return {
      error: 'Validation failed',
      message: errors[0].message,
      details: errors
    };
  }

  return {
    error: 'Validation failed',
    message: `Multiple validation errors: ${errors.map(e => e.message).join('; ')}`,
    details: errors
  };
}

/**
 * Creates a standardized validation error response for API endpoints
 */
export function createValidationErrorResponse(validationResult: ValidationResult) {
  const formatted = formatValidationErrors(validationResult.errors);
  return {
    success: false,
    ...formatted
  };
}
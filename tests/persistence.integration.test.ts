/**
 * persistence.integration.test.ts - Integration Tests for Game State Persistence
 * 
 * These tests verify that the persistence system works correctly by testing:
 * - Save game functionality (file creation, validation, metadata)
 * - Load game functionality (file reading, state restoration, validation)
 * - Save file management (listing, deletion, cleanup)
 * - API endpoints for persistence (/save_game, /load_game, /saved_games)
 * - Error handling and edge cases
 * 
 * Run tests with: npm test
 */

import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { app, resetGameState } from '../src/apiServer';
import { saveGame, loadGame, listSavedGames, deleteSavedGame } from '../src/persistence';
import { createDefaultGameState, GameState } from '../src/rpgEngine';

describe('Game State Persistence Tests', () => {
  
  const TEST_SAVES_DIR = 'test_saves';
  const ORIGINAL_SAVES_DIR = 'saves';
  
  beforeAll(async () => {
    // Create test saves directory
    try {
      await fs.mkdir(TEST_SAVES_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });
  
  beforeEach(() => {
    // Reset game state before each test
    resetGameState('TestHero');
  });
  
  afterAll(async () => {
    // Clean up test saves directory
    try {
      const files = await fs.readdir(TEST_SAVES_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TEST_SAVES_DIR, file));
      }
      await fs.rmdir(TEST_SAVES_DIR);
    } catch (error) {
      // Directory might not exist or might not be empty
      console.warn('Could not clean up test saves directory:', error);
    }
  });

  // ==================== CORE PERSISTENCE FUNCTIONS ====================
  
  describe('Core Persistence Functions', () => {
    
    describe('saveGame()', () => {
      it('should save a valid game state to a file', async () => {
        const gameState = createDefaultGameState('TestPlayer');
        const result = await saveGame(gameState, 'Test Save');
        
        expect(result.success).toBe(true);
        expect(result.filename).toBeDefined();
        expect(result.filename).toContain('TestPlayer');
        expect(result.filename).toContain('Test_Save');
        expect(result.message).toContain('saved successfully');
        
        // Verify file exists
        const filePath = path.join(ORIGINAL_SAVES_DIR, result.filename!);
        await expect(fs.access(filePath)).resolves.not.toThrow();
        
        // Clean up
        if (result.filename) {
          await deleteSavedGame(result.filename);
        }
      });

      it('should create valid JSON save file with correct structure', async () => {
        const gameState = createDefaultGameState('TestPlayer');
        const result = await saveGame(gameState, 'Structure Test');
        
        expect(result.success).toBe(true);
        
        if (result.filename) {
          // Read and parse the saved file
          const filePath = path.join(ORIGINAL_SAVES_DIR, result.filename);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const saveData = JSON.parse(fileContent);
          
          // Verify structure
          expect(saveData).toHaveProperty('metadata');
          expect(saveData).toHaveProperty('gameState');
          expect(saveData).toHaveProperty('saveFormatVersion');
          
          // Verify metadata
          expect(saveData.metadata.saveName).toBe('Structure Test');
          expect(saveData.metadata.playerName).toBe('TestPlayer');
          expect(saveData.metadata.playerLevel).toBe(1);
          expect(saveData.metadata.saveDate).toBeDefined();
          expect(saveData.metadata.gameVersion).toBeDefined();
          
          // Verify game state
          expect(saveData.gameState.player.name).toBe('TestPlayer');
          expect(saveData.gameState.locations).toBeDefined();
          
          // Clean up
          await deleteSavedGame(result.filename);
        }
      });

      it('should handle invalid game state gracefully', async () => {
        const invalidGameState = {
          player: null,
          locations: {}
        } as any;
        
        const result = await saveGame(invalidGameState, 'Invalid Save');
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid game state');
        expect(result.error).toBeDefined();
      });

      it('should sanitize save names and filenames', async () => {
        const gameState = createDefaultGameState('Test@Player#');
        const result = await saveGame(gameState, 'Test Save With /\\|<>:"*? Characters');
        
        expect(result.success).toBe(true);
        expect(result.filename).toBeDefined();
        
        // Verify filename is sanitized (no special characters)
        expect(result.filename).toMatch(/^[a-zA-Z0-9_\-]+\\.json$/);
        
        if (result.filename) {
          await deleteSavedGame(result.filename);
        }
      });
    });

    describe('loadGame()', () => {
      it('should load a previously saved game state', async () => {
        // First save a game
        const originalGameState = createDefaultGameState('LoadTestPlayer');
        originalGameState.player.stats.health = 75; // Modify to verify loading
        originalGameState.player.inventory = ['test_item'];
        
        const saveResult = await saveGame(originalGameState, 'Load Test');
        expect(saveResult.success).toBe(true);
        
        if (saveResult.filename) {
          // Now load it
          const loadResult = await loadGame(saveResult.filename);
          
          expect(loadResult.success).toBe(true);
          expect(loadResult.gameState).toBeDefined();
          expect(loadResult.metadata).toBeDefined();
          
          // Verify loaded state matches original
          expect(loadResult.gameState!.player.name).toBe('LoadTestPlayer');
          expect(loadResult.gameState!.player.stats.health).toBe(75);
          expect(loadResult.gameState!.player.inventory).toContain('test_item');
          
          // Clean up
          await deleteSavedGame(saveResult.filename);
        }
      });

      it('should handle non-existent save files gracefully', async () => {
        const result = await loadGame('nonexistent_save_file.json');
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
        expect(result.error).toBe('File does not exist');
      });

      it('should handle corrupted save files gracefully', async () => {
        // Create a corrupted save file
        const corruptedFilename = 'corrupted_save_test.json';
        const filePath = path.join(ORIGINAL_SAVES_DIR, corruptedFilename);
        
        await fs.mkdir(ORIGINAL_SAVES_DIR, { recursive: true });
        await fs.writeFile(filePath, '{ invalid json content', 'utf8');
        
        const result = await loadGame(corruptedFilename);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('corrupted');
        
        // Clean up
        await fs.unlink(filePath);
      });
    });

    describe('listSavedGames()', () => {
      it('should list all saved games with metadata', async () => {
        // Save a few test games
        const gameState1 = createDefaultGameState('Player1');
        const gameState2 = createDefaultGameState('Player2');
        
        const save1 = await saveGame(gameState1, 'Save One');
        const save2 = await saveGame(gameState2, 'Save Two');
        
        expect(save1.success).toBe(true);
        expect(save2.success).toBe(true);
        
        // List saves
        const saves = await listSavedGames();
        
        // Should contain our test saves
        const testSaves = saves.filter(save => 
          save.saveName.includes('Save One') || save.saveName.includes('Save Two')
        );
        
        expect(testSaves.length).toBeGreaterThanOrEqual(2);
        
        // Verify metadata structure
        for (const save of testSaves) {
          expect(save).toHaveProperty('filename');
          expect(save).toHaveProperty('saveName');
          expect(save).toHaveProperty('playerName');
          expect(save).toHaveProperty('saveDate');
          expect(save).toHaveProperty('gameVersion');
        }
        
        // Clean up
        if (save1.filename) await deleteSavedGame(save1.filename);
        if (save2.filename) await deleteSavedGame(save2.filename);
      });

      it('should return empty array when no saves exist', async () => {
        // First clean up any existing saves from our tests
        const existingSaves = await listSavedGames();
        for (const save of existingSaves) {
          if (save.filename.includes('Player') || save.filename.includes('Test')) {
            await deleteSavedGame(save.filename);
          }
        }
        
        const saves = await listSavedGames();
        const testSaves = saves.filter(save => 
          save.playerName.includes('Player') || save.playerName.includes('Test')
        );
        
        expect(testSaves.length).toBe(0);
      });
    });

    describe('deleteSavedGame()', () => {
      it('should delete an existing save file', async () => {
        // Create a save to delete
        const gameState = createDefaultGameState('DeleteTestPlayer');
        const saveResult = await saveGame(gameState, 'Delete Test');
        
        expect(saveResult.success).toBe(true);
        
        if (saveResult.filename) {
          // Delete it
          const deleteResult = await deleteSavedGame(saveResult.filename);
          
          expect(deleteResult.success).toBe(true);
          expect(deleteResult.message).toContain('deleted successfully');
          
          // Verify it's gone
          const filePath = path.join(ORIGINAL_SAVES_DIR, saveResult.filename);
          await expect(fs.access(filePath)).rejects.toThrow();
        }
      });

      it('should handle deleting non-existent files gracefully', async () => {
        const result = await deleteSavedGame('nonexistent_file.json');
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
      });
    });
  });

  // ==================== API ENDPOINTS ====================
  
  describe('Persistence API Endpoints', () => {
    
    describe('POST /save_game', () => {
      it('should save the current game state via API', async () => {
        const response = await request(app)
          .post('/save_game')
          .send({ saveName: 'API Test Save' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.filename).toBeDefined();
        expect(response.body.message).toContain('saved successfully');
        expect(response.body.timestamp).toBeDefined();
        
        // Clean up
        if (response.body.filename) {
          await deleteSavedGame(response.body.filename);
        }
      });

      it('should use default save name when none provided', async () => {
        const response = await request(app)
          .post('/save_game')
          .send({})
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Auto Save');
        
        if (response.body.filename) {
          await deleteSavedGame(response.body.filename);
        }
      });

      it('should validate save name parameter', async () => {
        const response = await request(app)
          .post('/save_game')
          .send({ saveName: '' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_SAVE_NAME');
      });
    });

    describe('POST /load_game', () => {
      it('should load a saved game state via API', async () => {
        // First create a save with modified state
        const modifiedState = createDefaultGameState('APILoadTest');
        modifiedState.player.stats.health = 80;
        const saveResult = await saveGame(modifiedState, 'API Load Test');
        
        expect(saveResult.success).toBe(true);
        
        if (saveResult.filename) {
          // Reset game state to default
          resetGameState('DifferentPlayer');
          
          // Load the saved state via API
          const response = await request(app)
            .post('/load_game')
            .send({ filename: saveResult.filename })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.message).toContain('loaded successfully');
          expect(response.body.description).toBeDefined();
          expect(response.body.player.name).toBe('APILoadTest');
          expect(response.body.metadata).toBeDefined();
          
          // Clean up
          await deleteSavedGame(saveResult.filename);
        }
      });

      it('should validate filename parameter', async () => {
        const response = await request(app)
          .post('/load_game')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('MISSING_FILENAME');
      });

      it('should handle non-existent save files in API', async () => {
        const response = await request(app)
          .post('/load_game')
          .send({ filename: 'nonexistent_save.json' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('LOAD_FAILED');
        expect(response.body.message).toContain('not found');
      });
    });

    describe('GET /saved_games', () => {
      it('should list all saved games via API', async () => {
        // Create some test saves
        const gameState1 = createDefaultGameState('APIListTest1');
        const gameState2 = createDefaultGameState('APIListTest2');
        
        const save1 = await saveGame(gameState1, 'API List Test 1');
        const save2 = await saveGame(gameState2, 'API List Test 2');
        
        const response = await request(app)
          .get('/saved_games')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.saves).toBeDefined();
        expect(Array.isArray(response.body.saves)).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.message).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        
        // Should contain our test saves
        const testSaves = response.body.saves.filter((save: any) => 
          save.saveName.includes('API List Test')
        );
        
        expect(testSaves.length).toBeGreaterThanOrEqual(2);
        
        // Clean up
        if (save1.filename) await deleteSavedGame(save1.filename);
        if (save2.filename) await deleteSavedGame(save2.filename);
      });

      it('should return appropriate message when no saves exist', async () => {
        // Clean up any existing test saves
        const allSaves = await listSavedGames();
        for (const save of allSaves) {
          if (save.playerName.includes('Test') || save.playerName.includes('API')) {
            await deleteSavedGame(save.filename);
          }
        }
        
        const response = await request(app)
          .get('/saved_games')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(0);
        expect(response.body.message).toContain('No saved games found');
      });
    });

    describe('DELETE /saved_games/:filename', () => {
      it('should delete a saved game via API', async () => {
        // Create a save to delete
        const gameState = createDefaultGameState('APIDeleteTest');
        const saveResult = await saveGame(gameState, 'API Delete Test');
        
        expect(saveResult.success).toBe(true);
        
        if (saveResult.filename) {
          const response = await request(app)
            .delete(`/saved_games/${saveResult.filename}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.message).toContain('deleted successfully');
          expect(response.body.timestamp).toBeDefined();
          
          // Verify it's actually deleted
          const loadResult = await loadGame(saveResult.filename);
          expect(loadResult.success).toBe(false);
        }
      });

      it('should handle deleting non-existent files via API', async () => {
        const response = await request(app)
          .delete('/saved_games/nonexistent_save.json')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('DELETE_FAILED');
      });

      it('should validate filename parameter in delete endpoint', async () => {
        const response = await request(app)
          .delete('/saved_games/')
          .expect(404); // Express will return 404 for empty parameter

        // Should handle this gracefully - the route won't match
      });
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  
  describe('Complete Save/Load Scenarios', () => {
    
    it('should maintain complete game state through save/load cycle', async () => {
      // Modify game state significantly
      const response1 = await request(app)
        .post('/move')
        .send({ location: 'cellar' });
      expect(response1.body.success).toBe(true);
      
      const response2 = await request(app)
        .post('/attack')
        .send({ target: 'Giant Rat' });
      expect(response2.body.success).toBe(true);
      
      // Save the current state
      const saveResponse = await request(app)
        .post('/save_game')
        .send({ saveName: 'Integration Test Save' });
      expect(saveResponse.body.success).toBe(true);
      
      // Start a new game (this resets state)
      const newGameResponse = await request(app)
        .post('/new_game')
        .send({ playerName: 'NewPlayer' });
      expect(newGameResponse.body.success).toBe(true);
      
      // Verify state was reset
      const statsResponse1 = await request(app).get('/get_stats');
      expect(statsResponse1.body.data.name).toBe('NewPlayer');
      expect(statsResponse1.body.data.currentLocation).toBe('tavern');
      
      // Load the saved state
      const loadResponse = await request(app)
        .post('/load_game')
        .send({ filename: saveResponse.body.filename });
      expect(loadResponse.body.success).toBe(true);
      
      // Verify state was restored
      const statsResponse2 = await request(app).get('/get_stats');
      expect(statsResponse2.body.data.name).toBe('TestHero');
      expect(statsResponse2.body.data.currentLocation).toBe('cellar');
      
      // Clean up
      if (saveResponse.body.filename) {
        await deleteSavedGame(saveResponse.body.filename);
      }
    });

    it('should handle multiple saves and loads correctly', async () => {
      const saves: string[] = [];
      
      try {
        // Create multiple save points
        for (let i = 1; i <= 3; i++) {
          // Modify player health to differentiate saves
          resetGameState(`Player${i}`);
          
          const saveResponse = await request(app)
            .post('/save_game')
            .send({ saveName: `Save Point ${i}` });
          
          expect(saveResponse.body.success).toBe(true);
          saves.push(saveResponse.body.filename);
        }
        
        // List saves and verify all are there
        const listResponse = await request(app).get('/saved_games');
        expect(listResponse.body.success).toBe(true);
        
        const ourSaves = listResponse.body.saves.filter((save: any) => 
          save.saveName.includes('Save Point')
        );
        expect(ourSaves.length).toBe(3);
        
        // Load the middle save
        const loadResponse = await request(app)
          .post('/load_game')
          .send({ filename: saves[1] });
        
        expect(loadResponse.body.success).toBe(true);
        expect(loadResponse.body.player.name).toBe('Player2');
        
      } finally {
        // Clean up all saves
        for (const filename of saves) {
          if (filename) {
            await deleteSavedGame(filename);
          }
        }
      }
    });
  });
});
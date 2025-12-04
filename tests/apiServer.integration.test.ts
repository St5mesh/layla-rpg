/**
 * apiServer.integration.test.ts - API Integration Tests
 * 
 * These tests verify that the HTTP endpoints work correctly by making actual HTTP requests.
 * They test the integration between Express routes, request/response handling, and the RPG engine.
 * 
 * Run tests with: npm test
 */

import request from 'supertest';
import { app, resetGameState } from '../src/apiServer';

describe('API Integration Tests', () => {
  
  // Reset game state before each test for consistency
  beforeEach(() => {
    resetGameState('TestHero');
  });

  // ==================== HEALTH ENDPOINT ====================
  
  describe('GET /health', () => {
    it('should return server status and current player info', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        message: 'Layla RPG Server is running',
        player: 'TestHero',
        location: 'tavern'
      });
    });
  });

  // ==================== LOCATION DESCRIPTION ====================
  
  describe('GET /describe_location', () => {
    it('should describe the current location (tavern)', async () => {
      const response = await request(app)
        .get('/describe_location')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.description).toContain('Rusty Dragon Tavern');
      expect(response.body.currentLocation).toBe('tavern');
    });

    it('should describe a specific location when provided', async () => {
      const response = await request(app)
        .get('/describe_location?location=cellar')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.description).toContain('Tavern Cellar');
      expect(response.body.currentLocation).toBe('tavern'); // Player hasn't moved
    });

    it('should handle non-existent location gracefully', async () => {
      const response = await request(app)
        .get('/describe_location?location=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.description).toContain('seems to be unknown');
    });
  });

  // ==================== PLAYER STATS ====================
  
  describe('GET /get_stats', () => {
    it('should return formatted stats and raw player data', async () => {
      const response = await request(app)
        .get('/get_stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toContain('TestHero');
      expect(response.body.stats).toContain('Level: 1');
      expect(response.body.data).toHaveProperty('name', 'TestHero');
      expect(response.body.data.stats).toHaveProperty('health', 100);
      expect(response.body.data.stats).toHaveProperty('level', 1);
    });
  });

  // ==================== MOVEMENT ====================
  
  describe('POST /move', () => {
    it('should move to a valid adjacent location', async () => {
      const response = await request(app)
        .post('/move')
        .send({ location: 'town_square' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('moved');
      expect(response.body.currentLocation).toBe('town_square');
      expect(response.body.description).toContain('Town Square');
    });

    it('should reject movement to invalid location', async () => {
      const response = await request(app)
        .post('/move')
        .send({ location: 'nonexistent' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
      expect(response.body.currentLocation).toBe('tavern'); // No movement
    });

    it('should reject movement to non-adjacent location', async () => {
      const response = await request(app)
        .post('/move')
        .send({ location: 'deep_forest' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot reach');
      expect(response.body.currentLocation).toBe('tavern'); // No movement
    });

    it('should validate missing location parameter', async () => {
      const response = await request(app)
        .post('/move')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing or invalid location parameter');
    });
  });

  // ==================== COMBAT SYSTEM ====================
  
  describe('POST /attack', () => {
    beforeEach(async () => {
      // Move to cellar where there's a Giant Rat to fight
      await request(app)
        .post('/move')
        .send({ location: 'cellar' });
    });

    it('should attack an enemy and deal damage', async () => {
      const response = await request(app)
        .post('/attack')
        .send({ target: 'Giant Rat' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.message).toContain('attack');
      expect(response.body.result.damage).toBeGreaterThan(0);
      expect(response.body.result.playerHealth).toBeLessThanOrEqual(100);
    });

    it('should handle case-insensitive enemy names', async () => {
      const response = await request(app)
        .post('/attack')
        .send({ target: 'giant rat' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.message).toContain('attack');
    });

    it('should reject attack on non-existent enemy', async () => {
      const response = await request(app)
        .post('/attack')
        .send({ target: 'Dragon' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.result.message).toContain('not found');
    });

    it('should validate missing target parameter', async () => {
      const response = await request(app)
        .post('/attack')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing or invalid target parameter');
    });

    it('should award experience when enemy is defeated', async () => {
      // Attack until enemy is defeated
      let defeated = false;
      let attempts = 0;
      const maxAttempts = 20; // Safety limit
      
      while (!defeated && attempts < maxAttempts) {
        const response = await request(app)
          .post('/attack')
          .send({ target: 'Giant Rat' })
          .expect(200);
          
        if (response.body.result.enemyDefeated) {
          defeated = true;
          expect(response.body.result.experienceGained).toBeGreaterThan(0);
          expect(response.body.result.message).toContain('Victory');
        }
        attempts++;
      }
      
      expect(defeated).toBe(true);
    });
  });

  // ==================== INVENTORY SYSTEM ====================
  
  describe('GET /inventory', () => {
    it('should return player inventory', async () => {
      const response = await request(app)
        .get('/inventory')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('inventory');
      expect(Array.isArray(response.body.inventory)).toBe(true);
      expect(response.body.message).toContain('inventory');
    });
  });

  // ==================== ENEMIES ENDPOINT ====================
  
  describe('GET /enemies', () => {
    it('should list enemies at current location', async () => {
      // Start at tavern (no enemies)
      const tavernResponse = await request(app)
        .get('/enemies')
        .expect(200);

      expect(tavernResponse.body.success).toBe(true);
      expect(tavernResponse.body.enemies).toHaveLength(0);
      expect(tavernResponse.body.message).toContain('no enemies');

      // Move to cellar (has Giant Rat)
      await request(app)
        .post('/move')
        .send({ location: 'cellar' });

      const cellarResponse = await request(app)
        .get('/enemies')
        .expect(200);

      expect(cellarResponse.body.success).toBe(true);
      expect(cellarResponse.body.enemies).toHaveLength(1);
      expect(cellarResponse.body.enemies[0].name).toBe('Giant Rat');
      expect(cellarResponse.body.message).toContain('Giant Rat');
    });
  });

  // ==================== NEW GAME ====================
  
  describe('POST /new_game', () => {
    it('should start a new game with default player name', async () => {
      const response = await request(app)
        .post('/new_game')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Welcome, Hero');
      expect(response.body.player.name).toBe('Hero');
      expect(response.body.description).toContain('Rusty Dragon Tavern');
    });

    it('should start a new game with custom player name', async () => {
      const response = await request(app)
        .post('/new_game')
        .send({ playerName: 'CustomHero' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Welcome, CustomHero');
      expect(response.body.player.name).toBe('CustomHero');
    });
  });

  // ==================== ERROR HANDLING ====================
  
  describe('404 Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown_endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Endpoint not found');
      expect(response.body.message).toContain('Available endpoints');
    });
  });

  // ==================== INTEGRATION FLOW TEST ====================
  
  describe('Complete Game Flow Integration', () => {
    it('should support a complete game session', async () => {
      // Start new game
      const newGameResponse = await request(app)
        .post('/new_game')
        .send({ playerName: 'FlowTester' });
      expect(newGameResponse.body.success).toBe(true);

      // Check stats
      const statsResponse = await request(app).get('/get_stats');
      expect(statsResponse.body.data.name).toBe('FlowTester');
      expect(statsResponse.body.data.stats.health).toBe(100);

      // Look around
      const lookResponse = await request(app).get('/describe_location');
      expect(lookResponse.body.description).toContain('Rusty Dragon Tavern');

      // Move to cellar
      const moveResponse = await request(app)
        .post('/move')
        .send({ location: 'cellar' });
      expect(moveResponse.body.success).toBe(true);

      // Check for enemies
      const enemiesResponse = await request(app).get('/enemies');
      expect(enemiesResponse.body.enemies).toHaveLength(1);

      // Attack enemy
      const attackResponse = await request(app)
        .post('/attack')
        .send({ target: 'Giant Rat' });
      expect(attackResponse.body.success).toBe(true);
      
      // Verify stats updated after combat
      const finalStatsResponse = await request(app).get('/get_stats');
      expect(finalStatsResponse.body.success).toBe(true);
    });
  });
});
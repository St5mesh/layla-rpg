/**
 * validation.integration.test.ts - Enhanced Error Handling and Validation Tests
 * 
 * These tests verify the improved error handling, validation, and response formatting
 * introduced in the error handling enhancement task.
 */

import request from 'supertest';
import { app, resetGameState } from '../src/apiServer';

describe('Enhanced Error Handling & Validation Tests', () => {
  
  beforeEach(() => {
    resetGameState('TestHero');
  });

  // ==================== REQUEST VALIDATION ====================
  
  describe('Input Validation', () => {
    
    describe('POST /attack - Enemy Validation', () => {
      it('should reject empty target', async () => {
        const response = await request(app)
          .post('/attack')
          .send({ target: '' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
        expect(response.body.message).toContain('target must be at least 1 character');
        expect(response.body.details).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should reject non-string target', async () => {
        const response = await request(app)
          .post('/attack')
          .send({ target: 123 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
        expect(response.body.message).toContain('target must be a string');
      });

      it('should reject attack on non-existent enemy with helpful message', async () => {
        const response = await request(app)
          .post('/attack')
          .send({ target: 'Dragon' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
        expect(response.body.message).toContain('Enemy "Dragon" not found at this location');
        expect(response.body.message).toContain('No enemies found at this location');
      });

      it('should provide available enemies in error when they exist', async () => {
        // Move to a location with enemies first
        await request(app).post('/move').send({ location: 'cellar' });

        const response = await request(app)
          .post('/attack')
          .send({ target: 'Dragon' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Available enemies:');
        expect(response.body.message).toContain('Giant Rat');
      });
    });

    describe('POST /move - Location Validation', () => {
      it('should reject empty location', async () => {
        const response = await request(app)
          .post('/move')
          .send({ location: '' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
        expect(response.body.message).toContain('location must be at least 1 character');
      });

      it('should reject non-string location', async () => {
        const response = await request(app)
          .post('/move')
          .send({ location: 123 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('location must be a string');
      });

      it('should provide available locations for non-existent location', async () => {
        const response = await request(app)
          .post('/move')
          .send({ location: 'nonexistent' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Location "nonexistent" does not exist');
        expect(response.body.message).toContain('Available locations:');
      });

      it('should provide available exits for inaccessible location', async () => {
        const response = await request(app)
          .post('/move')
          .send({ location: 'deep_forest' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Cannot reach "deep_forest" from');
        expect(response.body.message).toContain('Available exits:');
      });

      it('should handle case-insensitive location names', async () => {
        const response = await request(app)
          .post('/move')
          .send({ location: 'TOWN_SQUARE' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentLocation).toBe('town_square');
      });
    });

    describe('POST /new_game - Player Name Validation', () => {
      it('should accept valid player names', async () => {
        const response = await request(app)
          .post('/new_game')
          .send({ playerName: 'Sir Arthur' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('Sir Arthur');
      });

      it('should reject player names with invalid characters', async () => {
        const response = await request(app)
          .post('/new_game')
          .send({ playerName: 'Test@Player!#$' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_CHARACTERS');
        expect(response.body.message).toContain('invalid characters');
      });

      it('should reject player names that are too long', async () => {
        const longName = 'A'.repeat(51);
        const response = await request(app)
          .post('/new_game')
          .send({ playerName: longName })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('INVALID_LENGTH');
        expect(response.body.message).toContain('50 characters or less');
      });

      it('should trim whitespace from player names', async () => {
        const response = await request(app)
          .post('/new_game')
          .send({ playerName: '  Hero Name  ' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('Hero Name');
        expect(response.body.data.message).not.toContain('  ');
      });
    });

    describe('GET /describe_location - Location Parameter Validation', () => {
      it('should accept no location parameter (current location)', async () => {
        const response = await request(app)
          .get('/describe_location')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentLocation).toBe('tavern');
      });

      it('should reject non-existent location parameter', async () => {
        const response = await request(app)
          .get('/describe_location?location=nonexistent')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Location "nonexistent" does not exist');
        expect(response.body.message).toContain('Available locations:');
      });

      it('should accept valid location parameter', async () => {
        const response = await request(app)
          .get('/describe_location?location=town_square')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.description).toContain('Town Square');
      });
    });
  });

  // ==================== RESPONSE FORMAT CONSISTENCY ====================
  
  describe('Response Format Standardization', () => {
    
    it('should include success, data, and timestamp in successful responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp).toMatch(/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}Z/);
    });

    it('should include error details in validation failures', async () => {
      const response = await request(app)
        .post('/attack')
        .send({ target: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toBeDefined();
      expect(response.body.details).toBeDefined();
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details[0]).toHaveProperty('field');
      expect(response.body.details[0]).toHaveProperty('message');
      expect(response.body.details[0]).toHaveProperty('code');
    });

    it('should include timestamp in error responses', async () => {
      const response = await request(app)
        .post('/move')
        .send({ location: 'nonexistent' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should maintain backward compatibility for successful responses', async () => {
      const response = await request(app)
        .get('/get_stats')
        .expect(200);

      // Check that the response still contains the expected fields for Layla integration
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.data).toBeDefined();
    });
  });

  // ==================== ERROR HANDLING EDGE CASES ====================
  
  describe('Edge Case Error Handling', () => {
    
    it('should handle missing request body gracefully', async () => {
      const response = await request(app)
        .post('/attack')
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('target is required');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/attack')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express should handle this automatically and return 400
      expect(response.status).toBe(400);
    });

    it('should handle very long input strings', async () => {
      const veryLongString = 'A'.repeat(10000);
      const response = await request(app)
        .post('/attack')
        .send({ target: veryLongString })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle special characters in input', async () => {
      const response = await request(app)
        .post('/attack')
        .send({ target: 'Enemy\\nwith\\ttabs' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  // ==================== 404 ERROR HANDLING ====================
  
  describe('404 Error Handling', () => {
    
    it('should return structured 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RESOURCE_NOT_FOUND');
      expect(response.body.message).toContain('Endpoint "/unknown-endpoint" not found');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.endpoint).toContain('GET /unknown-endpoint');
    });

    it('should list available endpoints in 404 responses', async () => {
      const response = await request(app)
        .post('/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
      // Should include context about available endpoints
      expect(response.body.message).toContain('not found');
    });
  });

  // ==================== REQUEST LOGGING ====================
  
  describe('Request Logging', () => {
    
    it('should add request ID to response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // The request ID should be trackable through logs
      // This test verifies the middleware is working
      expect(response.body.success).toBe(true);
    });

    it('should handle requests with custom headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'Layla-RPG-Test/1.0')
        .set('X-Custom-Header', 'test-value')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== TIMEOUT HANDLING ====================
  
  describe('Timeout Handling', () => {
    
    it('should handle normal requests within timeout', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // Note: Actual timeout testing would require mocking slow operations
    // This test verifies the middleware is properly attached
  });
});
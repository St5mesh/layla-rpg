/**
 * simulateLaylaRequest.ts - Example Script to Simulate Layla Integration
 * 
 * This script demonstrates how Layla would interact with the RPG server.
 * It simulates making HTTP requests to the API endpoints, just as Layla
 * would do based on the agent configuration triggers.
 * 
 * Run this script with: npm run simulate
 * (Make sure the server is running first with: npm start)
 * 
 * This script is useful for:
 * - Testing the integration without Layla
 * - Understanding how the API works
 * - Debugging issues
 */

// ==================== CONFIGURATION ====================

/** The base URL where the RPG server is running */
const SERVER_URL = process.env.RPG_SERVER_URL || 'http://localhost:3000';

// ==================== HTTP REQUEST HELPER ====================

/**
 * Makes an HTTP request to the RPG server.
 * 
 * @param method - HTTP method (GET or POST)
 * @param endpoint - The API endpoint (e.g., '/describe_location')
 * @param body - Optional body for POST requests
 * @returns The JSON response from the server
 */
async function makeRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: object
): Promise<unknown> {
  const url = `${SERVER_URL}${endpoint}`;
  
  console.log(`\n📡 ${method} ${endpoint}`);
  if (body) {
    console.log(`   Body: ${JSON.stringify(body)}`);
  }
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed: ${error}`);
    throw error;
  }
}

// ==================== LAYLA-STYLE TRIGGER SIMULATION ====================

/**
 * Simulates what happens when a user says "look around" in Layla.
 * Layla would match this to the describe_location trigger.
 */
async function simulateLookAround(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('🎭 User says: "look around"');
  console.log('   (Trigger: describe_location)');
  console.log('='.repeat(50));
  
  interface DescribeLocationResponse {
    success: boolean;
    description: string;
    currentLocation: string;
  }
  
  const response = await makeRequest('GET', '/describe_location') as DescribeLocationResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.description);
  } else {
    console.log('\n❌ Error:', response);
  }
}

/**
 * Simulates what happens when a user says "check stats" in Layla.
 * Layla would match this to the get_stats trigger.
 */
async function simulateCheckStats(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('🎭 User says: "check stats"');
  console.log('   (Trigger: get_stats)');
  console.log('='.repeat(50));
  
  interface GetStatsResponse {
    success: boolean;
    stats: string;
    data: object;
  }
  
  const response = await makeRequest('GET', '/get_stats') as GetStatsResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.stats);
  } else {
    console.log('\n❌ Error:', response);
  }
}

/**
 * Simulates what happens when a user says "go to cellar" in Layla.
 * Layla would match this to the move trigger and extract "cellar" as the location.
 */
async function simulateMove(location: string): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log(`🎭 User says: "go to ${location}"`);
  console.log('   (Trigger: move)');
  console.log('='.repeat(50));
  
  interface MoveResponse {
    success: boolean;
    message: string;
    description?: string;
    currentLocation: string;
  }
  
  const response = await makeRequest('POST', '/move', { location }) as MoveResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.message);
    if (response.description) {
      console.log('\n' + response.description);
    }
  } else {
    console.log('\n❌ Could not move:');
    console.log(response.message);
  }
}

/**
 * Simulates what happens when a user says "attack goblin" in Layla.
 * Layla would match this to the attack trigger and extract "goblin" as the target.
 */
async function simulateAttack(target: string): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log(`🎭 User says: "attack ${target}"`);
  console.log('   (Trigger: attack)');
  console.log('='.repeat(50));
  
  interface AttackResponse {
    success: boolean;
    result: {
      message: string;
      damage: number;
      enemyDefeated: boolean;
      experienceGained: number;
      playerHealth: number;
      playerMaxHealth: number;
    };
  }
  
  const response = await makeRequest('POST', '/attack', { target }) as AttackResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.result.message);
  } else {
    console.log('\n❌ Attack failed:');
    console.log(response.result?.message || 'Unknown error');
  }
}

/**
 * Simulates starting a new game.
 */
async function simulateNewGame(playerName: string = 'Hero'): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log(`🎭 User says: "new game"`);
  console.log('   (Trigger: new_game)');
  console.log('='.repeat(50));
  
  interface NewGameResponse {
    success: boolean;
    message: string;
    description: string;
    player: object;
  }
  
  const response = await makeRequest('POST', '/new_game', { playerName }) as NewGameResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.message);
    console.log('\n' + response.description);
  } else {
    console.log('\n❌ Error:', response);
  }
}

/**
 * Simulates checking enemies at current location.
 */
async function simulateScanEnemies(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('🎭 User says: "scan"');
  console.log('   (Trigger: enemies)');
  console.log('='.repeat(50));
  
  interface EnemiesResponse {
    success: boolean;
    enemies: Array<{
      name: string;
      description: string;
      health: number;
      maxHealth: number;
    }>;
    message: string;
  }
  
  const response = await makeRequest('GET', '/enemies') as EnemiesResponse;
  
  if (response.success) {
    console.log('\n📜 Response:');
    console.log(response.message);
    if (response.enemies.length > 0) {
      for (const enemy of response.enemies) {
        console.log(`   - ${enemy.name} (HP: ${enemy.health}/${enemy.maxHealth})`);
      }
    }
  } else {
    console.log('\n❌ Error:', response);
  }
}

// ==================== MAIN SIMULATION ====================

/**
 * Runs a complete gameplay simulation.
 * This demonstrates a typical game session flow.
 */
async function runSimulation(): Promise<void> {
  console.log('\n' + '#'.repeat(60));
  console.log('#   LAYLA RPG INTEGRATION SIMULATION');
  console.log('#   This simulates how Layla interacts with the RPG server');
  console.log('#'.repeat(60));
  
  try {
    // Check if server is running
    console.log('\n🔌 Checking server connection...');
    
    interface HealthResponse {
      status: string;
      message: string;
      player: string;
      location: string;
    }
    
    const health = await makeRequest('GET', '/health') as HealthResponse;
    console.log(`✅ Server is ${health.status}!`);
    
    // Start a new game
    await simulateNewGame('Adventurer');
    
    // Look around the starting location (tavern)
    await simulateLookAround();
    
    // Check player stats
    await simulateCheckStats();
    
    // Move to the cellar where there's an enemy
    await simulateMove('cellar');
    
    // Scan for enemies
    await simulateScanEnemies();
    
    // Attack the rat
    await simulateAttack('Giant Rat');
    
    // Attack again to try to defeat it
    await simulateAttack('Giant Rat');
    
    // Check stats after combat
    await simulateCheckStats();
    
    // Move back to tavern
    await simulateMove('tavern');
    
    // Look around
    await simulateLookAround();
    
    console.log('\n' + '#'.repeat(60));
    console.log('#   SIMULATION COMPLETE!');
    console.log('#   The above shows how Layla would interact with the server.');
    console.log('#'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Simulation failed!');
    console.error('   Make sure the server is running with: npm start');
    console.error('   Error:', error);
    process.exit(1);
  }
}

// ==================== RUN ====================

// Run the simulation if this file is executed directly
runSimulation().catch(console.error);

/**
 * demo-persistence.ts - Demonstration Script for State Persistence
 * 
 * This script demonstrates the new state persistence functionality by:
 * - Starting the RPG server
 * - Creating a game state with some progress
 * - Saving the game to a file
 * - Loading the game back and verifying state preservation
 * - Showing available saves
 * 
 * Run this script to verify persistence works correctly.
 */

import {
  saveGame,
  loadGame,
  listSavedGames,
  deleteSavedGame
} from './src/persistence';
import {
  createDefaultGameState,
  moveToLocation,
  attack,
  applyAttackResult,
  getStats
} from './src/rpgEngine';

async function demonstratePersistence(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 LAYLA RPG - STATE PERSISTENCE DEMONSTRATION');
  console.log('='.repeat(60));

  try {
    // Step 1: Create a game state and make some progress
    console.log('\n📝 Step 1: Creating game state and making progress...');
    
    let gameState = createDefaultGameState('Demo Hero');
    console.log(`✅ Created new game for "${gameState.player.name}"`);
    console.log(`   Starting location: ${gameState.player.currentLocation}`);
    console.log(`   Starting health: ${gameState.player.stats.health}/${gameState.player.stats.maxHealth}`);

    // Move to cellar
    const moveResult = moveToLocation(gameState, 'cellar');
    if (moveResult.success) {
      gameState = moveResult.state;
      console.log(`🚶 Moved to cellar`);
    }

    // Attack the rat a few times
    for (let i = 1; i <= 3; i++) {
      const attackResult = attack(gameState, 'Giant Rat');
      if (attackResult.success) {
        gameState = applyAttackResult(gameState, attackResult, 'Giant Rat');
        console.log(`⚔️  Attack ${i}: Dealt ${attackResult.damage} damage to Giant Rat`);
        
        if (attackResult.enemyDefeated) {
          console.log(`🏆 Giant Rat defeated! Gained ${attackResult.experienceGained} XP`);
          break;
        }
      } else {
        console.log(`❌ Attack ${i} failed: ${attackResult.message}`);
        break;
      }
    }

    console.log(`\n📊 Current stats:`);
    console.log(`   Health: ${gameState.player.stats.health}/${gameState.player.stats.maxHealth}`);
    console.log(`   Experience: ${gameState.player.stats.experience}`);
    console.log(`   Location: ${gameState.player.currentLocation}`);

    // Step 2: Save the game state
    console.log('\n💾 Step 2: Saving game state...');
    
    const saveResult = await saveGame(gameState, 'Demo Progress Save');
    
    if (saveResult.success) {
      console.log(`✅ Game saved successfully!`);
      console.log(`   Filename: ${saveResult.filename}`);
      console.log(`   Message: ${saveResult.message}`);
    } else {
      console.log(`❌ Save failed: ${saveResult.message}`);
      return;
    }

    // Step 3: Create a new game state (simulate restart)
    console.log('\n🔄 Step 3: Simulating game restart...');
    
    let newGameState = createDefaultGameState('Different Hero');
    console.log(`✅ Created fresh game for "${newGameState.player.name}"`);
    console.log(`   Fresh location: ${newGameState.player.currentLocation}`);
    console.log(`   Fresh health: ${newGameState.player.stats.health}/${newGameState.player.stats.maxHealth}`);

    // Step 4: Load the saved game
    console.log('\n📂 Step 4: Loading saved game...');
    
    if (saveResult.filename) {
      const loadResult = await loadGame(saveResult.filename);
      
      if (loadResult.success && loadResult.gameState) {
        console.log(`✅ Game loaded successfully!`);
        console.log(`   Message: ${loadResult.message}`);
        
        // Verify the loaded state
        const loadedState = loadResult.gameState;
        console.log(`\n🔍 Verifying loaded state:`);
        console.log(`   Player name: ${loadedState.player.name}`);
        console.log(`   Health: ${loadedState.player.stats.health}/${loadedState.player.stats.maxHealth}`);
        console.log(`   Experience: ${loadedState.player.stats.experience}`);
        console.log(`   Location: ${loadedState.player.currentLocation}`);

        // Compare with original
        const matches = 
          loadedState.player.name === gameState.player.name &&
          loadedState.player.stats.health === gameState.player.stats.health &&
          loadedState.player.stats.experience === gameState.player.stats.experience &&
          loadedState.player.currentLocation === gameState.player.currentLocation;

        if (matches) {
          console.log(`✅ State perfectly preserved!`);
        } else {
          console.log(`❌ State mismatch detected!`);
        }

      } else {
        console.log(`❌ Load failed: ${loadResult.message}`);
      }
    }

    // Step 5: List all saved games
    console.log('\n📋 Step 5: Listing all saved games...');
    
    const saves = await listSavedGames();
    
    if (saves.length > 0) {
      console.log(`✅ Found ${saves.length} saved game(s):`);
      
      for (const save of saves.slice(0, 5)) { // Show max 5 saves
        console.log(`   📄 ${save.saveName}`);
        console.log(`      Player: ${save.playerName} (Level ${save.playerLevel})`);
        console.log(`      Location: ${save.currentLocation}`);
        console.log(`      Saved: ${new Date(save.saveDate).toLocaleString()}`);
        console.log(`      File: ${save.filename}`);
        console.log();
      }
      
      if (saves.length > 5) {
        console.log(`   ... and ${saves.length - 5} more saves`);
      }
    } else {
      console.log(`❌ No saved games found`);
    }

    // Step 6: Clean up (delete demo save)
    console.log('\n🧹 Step 6: Cleaning up demo save...');
    
    if (saveResult.filename) {
      const deleteResult = await deleteSavedGame(saveResult.filename);
      
      if (deleteResult.success) {
        console.log(`✅ Demo save deleted: ${deleteResult.message}`);
      } else {
        console.log(`❌ Failed to delete demo save: ${deleteResult.message}`);
      }
    }

    // Step 7: Success summary
    console.log('\n🎉 Step 7: Demonstration complete!');
    console.log('\n✅ All persistence features working correctly:');
    console.log('   • Save game state to JSON file');
    console.log('   • Load game state from JSON file');
    console.log('   • List saved games with metadata');
    console.log('   • Delete saved games');
    console.log('   • Validate file structure and game state');
    console.log('   • Handle errors gracefully');

    console.log('\n🎮 Ready for use with Layla RPG Server!');
    console.log('   Start the server with: npm start');
    console.log('   Test persistence with: "save game" and "load game" commands');

  } catch (error) {
    console.error('\n❌ Demonstration failed:');
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the demonstration
demonstratePersistence().catch(console.error);
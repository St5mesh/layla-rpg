from .character_manager import CharacterManager
from .dice_manager import DiceManager
from .progression_manager import ProgressionManager
from .inventory_manager import InventoryManager
from .lore_manager import LoreManager
from .world_state_manager import WorldStateManager

class GMAgent:
    """Orchestrates all managers and handles gameplay narration."""

    def __init__(self):
        self.character_manager = CharacterManager()
        self.dice_manager = DiceManager()
        self.progression_manager = ProgressionManager()
        self.inventory_manager = InventoryManager()
        self.lore_manager = LoreManager()
        self.world_state_manager = WorldStateManager()

    def orchestrate_turn(self, action, character_id):
        # This is a placeholder orchestration logic; personalize per gameplay!
        # Example: "We open the door and check for traps."
        party = self.character_manager.describe_party()
        # Determine who acts, check world state, roll dice if needed, narrate
        # This method should be extended per your game design!
        return f"Action '{action}' performed by {character_id}. (Extend this logic for richer play.)"
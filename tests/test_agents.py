import unittest
from agents.character_manager import CharacterManager
from agents.dice_manager import DiceManager

class TestCharacterManager(unittest.TestCase):
    def test_add_and_get_character(self):
        cm = CharacterManager()
        cm.add_character("test", {"name": "Tester"})
        self.assertEqual(cm.get_character("test")["name"], "Tester")

class TestDiceManager(unittest.TestCase):
    def test_roll_dice(self):
        dm = DiceManager()
        for _ in range(100):
            roll = dm.roll_dice()
            self.assertTrue(1 <= roll <= 20)

if __name__ == '__main__':
    unittest.main()
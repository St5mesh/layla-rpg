import random

class DiceManager:
    """Provides random rolls, skill checks, and result narration."""

    def roll_dice(self, sides=20):
        return random.randint(1, sides)

    def skill_check(self, skill_value, difficulty=10, sides=20):
        roll = self.roll_dice(sides)
        success = (roll + skill_value) >= difficulty
        return {"roll": roll, "skill_value": skill_value, "difficulty": difficulty, "success": success}

    def show_roll(self, result):
        return f"Rolled {result['roll']} + Skill {result['skill_value']} vs DC {result['difficulty']} - {'Success' if result['success'] else 'Fail'}"
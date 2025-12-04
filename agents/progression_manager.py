class ProgressionManager:
    """Handles XP, levels, ability progression."""

    def __init__(self):
        self.progression = {}

    def add_xp(self, character_id, xp):
        self.progression.setdefault(character_id, {"xp": 0, "level": 1})
        self.progression[character_id]["xp"] += xp

    def level_up(self, character_id):
        self.progression.setdefault(character_id, {"xp": 0, "level": 1})
        self.progression[character_id]["level"] += 1

    def get_progression(self, character_id):
        return self.progression.get(character_id, {"xp": 0, "level": 1})
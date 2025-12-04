class CharacterManager:
    """Tracks all player and NPC stats, traits, inventory."""

    def __init__(self):
        self.characters = {}

    def add_character(self, character_id, data):
        self.characters[character_id] = data

    def update_character(self, character_id, data):
        if character_id in self.characters:
            self.characters[character_id].update(data)

    def get_character(self, character_id):
        return self.characters.get(character_id, {})

    def describe_party(self):
        return [self.characters[c] for c in self.characters]
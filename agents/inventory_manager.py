class InventoryManager:
    """Tracks items, transfers, party/character bags."""

    def __init__(self):
        self.inventories = {}

    def add_item(self, character_id, item):
        inv = self.inventories.setdefault(character_id, [])
        inv.append(item)

    def remove_item(self, character_id, item):
        inv = self.inventories.setdefault(character_id, [])
        if item in inv:
            inv.remove(item)

    def transfer_item(self, from_id, to_id, item):
        if item in self.inventories.get(from_id, []):
            self.remove_item(from_id, item)
            self.add_item(to_id, item)

    def list_inventory(self, character_id):
        return self.inventories.get(character_id, [])
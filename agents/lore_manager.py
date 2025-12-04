class LoreManager:
    """Stores snippets, recaps, lore entries, world encyclopedia."""

    def __init__(self):
        self.lore_entries = {}

    def add_lore(self, title, content):
        self.lore_entries[title] = content

    def get_lore(self, title):
        return self.lore_entries.get(title, "")

    def query_lore(self, keyword):
        return {title: self.lore_entries[title] 
                for title in self.lore_entries 
                if keyword.lower() in title.lower() or keyword.lower() in self.lore_entries[title].lower()}
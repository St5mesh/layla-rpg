class WorldStateManager:
    """Tracks evolving world locations, quest status, timeline/tags."""

    def __init__(self):
        self.state = {}
        self.event_log = []

    def update_state(self, key, value):
        self.state[key] = value
        self.event_log.append((key, value))

    def get_state(self, key):
        return self.state.get(key, None)

    def log_event(self, event):
        self.event_log.append(event)

    def get_event_log(self):
        return self.event_log
class Err(Exception):
    """Raised anywhere in a request to answer with an HTTP error: Err(403, "forbidden")."""

    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg

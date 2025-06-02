import os
import json

DEFAULT_CONFIG = {
    "log_dir": ".llmdebugger/logs",
    "cloud": False,
    "logging_account_id": None
}

CONFIG_PATH = os.path.expanduser("~/.llmdebugger/config.json")

def load_config():
    if not os.path.exists(CONFIG_PATH):
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        return DEFAULT_CONFIG

    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
        return {**DEFAULT_CONFIG, **config}
    except Exception:
        return DEFAULT_CONFIG

config = load_config()

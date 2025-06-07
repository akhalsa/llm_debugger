import os
import json
from datetime import datetime
from pathlib import Path
import hashlib

    
def find_project_root(start_dir=None):
    current = Path(start_dir or Path.cwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists() or (parent / "setup.py").exists():
            return parent
    return current  # fallback


PROJECT_ROOT = find_project_root()
LOG_DIR = PROJECT_ROOT / ".llmdebugger" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


# === Serialization ===

def extract_json(obj):
    if hasattr(obj, "model_dump"):
        obj = obj.model_dump()
    elif hasattr(obj, "dict"):
        obj = obj.dict()
    try:
        return json.loads(json.dumps(obj, default=str))
    except Exception:
        return {"raw": repr(obj)}

# === Load Hashes ===
def normalize_messages(messages):
    return [{"role": m["role"], "content": m["content"]} for m in messages]

def hash_messages(messages):
    normalized = normalize_messages(messages)
    string = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(string.encode("utf-8")).hexdigest()[:12]

    
def session_file_exists(messages):
    session_id = hash_messages(messages)
    return (LOG_DIR / f"{session_id}.json").exists()

def log_call(*, provider, args, kwargs, response, request_start_timestamp, request_end_timestamp, logging_account_id):
    messages = kwargs.get("messages", [])
    session_id = kwargs.get("session_id", None)

    log_entry = {
        "start_time": request_start_timestamp,
        "end_time": request_end_timestamp,
        "request_body": {
            "args": repr(args),  # to avoid serialization errors
            "kwargs": extract_json(kwargs),
        },
        "response": extract_json(response),
        "provider": provider,
        "logging_account_id": logging_account_id,
    }

    # If no session_id is provided, try to match based on message history
    if not session_id:
        # Use Dynamic Session IDs
        #Walk backwards through messages to find if any existing log files are available
        old_session_id = None
        for i in range(1, len(messages)):
            message_subset = messages[0:-i]
            if session_file_exists(message_subset):
                old_session_id = hash_messages(message_subset)
                break
        logs = []
        if old_session_id:
            #TODO: open the file at the path LOG_DIR / f"{old_session_id}.json"
            old_path = LOG_DIR / f"{old_session_id}.json"
            try:
                with open(old_path, "r") as f:
                    logs = json.load(f)
                    if not isinstance(logs, list):
                        logs = []
                #remove the old file since were going to create a new one
                os.remove(old_path)
            except Exception as e:
                print(f"Warning reading existing log: {e}")
                logs = []


        logs.append(log_entry)
        new_session_id = hash_messages(messages)
        new_path = LOG_DIR / f"{new_session_id}.json"
        with open(new_path, "w") as f:
                json.dump(logs, f, indent=2)
    else:
        # Use the provided session_id
        filepath = LOG_DIR / f"{session_id}.json"
        if filepath.exists():
            with open(filepath, "r") as f:
                logs = json.load(f)
                if not isinstance(logs, list):
                    logs = []
        else:
            logs = []

        logs.append(log_entry)
        with open(filepath, "w") as f:
            json.dump(logs, f, indent=2)



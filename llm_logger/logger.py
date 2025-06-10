import os
import json
import uuid
from datetime import datetime
from pathlib import Path
import hashlib

# === Project and Log Paths ===
def find_project_root(start_dir=None):
    current = Path(start_dir or Path.cwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists() or (parent / "setup.py").exists():
            return parent
    return current  # fallback

PROJECT_ROOT = find_project_root()
LOG_DIR = PROJECT_ROOT / ".llm_logger" / "logs"
THREAD_LOOKUP_FILE = PROJECT_ROOT / ".llm_logger" / "thread_lookups.json"
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

# === Hashing ===
def normalize_messages(messages):
    return [{"role": m["role"], "content": m["content"]} for m in messages]

def hash_messages(messages):
    normalized = normalize_messages(messages)
    string = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(string.encode("utf-8")).hexdigest()[:12]

# === Cache Loading ===
def load_thread_lookup():
    if THREAD_LOOKUP_FILE.exists():
        try:
            with open(THREAD_LOOKUP_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_thread_lookup(cache):
    with open(THREAD_LOOKUP_FILE, "w") as f:
        json.dump(cache, f, indent=2)

thread_lookup_by_message_hash = load_thread_lookup()
###
# thread_cache = {
#     "example_hash": {
#        "static_id": "static_id_1234",
#        "start_date":"2023-10-01"
#     },
#     # ... more entries
# }
###
THREAD_LOOKUP_STATIC_ID = "static_id"
THREAD_LOOKUP_LOG_FILE_PATH = "log_file_path"



# === Static ID Resolution ===
def find_existing_prefix_hash(messages):
    for i in range(len(messages) - 1, 0, -1):
        prefix = messages[:i]
        prefix_hash = hash_messages(prefix)
        if prefix_hash in thread_lookup_by_message_hash:
            return prefix_hash
    return None

def resolve_static_thread_id(messages, static_id: str | None = None):
    msg_hash = hash_messages(messages)

    # Return early if this message hash already exists
    if msg_hash in thread_lookup_by_message_hash:
        return thread_lookup_by_message_hash[msg_hash]

    prefix_hash = find_existing_prefix_hash(messages)

    if prefix_hash:
        # Inherit static ID and start date from prefix
        static_id = static_id or thread_lookup_by_message_hash[prefix_hash][THREAD_LOOKUP_STATIC_ID]
        log_file_path = thread_lookup_by_message_hash[prefix_hash][THREAD_LOOKUP_LOG_FILE_PATH]
        thread_lookup_by_message_hash.pop(prefix_hash)
    else:
        # Use current date if no prefix found
        static_id = static_id or str(uuid.uuid4())[:8]
        log_file_path = str(LOG_DIR / datetime.now().strftime("%Y-%m-%d") / f"{static_id}.json")

    # Store new thread entry
    thread_lookup_by_message_hash[msg_hash] = {
        THREAD_LOOKUP_STATIC_ID: static_id,
        THREAD_LOOKUP_LOG_FILE_PATH: log_file_path
    }

    save_thread_lookup(thread_lookup_by_message_hash)
    return thread_lookup_by_message_hash[msg_hash]

# === Logging Logic ===
def log_call(*, provider, args, kwargs, response, request_start_timestamp, request_end_timestamp, logging_account_id, session_id: str | None = None):
    messages = kwargs.get("messages", [])
    thread_data = resolve_static_thread_id(messages, session_id)
    filepath = thread_data[THREAD_LOOKUP_LOG_FILE_PATH]

    log_entry = {
        "start_time": request_start_timestamp,
        "end_time": request_end_timestamp,
        "provider": provider,
        "logging_account_id": logging_account_id,
        "request_body": {
            "args": repr(args),
            "kwargs": extract_json(kwargs),
        },
        "response": extract_json(response),
        "static_thread_id": thread_data[THREAD_LOOKUP_STATIC_ID],
    }
    path_obj = Path(filepath)
    if path_obj.exists():
        try:
            with open(path_obj, "r") as f:
                logs = json.load(f)
                if not isinstance(logs, list):
                    logs = []
        except Exception:
            logs = []
    else:
        logs = []

    logs.append(log_entry)
    path_obj.parent.mkdir(parents=True, exist_ok=True)
    with open(path_obj, "w") as f:
        json.dump(logs, f, indent=2)

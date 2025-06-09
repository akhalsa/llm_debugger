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
CACHE_FILE = PROJECT_ROOT / ".llm_logger" / "thread_cache.json"
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
def load_thread_cache():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_thread_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

thread_cache = load_thread_cache()

# === Static ID Resolution ===
def remove_prefix_matches(messages):
    for i in range(len(messages) - 1, 0, -1):
        prefix_hash = hash_messages(messages[:i])
        if prefix_hash in thread_cache:
            thread_cache.pop(prefix_hash)
            
def resolve_static_thread_id(messages, static_id: str | None = None):

    msg_hash = hash_messages(messages)

    if static_id:
        thread_cache[msg_hash] = static_id
        for i in range(len(messages) - 1, 0, -1):
            prefix = messages[:i]
            prefix_hash = hash_messages(prefix)
            if prefix_hash in thread_cache:
                thread_cache.pop(prefix_hash)
        save_thread_cache(thread_cache)
        return static_id  # Use provided static ID directly
    
    if msg_hash in thread_cache:
        return thread_cache[msg_hash]

    # Try prefix matching
    for i in range(len(messages) - 1, 0, -1):
        prefix = messages[:i]
        prefix_hash = hash_messages(prefix)
        if prefix_hash in thread_cache:
            static_id = thread_cache[prefix_hash]
            thread_cache.pop(prefix_hash)
            thread_cache[msg_hash] = static_id
            save_thread_cache(thread_cache)
            return static_id

    # Assign new thread ID
    new_static_id = str(uuid.uuid4())[:8]
    thread_cache[msg_hash] = new_static_id
    save_thread_cache(thread_cache)
    return new_static_id

# === Logging Logic ===
def log_call(*, provider, args, kwargs, response, request_start_timestamp, request_end_timestamp, logging_account_id, session_id: str | None = None):
    messages = kwargs.get("messages", [])
    static_thread_id = resolve_static_thread_id(messages, session_id)
    filepath = LOG_DIR / f"thread_{static_thread_id}.json"

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
        "static_thread_id": static_thread_id,
    }

    if filepath.exists():
        try:
            with open(filepath, "r") as f:
                logs = json.load(f)
                if not isinstance(logs, list):
                    logs = []
        except Exception:
            logs = []
    else:
        logs = []

    logs.append(log_entry)

    with open(filepath, "w") as f:
        json.dump(logs, f, indent=2)

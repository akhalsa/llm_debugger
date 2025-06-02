# llmdebugger/session.py

import hashlib
import json

def compute_session_id(message: dict, logging_account_id: str = "") -> str:
    print(f"Computing session ID for message: {message} with account ID: {logging_account_id}")
    try:
        canonical = {
            "role": message.get("role", ""),
            "content": message.get("content", "").strip(),
            "account": logging_account_id
        }
        raw = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        return "dynamic_"+hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    except Exception:
        return "unknown-session"
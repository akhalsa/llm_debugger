# LLM Debugger - Log and View Python Based LLM Conversations

**LLM Logger** is a lightweight, local-first tool for inspecting and understanding how your application interacts with large language models like OpenAI GPT-4.

It helps you:

* Log and inspect each model call with request/response metadata
* View differences between turns in a conversation
* Visualize tool calls, tool responses, and system prompts
* Compare prompt strategies and debug session behavior

Ideal for developers building agent workflows, chat interfaces, or prompt-based systems.

---

## ✨ Features

* ⚡ **One-line setup** – Start logging with a simple wrapper around your OpenAI client  
* 🧠 **Automatic session tracking** – No manual session IDs or state management required  
* 📀 **Local-first logging** – Stores structured logs as JSON on your machine  
* 🔍 **Rich session insights** – Context diffs, tool call/response blocks, and system prompt visibility  
* ⏱️ **Latency + metadata capture** – Track timing, models, and more with every call  
* 🧹 **Framework-agnostic** – Works with any Python codebase  
* 🛡️ **Privacy-first** – Fully offline, no account or server required  
* 🌐 **Simple UI** – Static frontend served locally; no build step needed for end users  
* 👐 **Open source (MIT)** – Lightweight, auditable, and easy to extend  

---

## 🎥 Demo

![LLM Logger Demo](https://raw.githubusercontent.com/akhalsa/LLM-Debugger-Tools/refs/heads/main/demo.gif)

---

## 📣 Model Support

Currently supports:

- ✅ OpenAI (`openai.ChatCompletion` and `openai.Completion` APIs)

Planned:

- ⏳ Anthropic Claude (`anthropic` Python SDK)

> Want Anthropic support soon? Upvote or open an issue [here](https://github.com/akhalsa/llm_debugger/issues).

---

## 📦 Installation

### 🔹 Installation Options

#### Option 1: From PyPI (Recommended for most users)

Install the prebuilt package:

```bash
pip install llm-logger
```

#### Option 2: Local Copy (For direct integration or customization)

Clone the repository and install:

```bash
# Clone the repo
git clone https://github.com/akhalsa/llm_debugger.git

# Rebuild UI (optional)
cd llm_debugger/llm_logger/front_end
npm install
npx tsc

# Install from local source
pip install ./llm_debugger
```

**Note:** All installation methods include pre-compiled frontend files. No Node.js or frontend build steps are required for basic usage. The static files (HTML, CSS, JS) are packaged with the library, so the debugger UI works out of the box. 

Rebuilding using npm install and npx tsc are required to update the .js files in the static/ folder

---

### 🔸 Development Setup (Only for contributors)

If you want to modify the logger or UI code:

1. **Prerequisites:**
   - Python ≥ 3.8
   - Node.js & npm (only needed for UI development)

2. **Setup:**
   ```bash
   git clone https://github.com/akhalsa/llm_debugger.git
   cd llm_debugger

   # Optional: Create a virtual environment
   python3 -m venv venv
   source venv/bin/activate

   # Install in development mode
   pip install -e .
   ```

3. **Frontend Development (only if modifying the UI):**
   ```bash
   cd llm_logger/front_end
   npm install
   npx tsc
   ```

4. **To Build And Upload To Pypi:**
Note: Build Front End Locally FIRST
    ```bash
    rm -r dist
    python3 -m build
    twine upload dist/*
    ```
---

## 🚀 Usage

### 1. Wrap Your OpenAI Client

```python
from dotenv import load_dotenv
import openai
import os
from llm_logger import wrap_openai

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

openai_client = wrap_openai(
    openai.OpenAI(api_key=api_key),
    logging_account_id="my_project"
)
```

Then use `openai_client` as normal:

```python
response = openai_client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What's the capital of France?"}
    ]
)
```

Logs are written to `.llm_logger/logs/`.

---

### 2. Launch the Log Viewer

#### Option A: Stand Alone Service Launched From Terminal
This option is ideal for viewing logs from an application running on your local device

```bash
# Default port (8000)
llm_logger

# Or specify a custom port
llm_logger -p 8000
```

Then open in your browser:
```
http://localhost:8000
```

#### Option B: As An Endpoint In Your Python Web Application

You can run the debugger UI alongside your application if you're using a python webapp

**Same Process (this example uses FastAPI but you can do something similar from any python webapp framework):**
```python
from fastapi import FastAPI
import uvicorn
from llm_logger.log_viewer import create_log_viewer_app
log_viewer_app = create_log_viewer_app(base_url="/debugger")

# Your main application
app = FastAPI()

# Mount the debugger UI at /debugger
app.mount("/debugger", log_viewer_app)

# Run your application
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

#### Option C: Docker — Run Your App + the Log Viewer in One Container

You can run both your own app and the log viewer in one container, using any process manager or framework you prefer. (Be sure to expose two ports) 

Example Dockerfile:

```dockerfile
EXPOSE 5000
EXPOSE 8000

CMD bash -c "\
  uvicorn your_app_module:app --host 0.0.0.0 --port 5000 & \
  uvicorn llm_logger.log_viewer:app --host 0.0.0.0 --port 8000 && wait"
```

> 🔁 **Not using `uvicorn`?**  
> Replace `uvicorn your_app_module:app --host 0.0.0.0 --port 5000` with whatever launches your app — it could be Flask, Gunicorn, a background service, or anything else.

---

## 🏷️ How Automatic Session Tagging Works: Technical Overview

### Message Fingerprinting

```python
# logger.py, lines 32-38
def hash_messages(messages):
    normalized = normalize_messages(messages)
    string = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(string.encode("utf-8")).hexdigest()[:12]
```

Each conversation is uniquely identified by creating a SHA-256 hash of its normalized messages, truncated to 12 characters for readability.

### Conversation Continuity Detection

```python
# logger.py, lines 79-85
def find_existing_prefix_hash(messages):
    for i in range(len(messages) - 1, 0, -1):
        prefix = messages[:i]
        prefix_hash = hash_messages(prefix)
        if prefix_hash in message_hash_lookup:
            return prefix_hash
    return None
```

The system detects conversation continuity by searching for prefix matches - checking if earlier parts of the conversation were seen before.

### Session ID Management

```python
# logger.py, lines 87-90, 103-106
def resolve_static_thread_id(messages, static_id: str | None = None):
    msg_hash = hash_messages(messages)
    # ...
    # For new conversations:
    static_id = static_id or str(uuid.uuid4())[:8]
    log_file_path = str(LOG_DIR / datetime.now().strftime("%Y-%m-%d") / f"{static_id}.json")
    static_id_file_lookup[static_id] = log_file_path
```

New conversations get a UUID-based static ID, while continuations inherit the ID from their prefix. Log files are organized by date and session ID.

### Persistent Lookup Tables

```python
# logger.py, lines 42-43
MESSAGE_HASH_LOOKUP = PROJECT_ROOT / ".llm_logger" / "message_hashes.json"
STATIC_ID_FILE_LOOKUP = PROJECT_ROOT / ".llm_logger" / "static_id_file_lookup.json"
```

Two JSON files maintain session continuity across application restarts:
- `message_hashes.json`: Maps message hashes to static IDs and log paths
- `static_id_file_lookup.json`: Maps static IDs to log file paths

### Log Entry Creation

```python
# logger.py, lines 117-131
def log_call(*, provider, args, kwargs, response, request_start_timestamp, request_end_timestamp, logging_account_id, session_id: str | None = None):
    messages = kwargs.get("messages", [])
    thread_data = resolve_static_thread_id(messages, session_id)
    # ...
    log_entry = {
        # ...
        "static_thread_id": thread_data[MESSAGE_HASH_LOOKUP_STATIC_ID],
    }
```

When logging an API call, the system resolves the thread ID and includes it in the log entry, maintaining the conversation thread.

### Technical Benefits

1. **Zero configuration**: No manual session tracking required
2. **Stateless operation**: Compatible with serverless architectures
3. **Deterministic identification**: Reliable conversation fingerprinting
4. **Restart resilience**: Maintains context across application restarts

---

## 🛠️ Roadmap Ideas

* Replay conversation with inline visualization  
* Claude and other model support  
* UI analytics and filters  
* Exportable reports and session sharing  
* Plugin hooks and configuration options  

---

## 📬 Feedback

Found a bug or have a feature request? [Open an issue](https://github.com/akhalsa/llm_debugger/issues).

---

## 📜 License

MIT

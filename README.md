# Log and View Python Based LLM Conversations

**LLM Logger** is a lightweight, local-first tool for inspecting and understanding how your application interacts with large language models like OpenAI GPT-4 or Anthropic Claude.

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

## 📦 Installation

### 🔹 Installation Options

#### Option 1: From PyPI (Recommended for most users)

Install the prebuilt package if you just want to use the tool:

```bash
pip install llm-logger
```

#### Option 2: Local Copy (For direct integration or customization)

Clone the repository and install:

```bash
# Clone the repo
git clone https://github.com/akhalsa/llm_debugger.git

# rebuild ui (optional)
cd llm_debugger/llm_logger/front_end
npm install
npx tsc

# Install from the local copy
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

This writes logs to `.llm_logger/logs/`.

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

**Same Process (using FastAPI):**
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

**In A Docker As A Parallel Process:**
In production or distributed development environments, it is recommended to run the llm_logger UI as a stand alone process. 
Here is an example start.sh file
```bash
# Start your main application. It does not have to be a unicorn app. This is just an example
uvicorn your_app:app --host 0.0.0.0 --port 5000 &

# Start the debugger UI on a different port
uvicorn llm_logger.log_viewer:app --host 0.0.0.0 --port 8000

# Wait for both processes
wait
```
To run this, your docker file should end with something like:
CMD ["/app/start.sh"]
Make sure to copy the start.sh file into the image and set permissions 
something like:
COPY code/server/start.sh /app/start.sh
RUN chmod +x /app/start.sh

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

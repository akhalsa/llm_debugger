# LLM Debugger

**LLM Debugger** is a lightweight, local-first tool for inspecting and understanding how your application interacts with large language models like OpenAI GPT-4 or Anthropic Claude.

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

### 🔹 From PyPI (for most users)

Install the prebuilt package if you just want to use the tool:

```bash
pip install llm_debugger
```

No frontend setup or Node.js required.

---

### 🔸 Local Install (for users customizing the logger or UI)

#### 🧰 Prerequisites To Install Locally

To customize the logger or UI (e.g. modify the interface or fork the code), make sure you have:

- **Python ≥ 3.8** — [Install Python](https://www.python.org/downloads/)
- **Node.js & npm** — [Install Node.js](https://nodejs.org/)
  - Includes `npx`, used to build the frontend
- **pip** and (optionally) `venv` — usually bundled with Python

You can verify your setup with:

```bash
python3 --version
pip --version
node --version
npm --version
npx --version
```

---
#### Installation

There are two common ways to install locally:

#### Option 1: Embedded in your project (for teams customizing UX or forking code)

If you're building a product or workflow and want to bundle or fork the debugger:

```bash
# Clone the repo into your project folder
git clone https://github.com/akhalsa/llm_debugger.git
pip install -e ./llm_debugger

# Optional: build the frontend if making UI changes
cd llm_debugger/llmdebugger/front_end
npm install
npx tsc  # Outputs to ../static
```

This ensures the debugger runs in the same environment as your LLM app, with optional UI customization.

#### Option 2: As a standalone tool (recommended for contributors)

If you're contributing to the debugger or developing its features/UI independently:

```bash
git clone https://github.com/akhalsa/llm_debugger.git
cd llm_debugger

# (Recommended) Create and activate a virtual environment
python3 -m venv llm_debugger_env
source llm_debugger_env/bin/activate

# Install in editable mode
pip install -e .

# Build the frontend
cd llmdebugger/front_end
npm install
npx tsc  # Outputs to ../static via tsconfig.json
```

---

## 🚀 Usage

### 1. Wrap Your OpenAI Client

```python
from dotenv import load_dotenv
import openai
import os
from llmdebugger import wrap_openai

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

This writes logs to `.llmdebugger/logs/`.

---

### 2. Launch the Log Viewer

Make sure you're in the same environment where `llmdebugger` was installed.
If you get `llmdebugger: command not found`, you may need to run `pip install` from your active venv.

```bash
llmdebugger -p 8000
```

Then open in your browser:

```
http://localhost:8000/static/index.html
```

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
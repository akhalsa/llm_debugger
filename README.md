# LLM Debugger

**LLM Debugger** is a lightweight, local-first tool for inspecting and understanding how your application interacts with large language models like OpenAI GPT-4 or Anthropic Claude.

It helps you:
- Log and inspect each model call with request/response metadata
- View differences between turns in a conversation
- Visualize tool calls, tool responses, and system prompts
- Compare prompt strategies and debug session behavior

Ideal for developers building agent workflows, chat interfaces, or prompt-based systems.

---

## ✨ Features

- Automated session tagging and diffs between chat contexts
- 🔧 Tool call and tool response visualizations
- ⏱️ Latency tracking and timestamping
- 💾 JSON-based local session storage
- 🧩 Framework-agnostic and privacy-preserving
- 📁 Simple static frontend served locally (no build tools required for end users)

---

## 📦 Installation

### 🔹 Install from PyPI (for users)

Use this if you just want to use the tool without modifying the code.

```bash
pip install llm_debugger
```

This includes a prebuilt UI — no TypeScript, Node.js, or frontend setup required.

---

### 🔸 Install Locally (for contributors)

Use this if you want to contribute to the codebase or modify the UI.

```bash
# clone the repo
git clone https://github.com/akhalsa/llm_debugger.git
cd llm_debugger
# (Recommended) Create and activate a virtual environment
python3 -m venv llm_logger_env
source llm_logger_env/bin/activate
# install package
pip install -e .
```

To build the frontend after editing the UI:

```bash
cd llmdebugger/front_end
npm install
npx tsc  # Outputs directly to ../static via tsconfig.json
```

That's it — no copying needed. The FastAPI server will serve from `static/`.

---


## 🚀 Usage

### 1. Wrap your OpenAI client

Instead of replacing your whole call stack, just wrap your OpenAI client with logging enabled:

```python
from dotenv import load_dotenv
import openai
import os
from llmdebugger import wrap_openai

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Wrap the OpenAI client to automatically log interactions
openai_client = wrap_openai(openai.OpenAI(api_key=api_key), logging_account_id="my_project")
```

Then use `openai_client` exactly as you normally would:

```python
response = openai_client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What's the capital of France?"}
    ]
)
```

This writes a structured session file to `.llmdebugger/logs/`.

---

### 2. Start the log viewer

```bash
llmdebugger -p 8000
```

Then open:

```
http://localhost:8000/static/index.html
```

You'll see:
- Message-by-message conversation history
- Context diffs across turns
- Tool call + response blocks
- Metadata (latency, provider, etc)

---

## 🛠️ Roadmap Ideas

- Replay Conversation
- Add support for Claude
- Add analytics to UI
- Exportable session reports
- Configurable plugin hooks

---

## 📬 Feedback

Found a bug? Have a feature request? Open an [issue](https://github.com/YOUR_USERNAME/llm_debugger/issues) or drop me a note.

---

## 📜 License

MIT

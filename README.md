# LLM Debugger

LLM Debugger is a lightweight, local-first tool for inspecting and understanding how your application interacts with large language models like OpenAI GPT-4 or Anthropic Claude.

It helps you:
- Log and inspect each model call with request/response metadata
- View differences between turns in a conversation
- Visualize tool calls, tool responses, and system prompts
- Compare prompt strategies and debug session behavior

Ideal for developers building agent workflows, chat interfaces, or prompt-based systems.

## Features

- 🧠 Context-aware diff viewer between turns
- 🔧 Tool call and tool response visualizations
- ⏱️ Latency tracking and timestamping
- 💾 JSON-based local session storage
- 📁 Simple static frontend (no build tools)

## install 
pip install llm_debugger
## Usage

```bash
# Start the server
llmdebugger -p 8000

# Then visit:
http://localhost:8000/static/index.html

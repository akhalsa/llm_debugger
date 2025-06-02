# llmdebugger/cli.py
import argparse
import uvicorn
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Start the LLM Debugger web UI")
    parser.add_argument("-p", "--port", type=int, default=8000)
    args = parser.parse_args()

    uvicorn.run("llmdebugger.server:app", host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
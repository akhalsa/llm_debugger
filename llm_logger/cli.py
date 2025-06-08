# llm_logger/cli.py
import argparse
import uvicorn
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Start the LLM Debugger web UI")
    parser.add_argument("-p", "--port", type=int, default=8000, help="Port to run the server on (default: 8000)")
    parser.add_argument("-H", "--host", type=str, default="0.0.0.0", help="Host to bind the server to (default: 0.0.0.0)")
    args = parser.parse_args()

    host = args.host if args.host is not None else "0.0.0.0"
    port = args.port if args.port is not None else 8000
    
    display_host = "localhost" if host == "0.0.0.0" else host
    print(f"Starting LLM Debugger UI on http://{display_host}:{port}/static/index.html")
    
    uvicorn.run("llm_logger.log_viewer:app", host=host, port=port)

if __name__ == "__main__":
    main()

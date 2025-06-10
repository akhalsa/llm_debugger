from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
import json
from typing import List

def find_project_root(start_dir=None):
    current = Path(start_dir or Path.cwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists() or (parent / "setup.py").exists():
            return parent
    return current  # fallback


PROJECT_ROOT = find_project_root()
LOG_DIR = PROJECT_ROOT / ".llm_logger" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

def inject_base_url(content: str, base_url: str, assets: List[str]) -> str:
    """
    Inject <script> or <link> tags into the HTML content with base_url applied.
    
    Args:
        content: The original HTML content.
        base_url: The base path to prefix for assets.
        assets: A list of filenames to inject (e.g. "viewer.js", "style.css").
                File extension determines tag type: .js → <script>, .css → <link>

    Returns:
        Modified HTML content with injected tags before </head>.
    """
    tags = [f'<script>window.BASE_URL = "{base_url}";</script>']
    
    for filename in assets:
        path = f"{base_url}/static/{filename}"
        if filename.endswith(".js"):
            tags.append(f'<script type="module" defer src="{path}"></script>')
        elif filename.endswith(".css"):
            tags.append(f'<link rel="stylesheet" href="{path}">')
        else:
            # Optional: warn or skip unknown types
            continue

    injection = "\n    ".join(tags)
    return content.replace("</head>", f"    {injection}\n</head>")

def create_log_viewer_app(base_url=""):
    """Create the FastAPI app with an optional base_url parameter."""
    app = FastAPI()
    app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    # Store the base_url in the app state
    app.state.base_url = base_url

    @app.get(f"/")
    def index(request: Request):
        # Instead of returning the file directly, we'll inject the base_url
        with open(STATIC_DIR / "index.html", "r") as f:
            content = f.read()
        
        # Inject the base_url as a JavaScript variable
        modified = inject_base_url(content, app.state.base_url, ["style.css", "index.js"])
        return HTMLResponse(content=modified)

    @app.get(f"/sessions/{{session_id}}", response_class=HTMLResponse)
    def serve_session_view(request: Request, session_id: str):
        # Inject the base_url into session.html too
        with open(STATIC_DIR / "session.html", "r") as f:
            content = f.read()
        
        modified = inject_base_url(content, app.state.base_url, ["style.css", "viewer.js"])
        return HTMLResponse(content=modified)

    @app.get(f"/api/sessions")
    def list_sessions(date: str ):
        """
        List all sessions filtered by date.
        
        Args:
            date:  date string in YYYY-MM-DD format
        
        Returns:
            List of session objects with static_id and most_recent_message
        """
        if not date:
            return []
        
        # If date is provided, look in that specific date directory
        date_dir = LOG_DIR / date
        if not date_dir.exists():
            return []
        files = sorted(date_dir.glob("*.json"))

        result = []
        for file_path in files:
            try:
                static_id = file_path.stem
                # Read the log file
                with open(file_path) as f:
                    logs = json.load(f)
                if not logs or not isinstance(logs, list):
                    continue
                most_recent_entry = logs[-1]
                # Extract the most recent message (assistant's response)
                most_recent_message = None
                
                # Try to get from the response structure
                if "response" in most_recent_entry and "choices" in most_recent_entry["response"]:
                    choices = most_recent_entry["response"]["choices"]
                    if choices and len(choices) > 0 and "message" in choices[0]:
                        message = choices[0]["message"]
                        
                        # Check if it's a regular message with content
                        if message.get("content"):
                            most_recent_message = {
                                "starttime": most_recent_entry.get("start_time", ""),
                                "sender_role": message.get("role", "assistant"),
                                "message": message.get("content", "")
                            }
                        # Check if it's a tool call
                        elif message.get("tool_calls"):
                            tool_calls = message.get("tool_calls", [])
                            if tool_calls:
                                # Get the first tool call
                                tool_call = tool_calls[0]
                                tool_name = tool_call.get("function", {}).get("name", "unknown_tool")
                                tool_args = tool_call.get("function", {}).get("arguments", "{}")
                                
                                most_recent_message = {
                                    "starttime": most_recent_entry.get("start_time", ""),
                                    "sender_role": "assistant",
                                    "message": f"Tool Call: {tool_name}({tool_args})"
                                }
                
                # Use the static_thread_id from the entry if available
                entry_static_id = most_recent_entry.get("static_thread_id", static_id)
                
                if most_recent_message:
                    result.append({
                        "static_id": entry_static_id,
                        "most_recent_message": most_recent_message
                    })
            except Exception as e:
                # Skip files that can't be processed
                print(f"Error processing {file_path}: {e}")
                continue
        
        return result


    @app.get(f"/api/sessions/{{session_id}}")
    def get_session(session_id: str):
        # Define the path to the STATIC_ID_FILE_LOOKUP file
        STATIC_ID_FILE_LOOKUP = PROJECT_ROOT / ".llm_logger" / "static_id_file_lookup.json"
        
        # Check if the lookup file exists
        if not STATIC_ID_FILE_LOOKUP.exists():
            return JSONResponse(status_code=404, content={"error": "Lookup file not found"})
        
        # Read the lookup file
        try:
            with open(STATIC_ID_FILE_LOOKUP, "r") as f:
                static_id_file_lookup = json.load(f)
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Failed to read lookup file: {str(e)}"})
        
        # Check if the session_id exists in the lookup
        if session_id not in static_id_file_lookup:
            return JSONResponse(status_code=404, content={"error": "Session not found"})
        
        # Get the file path from the lookup
        file_path = static_id_file_lookup[session_id]
        path = Path(file_path)
        
        # Check if the file exists
        if not path.exists():
            return JSONResponse(status_code=404, content={"error": "Session file not found"})
        
        # Load and return the session data
        with open(path) as f:
            return json.load(f)
            
    return app

# Create a default app instance for backward compatibility
app = create_log_viewer_app()

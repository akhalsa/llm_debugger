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
    def list_sessions():
        files = sorted(LOG_DIR.glob("*.json"))
        return [f.name for f in files]

    @app.get(f"/api/sessions/{{session_id}}")
    def get_session(session_id: str):
        path = LOG_DIR / f"{session_id}.json"
        if not path.exists():
            return JSONResponse(status_code=404, content={"error": "Not found"})
        with open(path) as f:
            return json.load(f)
            
    return app

# Create a default app instance for backward compatibility
app = create_log_viewer_app()

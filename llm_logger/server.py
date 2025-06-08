from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
import json

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

def create_app(base_url=""):
    """Create the FastAPI app with an optional base_url parameter."""
    app = FastAPI()
    app.mount(f"{base_url}/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    # Store the base_url in the app state
    app.state.base_url = base_url

    @app.get(f"/")
    def index(request: Request):
        # Instead of returning the file directly, we'll inject the base_url
        with open(STATIC_DIR / "index.html", "r") as f:
            content = f.read()
        
        # Inject the base_url as a JavaScript variable
        script_tag = f'<script>window.BASE_URL = "{app.state.base_url}";</script>'
        modified_content = content.replace('</head>', f'{script_tag}</head>')
        
        return HTMLResponse(content=modified_content)

    @app.get(f"/sessions/{{session_id}}", response_class=HTMLResponse)
    def serve_session_view(request: Request, session_id: str):
        # Inject the base_url into session.html too
        with open(STATIC_DIR / "session.html", "r") as f:
            content = f.read()
        
        script_tag = f'<script>window.BASE_URL = "{app.state.base_url}";</script>'
        modified_content = content.replace('</head>', f'{script_tag}</head>')
        
        return HTMLResponse(content=modified_content)

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
app = create_app()

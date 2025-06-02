from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from pathlib import Path
import json

def find_project_root(start_dir=None):
    current = Path(start_dir or Path.cwd()).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists() or (parent / "setup.py").exists():
            return parent
    return current  # fallback


PROJECT_ROOT = find_project_root()
LOG_DIR = PROJECT_ROOT / ".llmdebugger" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/sessions/{session_id}", response_class=HTMLResponse)
def serve_session_view(session_id: str):
    return FileResponse(STATIC_DIR / "session.html")

@app.get("/api/sessions")
def list_sessions():
    files = sorted(LOG_DIR.glob("*.json"))
    return [f.name for f in files]

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    path = LOG_DIR / f"{session_id}.json"
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    with open(path) as f:
        return json.load(f)

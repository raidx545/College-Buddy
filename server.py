import os
import glob
import threading
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import json

# NOTE: rag_engine is NOT imported here — it's loaded lazily in the
# background thread so uvicorn can bind to the port immediately.

# --- App setup ---
app = FastAPI(title="CampusAI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load bot in background so Render port binds immediately ---
bot = None


def _load_bot():
    global bot
    try:
        from rag_engine import SyllabusBot  # lazy import — heavy ML libs
        bot = SyllabusBot()
        print("✅ SyllabusBot loaded successfully.")
    except Exception as e:
        print(f"❌ Failed to load bot: {e}")
        print("   Run 'python build_embeddings.py' first.")


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=_load_bot, daemon=True)
    thread.start()


# --- Request/Response models ---
class ChatRequest(BaseModel):
    message: str
    subject: str = "All"


class ChatResponse(BaseModel):
    answer: str


# --- Endpoints ---
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "bot_loaded": bot is not None,
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if bot is None:
        raise HTTPException(
            status_code=503,
            detail="Bot not loaded. Run 'python build_embeddings.py' first."
        )
    
    answer = bot.ask(req.message, subject=req.subject)
    return ChatResponse(answer=answer)


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if bot is None:
        raise HTTPException(
            status_code=503,
            detail="Bot not loaded. Run 'python build_embeddings.py' first."
        )

    def event_generator():
        for chunk in bot.stream_ask(req.message, subject=req.subject):
            # Format as Server-Sent Event (SSE)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")



@app.get("/api/subjects")
def get_subjects():
    if bot is None:
        raise HTTPException(status_code=503, detail="Bot not loaded.")
    
    subjects = bot.get_subjects()
    return {"subjects": ["All"] + subjects}


@app.get("/api/resources")
def list_resources():
    """List all downloadable files from Stuff/ directory."""
    data_dir = "Stuff"
    resources = []
    resource_id = 0
    
    # Walk through all files in Stuff/
    for root, dirs, files in os.walk(data_dir):
        for filename in files:
            if filename.startswith("."):
                continue
            
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, data_dir)
            parts = rel_path.split(os.sep)
            
            category = "Notes"
            subject = "General"
            
            pyq_subject_map = {
                "COMPUTER ORGANIZATION AND ARCHITECTURE": "COA",
                "DATA STRUCTURE": "DS",
                "DATA STRUCTURES": "DS",
                "DISCRETE STRUCTURES THEORY OF LOGIC": "DSTL",
                "MATHEMATICS IV": "Maths IV",
                "PYTHON PROGRAMMING": "Python",
                "UNIVERSAL HUMAN VALUES AND PROFESSIONAL ETHICS": "UHV",
            }
            
            if parts[0] == "Notes":
                category = "Notes"
                if len(parts) > 2:
                    subject = parts[1]
            elif parts[0] == "PYQs":
                category = "PYQs"
                name_without_ext = os.path.splitext(filename)[0]
                if "-" in name_without_ext:
                    subject_parts = name_without_ext.split("-", 1)
                    if len(subject_parts) > 1:
                        raw_subj = subject_parts[1].replace("-", " ").upper()
                        subject = pyq_subject_map.get(raw_subj, raw_subj.title())
                else:
                    raw_subj = name_without_ext.replace("-", " ").replace("_", " ").upper()
                    subject = pyq_subject_map.get(raw_subj, raw_subj.title())
            else:
                subject = parts[0] if len(parts) > 1 else "General"
                fname_lower = filename.lower()
                if len(parts) > 2:
                    subfolder = parts[1].lower()
                    if "pyq" in subfolder:
                        category = "PYQs"
                    elif "syllabus" in subfolder:
                        category = "Syllabus"
                    elif "assignment" in subfolder:
                        category = "Assignments"
                elif "syllabus" in fname_lower:
                    category = "Syllabus"
                elif "pyq" in fname_lower:
                    category = "PYQs"
                elif "assignment" in fname_lower:
                    category = "Assignments"
            
            # Get file modification time
            mod_time = os.path.getmtime(filepath)
            date_str = datetime.fromtimestamp(mod_time).strftime("%b %d, %Y")
            
            # Clean title from filename
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()
            
            resource_id += 1
            resources.append({
                "id": resource_id,
                "title": title,
                "subject": subject,
                "category": category,
                "date": date_str,
                "filename": filename,
                "downloadPath": rel_path,
            })
    
    return {"resources": resources}


@app.get("/api/resources/download/{filepath:path}")
def download_resource(filepath: str):
    """Download a specific file from Stuff/."""
    full_path = os.path.join("Stuff", filepath)
    
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found.")
    
    # Security: prevent path traversal
    abs_data = os.path.abspath("Stuff")
    abs_file = os.path.abspath(full_path)
    if not abs_file.startswith(abs_data):
        raise HTTPException(status_code=403, detail="Access denied.")
    
    return FileResponse(
        path=abs_file, 
        filename=os.path.basename(full_path),
        media_type="application/octet-stream"
    )


# --- Serve React frontend (must be AFTER all /api routes) ---
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.isdir(FRONTEND_DIR):
    from starlette.staticfiles import StaticFiles

    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    # Catch-all: serve index.html for any non-API route (React Router)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

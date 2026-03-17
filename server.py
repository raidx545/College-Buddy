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


# ---------------------------------------------------------------------------
# Server-side session store: { chat_id -> {"history": [...], "summary": ""} }
# Each chat has its OWN isolated history — sessions never share context.
# ---------------------------------------------------------------------------
session_store: dict = {}
SESSION_HISTORY_LIMIT = 10  # keep last 10 messages (5 turns) per session


# --- Request/Response models ---
class ChatRequest(BaseModel):
    message: str
    subject: str = "All"
    chat_id: str  # unique Firestore chat document ID


class ChatResponse(BaseModel):
    answer: str


# --- Helpers ---
def get_session(chat_id: str) -> dict:
    """Get or create a session entry for the given chat_id."""
    if chat_id not in session_store:
        session_store[chat_id] = {"history": [], "summary": ""}
    return session_store[chat_id]


def update_session(chat_id: str, user_msg: str, bot_msg: str):
    """Append turn to session and trim to limit."""
    sess = get_session(chat_id)
    sess["history"].append({"role": "user", "content": user_msg})
    sess["history"].append({"role": "assistant", "content": bot_msg})
    # Keep only last N messages
    sess["history"] = sess["history"][-SESSION_HISTORY_LIMIT:]


def refresh_summary_background(chat_id: str):
    """Generate a new summary in a background thread — non-blocking."""
    def _run():
        sess = session_store.get(chat_id)
        if not sess or not bot:
            return
        try:
            new_summary = bot.summarize_session(sess["history"])
            if new_summary:
                sess["summary"] = new_summary
                print(f"[session:{chat_id[:8]}] Summary updated.")
        except Exception as e:
            print(f"[session:{chat_id[:8]}] Summary error: {e}")

    threading.Thread(target=_run, daemon=True).start()


# --- Endpoints ---
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "bot_loaded": bot is not None,
        "active_sessions": len(session_store),
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if bot is None:
        raise HTTPException(status_code=503, detail="Bot not loaded.")

    sess = get_session(req.chat_id)
    answer = bot.ask(
        req.message,
        subject=req.subject,
        chat_history=sess["history"],
        session_summary=sess["summary"]
    )
    update_session(req.chat_id, req.message, answer)
    refresh_summary_background(req.chat_id)
    return ChatResponse(answer=answer)


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if bot is None:
        raise HTTPException(status_code=503, detail="Bot not loaded.")

    sess = get_session(req.chat_id)
    # Capture history/summary at request time (snapshot)
    history_snapshot = list(sess["history"])
    summary_snapshot = sess["summary"]

    collected_answer = []

    def event_generator():
        for chunk in bot.stream_ask(
            req.message,
            subject=req.subject,
            chat_history=history_snapshot,
            session_summary=summary_snapshot
        ):
            collected_answer.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        # Stream done — update session store
        full_answer = "".join(collected_answer)
        update_session(req.chat_id, req.message, full_answer)
        refresh_summary_background(req.chat_id)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.delete("/api/chat/session/{chat_id}")
def clear_session(chat_id: str):
    """Clear server-side session memory for a specific chat."""
    if chat_id in session_store:
        del session_store[chat_id]
    return {"status": "cleared"}



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

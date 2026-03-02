import os
import glob
import threading
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from rag_engine import SyllabusBot

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
bot: SyllabusBot = None


def _load_bot():
    global bot
    try:
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
            
            # Extract subject from folder
            subject = parts[0] if len(parts) > 1 else "General"
            
            # Detect category
            category = "Notes"
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

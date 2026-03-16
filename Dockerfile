# ============================================================
# Multi-stage Dockerfile for College Buddy (Railway deployment)
# Target image size: ~630MB (vs 4-6GB with full torch)
# ============================================================

# ---------- Stage 1: Builder ----------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build deps for native extensions (chromadb, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements-deploy.txt .

# Install Python packages with CPU-only torch
RUN pip install --no-cache-dir --prefix=/install -r requirements-deploy.txt


# ---------- Stage 2: Runtime ----------
FROM python:3.11-slim

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy only what the server needs
COPY server.py .
COPY rag_engine.py .
COPY sarvam_langchain.py .
COPY .env .

# Pre-built vector store
COPY chroma_db/ ./chroma_db/

# PDF source files (for /api/resources endpoints)
COPY Stuff/ ./Stuff/

# Pre-built React frontend
COPY frontend/dist/ ./frontend/dist/

# Railway sets PORT env var; default to 8000 for local testing
ENV PORT=8000

EXPOSE ${PORT}

CMD uvicorn server:app --host 0.0.0.0 --port ${PORT}

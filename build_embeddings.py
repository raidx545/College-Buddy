#!/usr/bin/env python3
"""
Standalone script to build/rebuild the ChromaDB vector store from PDFs.

Usage:
    python build_embeddings.py          # Create if not exists
    python build_embeddings.py --force  # Rebuild from scratch
"""

import os
import sys
import glob
import shutil
import argparse

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# Configuration
DATA_DIR = "Stuff"
DB_DIR = "chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def build_vector_store(force: bool = False):
    """Build the ChromaDB vector store from PDFs in Stuff/."""
    
    # Check if already exists
    if os.path.exists(DB_DIR) and os.listdir(DB_DIR) and not force:
        print(f"✅ Vector store already exists at '{DB_DIR}/'.")
        print("   Use --force to rebuild from scratch.")
        return
    
    # If force, remove existing
    if force and os.path.exists(DB_DIR):
        print(f"🗑️  Removing existing vector store at '{DB_DIR}/'...")
        shutil.rmtree(DB_DIR)
    
    # 1. Find all PDFs
    pdf_pattern = os.path.join(DATA_DIR, "**", "*.pdf")
    pdf_files = glob.glob(pdf_pattern, recursive=True)
    
    if not pdf_files:
        print(f"❌ No PDF files found in '{DATA_DIR}/' or its subdirectories.")
        sys.exit(1)
    
    print(f"📄 Found {len(pdf_files)} PDF file(s):")
    for f in pdf_files:
        print(f"   - {f}")
    
    # 2. Load and tag documents with subject metadata
    all_documents = []
    for pdf_path in pdf_files:
        rel_path = os.path.relpath(pdf_path, DATA_DIR)
        parts = rel_path.split(os.sep)
        subject = parts[0] if len(parts) > 1 else "General"
        
        # Detect category from subfolder name (e.g., Stuff/UHV/PYQs/file.pdf)
        category = "Notes"  # default
        if len(parts) > 2:
            subfolder = parts[1].lower()
            if "pyq" in subfolder:
                category = "PYQs"
            elif "syllabus" in subfolder:
                category = "Syllabus"
            elif "assignment" in subfolder:
                category = "Assignments"
        elif "syllabus" in os.path.basename(pdf_path).lower():
            category = "Syllabus"
        elif "pyq" in os.path.basename(pdf_path).lower():
            category = "PYQs"
        
        print(f"📖 Loading: {pdf_path} (Subject: {subject}, Category: {category})")
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()
        
        for doc in docs:
            doc.metadata["subject"] = subject
            doc.metadata["category"] = category
            doc.metadata["filename"] = os.path.basename(pdf_path)
        
        all_documents.extend(docs)
    
    print(f"\n📝 Loaded {len(all_documents)} document pages total.")
    
    # 3. Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(all_documents)
    print(f"✂️  Split into {len(chunks)} chunks.")
    
    # 4. Create embeddings and store
    print(f"🔄 Creating embeddings with '{EMBEDDING_MODEL}'... (this may take a minute)")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    
    print(f"\n✅ Vector store built successfully at '{DB_DIR}/'!")
    print(f"   Total chunks indexed: {len(chunks)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build ChromaDB vector store from PDF documents"
    )
    parser.add_argument(
        "--force", 
        action="store_true",
        help="Force rebuild even if vector store already exists"
    )
    args = parser.parse_args()
    
    build_vector_store(force=args.force)

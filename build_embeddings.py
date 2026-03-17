#!/usr/bin/env python3
"""
Standalone script to build/rebuild the Pinecone vector store from PDFs.

Usage:
    python build_embeddings.py          # Create if not exists
    python build_embeddings.py --force  # Rebuild from scratch (not widely supported in basic Pinecone free tier, but clears index)
"""

import os
import sys
import glob
import argparse

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from pinecone import Pinecone

load_dotenv()

# Configuration
DATA_DIR = "Stuff"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "campus-ai")

def build_vector_store(force: bool = False):
    """Build the Pinecone vector store from PDFs in Stuff/."""
    
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY environment variable not found. Please add it to your .env file.")
        sys.exit(1)
        
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists
    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
        print(f"❌ Index '{PINECONE_INDEX_NAME}' not found in Pinecone. Please create an index with dimensions 384 and metric cosine.")
        sys.exit(1)
    
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # If force, clear the index (requires paid tier sometimes or we can just delete and recreate, but free tier allows delete all)
    if force:
        print(f"🗑️  Clearing existing vectors in index '{PINECONE_INDEX_NAME}'...")
        try:
            index.delete(delete_all=True)
        except Exception as e:
            print(f"⚠️ Could not clear index completely (might be free tier limitation): {e}")
    else:
        # Check if already has vectors
        stats = index.describe_index_stats()
        if stats.total_vector_count > 0:
            print(f"✅ Vector store already contains {stats.total_vector_count} vectors.")
            print("   Use --force to clear and rebuild.")
            return
            
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
        category = "Notes"
        subject = "General"
        
        # Map long PYQ subjects to Note folder names
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
            filename = os.path.basename(pdf_path)
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
            # Fallback for old structure
            subject = parts[0] if len(parts) > 1 else "General"
            fname_lower = os.path.basename(pdf_path).lower()
            if "pyq" in fname_lower:
                category = "PYQs"
            elif "syllabus" in fname_lower:
                category = "Syllabus"
            elif "assignment" in fname_lower:
                category = "Assignments"
            elif len(parts) > 2:
                subfolder = parts[1].lower()
                if "pyq" in subfolder:
                    category = "PYQs"
                elif "syllabus" in subfolder:
                    category = "Syllabus"
                elif "assignment" in subfolder:
                    category = "Assignments"
        
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
    print(f"🔄 Creating embeddings with '{EMBEDDING_MODEL}' and uploading to Pinecone... (this may take a minute)")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    PineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        index_name=PINECONE_INDEX_NAME
    )
    
    print(f"\n✅ Vector store built successfully in Pinecone index '{PINECONE_INDEX_NAME}'!")
    print(f"   Total chunks indexed: {len(chunks)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build Pinecone vector store from PDF documents"
    )
    parser.add_argument(
        "--force", 
        action="store_true",
        help="Force rebuild even if vector store already has vectors"
    )
    args = parser.parse_args()
    
    build_vector_store(force=args.force)

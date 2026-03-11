# CampusAI — College Buddy

**CampusAI** is an AI-powered college study companion built for **ABES EC** students. It provides an intelligent chatbot that answers subject-specific questions using Retrieval-Augmented Generation (RAG) over university course materials, along with a resource vault for downloading study notes, previous year questions (PYQs), and syllabi.

---

## Architecture Overview

```
┌─────────────────────────┐       ┌──────────────────────────────┐
│     React Frontend      │ HTTP  │       FastAPI Backend         │
│  (Vite + TypeScript)    │◄─────►│    (Python + Uvicorn)        │
│                         │       │                              │
│  Auth ─ Chat ─ Vault    │       │  RAG Engine ─ Sarvam LLM    │
└──────────┬──────────────┘       └──────────┬───────────────────┘
           │                                 │
      ┌────▼────┐                     ┌──────▼──────┐
      │Firebase │                     │  ChromaDB   │
      │Auth +   │                     │ Vector Store│
      │Firestore│                     │(Embeddings) │
      └─────────┘                     └─────────────┘
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Python 3.12** | Core backend language |
| **FastAPI** | REST API framework for serving chat & resource endpoints |
| **Uvicorn** | ASGI server for running FastAPI in production |
| **LangChain** | Orchestration framework for the RAG pipeline (chains, retrievers, prompts) |
| **LangChain Community** | Community integrations (ChromaDB vector store, PyPDF loader) |
| **LangChain HuggingFace** | HuggingFace embedding model integration |
| **ChromaDB** | Vector database for storing and retrieving document embeddings |
| **Sentence Transformers** | Embedding model (`all-MiniLM-L6-v2`) for document vectorization |
| **Sarvam AI** | LLM provider — custom LangChain wrapper (`SarvamChatModel`) for answer generation |
| **PyPDF** | PDF document parsing for ingesting study materials |
| **python-dotenv** | Environment variable management |
| **Pydantic** | Data validation for API request/response models |

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI library for building the single-page application |
| **TypeScript** | Type-safe JavaScript for all frontend code |
| **Vite** | Build tool and dev server with HMR |
| **Tailwind CSS 3** | Utility-first CSS framework for styling |
| **shadcn/ui** | Headless UI component library (built on Radix UI) |
| **Radix UI** | Accessible primitive components (Dialog, Dropdown, ScrollArea, etc.) |
| **Framer Motion** | Animations and page transitions |
| **React Router DOM** | Client-side routing (Auth, Chat, Downloads pages) |
| **TanStack React Query** | Server state management and data fetching |
| **Firebase Auth** | User authentication (Email/Password + Google Sign-In) |
| **Firebase Firestore** | Cloud database for chat session persistence |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting for chat timestamps |
| **Zod** | Schema validation |
| **Sonner** | Toast notifications |

### Infrastructure & Deployment

| Technology | Purpose |
|---|---|
| **AWS EC2** | Cloud hosting for backend + frontend (Ubuntu instance, `eu-north-1`) |
| **Firebase** | Authentication service + Firestore database |
| **Git / GitHub** | Version control and repository hosting |
| **Stitch** | AI design tool used for generating UI mockups |

---

## Project Structure

```
College-Buddy/
├── server.py              # FastAPI backend (chat, subjects, resources endpoints)
├── rag_engine.py          # RAG pipeline (ChromaDB + Sarvam AI + LangChain)
├── sarvam_langchain.py    # Custom LangChain wrapper for Sarvam AI LLM
├── build_embeddings.py    # Script to vectorize PDFs into ChromaDB
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (SARVAM_API_KEY)
│
├── Stuff/                 # Study materials (organized by subject)
│   ├── COA/               # Computer Organization & Architecture
│   ├── DS/                # Data Structures
│   ├── Maths/             # Mathematics
│   └── UHV/               # Universal Human Values
│
├── chroma_db/             # ChromaDB vector store (pre-built embeddings)
│
└── frontend/              # React + TypeScript frontend
    ├── public/
    │   └── mascot.png     # CampusAI mascot image
    └── src/
        ├── pages/
        │   ├── Auth.tsx       # Login / Signup page
        │   ├── Index.tsx      # Chat interface
        │   └── Downloads.tsx  # Study Vault (resource downloads)
        ├── components/
        │   ├── AppLayout.tsx      # Main layout with header
        │   ├── AppSidebar.tsx     # Sidebar (chat sessions, nav)
        │   ├── ChatMessage.tsx    # Chat bubble component
        │   └── TypingIndicator.tsx
        ├── contexts/
        │   ├── AuthContext.tsx # Firebase auth state
        │   └── ChatContext.tsx # Chat sessions & messages state
        ├── lib/
        │   ├── api.ts         # Backend API utility functions
        │   └── firebase.ts    # Firebase config
        └── index.css          # Global styles, Tailwind config, animations
```

---

## Key Features

- **RAG-Powered Chat** — Ask questions about any course and get answers grounded in your actual study materials
- **Subject Filtering** — Select a subject from the sidebar to scope answers to that topic only
- **Study Vault** — Browse and download study resources grouped by subject (Notes, PYQs, Syllabi)
- **Multi-Subject Support** — COA, Data Structures, Maths, UHV with easy expansion
- **Firebase Auth** — Secure login via Email/Password or Google Sign-In
- **Chat History** — Sessions stored in Firestore with rename/delete support
- **Responsive Design** — Works on desktop and mobile with collapsible sidebar
- **Custom UI Design** — Playful, modern interface designed via Stitch and hand-tuned

---

## How It Works

1. **Document Ingestion** — `build_embeddings.py` scans `Stuff/` for PDFs, splits them into chunks, generates embeddings using `all-MiniLM-L6-v2`, and stores them in ChromaDB with subject/category metadata.

2. **Question Answering** — When a user asks a question, the RAG engine retrieves the top-5 most relevant chunks from ChromaDB (optionally filtered by subject), constructs a prompt with the retrieved context, and sends it to Sarvam AI's LLM for answer generation.

3. **API Layer** — FastAPI serves endpoints for chat (`/api/chat`), subjects (`/api/subjects`), and resources (`/api/resources`), with the frontend consuming them via React Query.

---

© 2026 CampusAI • Built for ABES EC

"""
RAG Engine — loads an existing Pinecone vector store and answers questions.
Supports session-based memory: short-term (last 5 messages) + long-term (conversation summary).

Prerequisites:
    Run `python build_embeddings.py` first to create the vector store.
"""

import os
from dotenv import load_dotenv

from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.history_aware_retriever import create_history_aware_retriever
from pinecone import Pinecone

load_dotenv()

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "campus-ai")


class SyllabusBot:
    def __init__(self):
        self.vector_store = None
        self.llm = None
        self._initialize_system()

    def _initialize_system(self):
        """Load existing vector store and set up the LLM chain."""

        # 1. Load Embeddings model
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

        # 2. Connect to Pinecone Vector DB
        if not PINECONE_API_KEY:
            raise RuntimeError(
                "PINECONE_API_KEY not found in environment variables. "
                "Please add it to .env"
            )

        pc = Pinecone(api_key=PINECONE_API_KEY)

        if PINECONE_INDEX_NAME not in pc.list_indexes().names():
            raise RuntimeError(
                f"Pinecone index '{PINECONE_INDEX_NAME}' not found. "
                "Please run 'python build_embeddings.py' first."
            )

        print(f"Loading existing vector store from Pinecone index '{PINECONE_INDEX_NAME}'...")
        self.vector_store = PineconeVectorStore(
            index_name=PINECONE_INDEX_NAME,
            embedding=self.embeddings
        )

        # 3. Setup LLM (Groq)
        if not GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY not found in environment variables. "
                "Please add it to .env"
            )

        from langchain_groq import ChatGroq
        self.llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.1
        )

        # 4. Prompts
        self.system_prompt_with_subject = (
            "You are CampusAI, a friendly and helpful college study assistant. "
            "The student has selected the subject: **{subject}**. "
            "You must ONLY answer questions related to {subject} using the context provided below. "
            "If the student's question is NOT related to {subject} or is about a different subject/topic, "
            "politely decline and say something like: "
            "'Hey! 😊 It looks like your question is about a different topic. "
            "I'm currently set to help with {subject}. You can switch to the right subject from the sidebar to get accurate answers!' "
            "If the question IS about {subject} but the answer isn't in the context, say: "
            "'I couldn't find that specific info in my {subject} materials. Try rephrasing your question or check another unit! 📚' "
            "Always be encouraging, supportive, and student-friendly. "
            "{summary_section}"
            "Context: {context}"
        )

        self.system_prompt_all = (
            "You are CampusAI, a friendly and helpful college study assistant. "
            "Use the context below to answer the student's question as accurately as possible. "
            "If the answer is not found in the provided context, respond politely — for example: "
            "'Hmm, I couldn't find that in the materials I have. "
            "Try selecting a specific subject from the sidebar for better results! 😊' "
            "Always be encouraging, supportive, and student-friendly. "
            "{summary_section}"
            "Context: {context}"
        )

        # 5. Contextualize question prompt (standalone query rewriter)
        self.contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Given a chat history and the latest user question which might reference "
             "context in the chat history, formulate a standalone question which can be "
             "understood without the chat history. Do NOT answer the question, "
             "just reformulate it if needed, otherwise return it as is."
            ),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

    def _format_history(self, chat_history: list[dict]) -> list:
        """Convert [{role, content}] dicts to LangChain message objects."""
        messages = []
        for msg in chat_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))
        return messages

    def _build_chain(self, subject: str, session_summary: str = ""):
        """Build a history-aware RAG chain for the given subject."""
        search_kwargs = {"k": 5}
        if subject and subject != "All":
            search_kwargs["filter"] = {"subject": {"$eq": subject}}

        retriever = self.vector_store.as_retriever(search_kwargs=search_kwargs)

        # History-aware retriever: rewrites follow-up questions into standalone queries
        history_aware_retriever = create_history_aware_retriever(
            self.llm, retriever, self.contextualize_q_prompt
        )

        # Build system prompt
        summary_section = ""
        if session_summary:
            summary_section = (
                f"Conversation summary so far: {session_summary}\n\n"
            )

        if subject and subject != "All":
            system_prompt = self.system_prompt_with_subject.replace("{subject}", subject)
        else:
            system_prompt = self.system_prompt_all

        system_prompt = system_prompt.replace("{summary_section}", summary_section)

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        return create_retrieval_chain(history_aware_retriever, question_answer_chain)

    def get_subjects(self) -> list[str]:
        """Return a list of subjects available in the vector store."""
        try:
            dummy_vector = self.embeddings.embed_query("dummy query to get subjects")
            results = self.vector_store._index.query(
                vector=dummy_vector,
                top_k=100,
                include_metadata=True
            )
            subjects = set()
            for match in results.get("matches", []):
                meta = match.get("metadata", {})
                if "subject" in meta:
                    subjects.add(meta["subject"])
            return sorted(list(subjects))
        except Exception as e:
            print(f"Error fetching subjects: {e}")
            return []

    def ask(self, question: str, subject: str = None,
            chat_history: list[dict] = None, session_summary: str = "") -> str:
        """Ask a question with optional chat history and session summary."""
        if not self.vector_store:
            raise RuntimeError("Vector store not loaded.")

        chain = self._build_chain(subject or "All", session_summary)
        lc_history = self._format_history(chat_history or [])

        try:
            response = chain.invoke({"input": question, "chat_history": lc_history})
            return response["answer"]
        except Exception as e:
            return f"Error occurred: {str(e)}"

    def stream_ask(self, question: str, subject: str = None,
                   chat_history: list[dict] = None, session_summary: str = ""):
        """Stream answer chunks. Supports chat history and session summary."""
        if not self.vector_store:
            raise RuntimeError("Vector store not loaded.")

        chain = self._build_chain(subject or "All", session_summary)
        lc_history = self._format_history(chat_history or [])

        try:
            for chunk in chain.stream({"input": question, "chat_history": lc_history}):
                if "answer" in chunk:
                    yield chunk["answer"]
        except Exception as e:
            yield f"\n\nError occurred: {str(e)}"

    def summarize_session(self, messages: list[dict]) -> str:
        """Generate a compact (<200 token) summary of the conversation so far."""
        if not messages:
            return ""

        conversation_text = "\n".join(
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in messages
            if msg.get("content", "").strip()
        )

        prompt = (
            f"Summarize the following student-AI conversation in under 150 words. "
            f"Focus on topics discussed, questions asked, and key concepts explained. "
            f"Be concise.\n\n{conversation_text}"
        )

        try:
            response = self.llm.invoke(prompt)
            return response.content.strip()
        except Exception as e:
            print(f"Summarize error: {e}")
            return ""


if __name__ == "__main__":
    bot = SyllabusBot()
    print("Subjects:", bot.get_subjects())
    print(bot.ask("What is UHV?"))

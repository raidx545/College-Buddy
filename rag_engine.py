"""
RAG Engine — loads an existing Pinecone vector store and answers questions.

Prerequisites:
    Run `python build_embeddings.py` first to create the vector store.
"""

import os
from dotenv import load_dotenv

from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
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
        self.prompt_template = None
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

        # 4. Setup prompt
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
            "Context: {context}"
        )

        self.system_prompt_all = (
            "You are CampusAI, a friendly and helpful college study assistant. "
            "Use the context below to answer the student's question as accurately as possible. "
            "If the answer is not found in the provided context, respond politely — for example: "
            "'Hmm, I couldn't find that in the materials I have. "
            "Try selecting a specific subject from the sidebar for better results! 😊' "
            "Always be encouraging, supportive, and student-friendly. "
            "Context: {context}"
        )

    def get_subjects(self) -> list[str]:
        """Return a list of subjects available in the vector store."""
        try:
            # Pinecone doesn't have a simple .get() to list all unique metadata fields 
            # like Chroma, but we can query with a dummy vector to retrieve top K and extract.
            # To do this correctly without scanning the entire DB (which Pinecone doesn't support well),
            # we just do a dummy search. This is a common limitation of cloud vector DBs.
            # For a real robust approach, subjects should be stored in a separate SQL DB.
            # Here we just fetch Top 100 documents and extract their subjects.
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
                    
            if not subjects:
                # Fallback if the dummy query didn't return useful variety
                pass
                
            return sorted(list(subjects))
        except Exception as e:
            print(f"Error fetching subjects: {e}")
            return []

    def ask(self, question: str, subject: str = None) -> str:
        """Ask a question, optionally filtered by subject."""
        if not self.vector_store:
            raise RuntimeError("Vector store not loaded.")
        
        # Dynamic retriever based on subject
        search_kwargs = {"k": 5}
        if subject and subject != "All":
            # Pinecone uses a different filter syntax (MongoDB style)
            search_kwargs["filter"] = {"subject": {"$eq": subject}}
        
        retriever = self.vector_store.as_retriever(search_kwargs=search_kwargs)
        
        # Build prompt dynamically based on selected subject
        if subject and subject != "All":
            system_prompt = self.system_prompt_with_subject.replace("{subject}", subject)
            # Only replace the {subject} placeholders, keep {context} and {input} for LangChain
        else:
            system_prompt = self.system_prompt_all

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])

        # Create and invoke chain
        question_answer_chain = create_stuff_documents_chain(
            self.llm, prompt_template
        )
        chain = create_retrieval_chain(retriever, question_answer_chain)
        
        try:
            response = chain.invoke({"input": question})
            return response["answer"]
        except Exception as e:
            return f"Error occurred: {str(e)}"

    def stream_ask(self, question: str, subject: str = None):
        """Yield chunks of the answer as they are generated by the LLM."""
        if not self.vector_store:
            raise RuntimeError("Vector store not loaded.")
            
        search_kwargs = {"k": 5}
        if subject and subject != "All":
            search_kwargs["filter"] = {"subject": {"$eq": subject}}
        
        retriever = self.vector_store.as_retriever(search_kwargs=search_kwargs)
        
        if subject and subject != "All":
            system_prompt = self.system_prompt_with_subject.replace("{subject}", subject)
        else:
            system_prompt = self.system_prompt_all

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(
            self.llm, prompt_template
        )
        chain = create_retrieval_chain(retriever, question_answer_chain)
        
        try:
            # chain.stream yields dicts with "answer" chunks and intermediate steps
            for chunk in chain.stream({"input": question}):
                if "answer" in chunk:
                    yield chunk["answer"]
        except Exception as e:
            yield f"\n\nError occurred: {str(e)}"

if __name__ == "__main__":
    bot = SyllabusBot()
    print("Subjects:", bot.get_subjects())
    print(bot.ask("What is UHV?"))

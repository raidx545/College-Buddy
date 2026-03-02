"""
RAG Engine — loads an existing ChromaDB vector store and answers questions.

Prerequisites:
    Run `python build_embeddings.py` first to create the vector store.
"""

import os
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

load_dotenv()

# Configuration
DB_DIR = "chroma_db"
DATA_DIR = "Stuff"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")


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
        
        # 2. Load existing Vector DB (must be pre-built)
        if not os.path.exists(DB_DIR) or not os.listdir(DB_DIR):
            raise RuntimeError(
                f"Vector store not found at '{DB_DIR}/'. "
                "Please run 'python build_embeddings.py' first."
            )
        
        print("Loading existing vector store...")
        self.vector_store = Chroma(
            persist_directory=DB_DIR, 
            embedding_function=self.embeddings
        )

        # 3. Setup LLM
        from sarvam_langchain import SarvamChatModel
        self.llm = SarvamChatModel(
            api_key=SARVAM_API_KEY,
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
            collection = self.vector_store._collection
            results = collection.get(include=["metadatas"])
            subjects = set()
            for meta in results["metadatas"]:
                if "subject" in meta:
                    subjects.add(meta["subject"])
            return sorted(list(subjects))
        except Exception:
            return []

    def ask(self, question: str, subject: str = None) -> str:
        """Ask a question, optionally filtered by subject."""
        if not self.vector_store:
            raise RuntimeError("Vector store not loaded.")
        
        # Dynamic retriever based on subject
        search_kwargs = {"k": 5}
        if subject and subject != "All":
            search_kwargs["filter"] = {"subject": subject}
        
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


if __name__ == "__main__":
    bot = SyllabusBot()
    print("Subjects:", bot.get_subjects())
    print(bot.ask("What is UHV?"))

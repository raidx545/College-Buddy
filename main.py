import os
import sys

try:
    from dotenv import load_dotenv
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_pinecone import PineconeVectorStore
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    from pinecone import Pinecone
    
    # NEW: We use "create_retrieval_chain" instead of RetrievalQA
    from langchain_classic.chains import create_retrieval_chain
    from langchain_classic.chains.combine_documents import create_stuff_documents_chain
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run the 'Nuclear Uninstall' steps provided in the chat.")
    sys.exit(1)

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "campus-ai")
PDF_PATH = "Stuff/UHV/syllabus_uhv.pdf"

def main():
    print(f"Loading {PDF_PATH}...")
    
    # 1. LOAD
    if not os.path.exists(PDF_PATH):
        print(f"ERROR: {PDF_PATH} not found.")
        return

    loader = PyPDFLoader(PDF_PATH)
    documents = loader.load()

    # 2. SPLIT
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)
    print(f"Split into {len(texts)} chunks.")

    # 3. VECTOR DB
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    if not PINECONE_API_KEY:
        print("ERROR: PINECONE_API_KEY not found in environment variables.")
        return
        
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
        print(f"ERROR: Pinecone index '{PINECONE_INDEX_NAME}' not found.")
        return
        
    print("Uploading to Pinecone index (or using existing)...")
    db = PineconeVectorStore.from_documents(
        texts, embeddings, index_name=PINECONE_INDEX_NAME
    )
        
    retriever = db.as_retriever(search_kwargs={"k": 3})


    # 4. NEW PROMPT STYLE
    system_prompt = (
        "You are a strict academic assistant. Use ONLY the context below to answer. "
        "If the answer is not in the context, say 'Not in syllabus'. "
        "Context: {context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    # 5 LLM (Groq)
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not found in environment variables.")
        return
    
    from langchain_groq import ChatGroq
    llm = ChatGroq(
        api_key=GROQ_API_KEY,
        model="llama-3.3-70b-versatile",
        temperature=0.1
    )
    
    # 6 Chain Bnegi
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    # 7 Yha se Run Krege
    print("\n--- Syllabus Bot Ready ---")
    while True:
        query = input("\nAsk a question: ")
        if query.lower() in ["exit", "quit"]: 
            break
        
        response = rag_chain.invoke({"input": query})
        print(f"\nResponse: {response['answer']}")

if __name__ == "__main__":
    main()
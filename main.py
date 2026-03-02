import os
import sys

try:
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import Chroma
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_core.prompts import ChatPromptTemplate
    
    # NEW: We use "create_retrieval_chain" instead of RetrievalQA
    from langchain_classic.chains import create_retrieval_chain
    from langchain_classic.chains.combine_documents import create_stuff_documents_chain
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run the 'Nuclear Uninstall' steps provided in the chat.")
    sys.exit(1)

SARVAM_API_KEY = "sk_9csxqlb8_TBZ7cwEmXWHaiZSTo5s6mAFl" # PASTE YOUR KEY HERE
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
    DB_DIR = "chroma_db_main"
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    if os.path.exists(DB_DIR) and os.listdir(DB_DIR):
        print("Loading existing index from disk...")
        db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    else:
        print("Creating new index and saving to disk...")
        db = Chroma.from_documents(texts, embeddings, persist_directory=DB_DIR)
        
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

    # 5 LLM
    from sarvam_langchain import SarvamChatModel
    llm = SarvamChatModel(
        api_key=SARVAM_API_KEY,
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
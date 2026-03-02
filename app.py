import streamlit as st
import time

# --- INSERT YOUR LANGCHAIN CONFIGURATION HERE ---
from rag_engine import SyllabusBot

@st.cache_resource
def get_bot():
    return SyllabusBot()

bot = get_bot()

# --- SIDEBAR CONFIGURATION ---
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # 1. Subject Filter
    subject_options = ["All", "UHV", "COA", "DS", "Maths"]
    selected_subject = st.selectbox("Select Subject", subject_options)
    
    # 2. Rebuild Button
    if st.button("🔄 Reload Knowledge Base"):
        with st.spinner("Rebuilding index... this may take a moment."):
            status = bot.rebuild_index()
            st.success(status)

# --- FRONTEND CODE STARTS HERE ---
st.set_page_config(page_title="Syllabus AI", page_icon="📚", layout="wide")

# --- CUSTOM CSS ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'Poppins', sans-serif;
    }

    /* Main Background */
    .stApp {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #e2e8f0;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: rgba(15, 23, 42, 0.98);
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Header Styling */
    h1, h2, h3 {
        color: #f8fafc !important;
        font-weight: 600 !important;
    }

    /* Chat Input Styling */
    .stChatInput textarea {
        background-color: rgba(30, 41, 59, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #f1f5f9 !important;
        border-radius: 12px !important;
    }
    
    /* Buttons */
    .stButton button {
        background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    .stButton button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }

    /* Custom Chat Message Styling (Glassmorphism roughly applied via container) */
    /* Note: Streamlit's chat message structure is rigid, but global text styles help. */
    
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="background: linear-gradient(90deg, #4f46e5, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3rem; font-weight: 800;">
            Syllabus Genius
        </h1>
        <p style="font-size: 1.1rem; color: #cbd5e1;">
            Your AI Study Companion for <span style="color: #8b5cf6; font-weight: 600;">{selected_subject if selected_subject != 'All' else 'All Subjects'}</span>
        </p>
    </div>
""", unsafe_allow_html=True)

# Initialize chat history in session state
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# React to user input
if prompt := st.chat_input("Ask a question..."):
    # 1. Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # 2. Get AI Response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        # PASS SELECTED SUBJECT TO BOT
        full_response = bot.ask(prompt, subject=selected_subject)
        message_placeholder.markdown(full_response)
    
    # 3. Save Assistant Response
    st.session_state.messages.append({"role": "assistant", "content": full_response})
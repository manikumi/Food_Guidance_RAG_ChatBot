import streamlit as st
import sys
import os

# ── Streamlit Cloud secrets → environment variables ──────────────────────────
# On Streamlit Cloud, secrets defined in the dashboard are exposed via
# st.secrets. We push them into os.environ so that every downstream module
# that uses os.getenv() / python-dotenv picks them up automatically.
# This runs before any src.* imports so the env vars are ready in time.
if hasattr(st, "secrets"):
    for _key, _val in st.secrets.items():
        if _key not in os.environ:
            os.environ[_key] = str(_val)
# ─────────────────────────────────────────────────────────────────────────────

# Add project root to sys.path so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.pipeline import run_query
from src.retrieval.retriever import _get_all_document_names

# Set page config
st.set_page_config(
    page_title="Dietary Guidance Assistant",
    page_icon="🥗",
    layout="wide"
)

# Inject custom CSS for premium look
st.markdown("""
<style>
    /* Premium Design & Animations */
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
    }
    
    /* Micro-animations for buttons and elements */
    .stButton>button {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 8px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    /* Refusal styling */
    .stAlert {
        border-radius: 8px;
        animation: fadeIn 0.5s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* Badges */
    .badge {
        display: inline-block;
        padding: 0.35em 0.8em;
        font-size: 0.8em;
        font-weight: 700;
        line-height: 1.2;
        text-align: center;
        white-space: nowrap;
        vertical-align: baseline;
        border-radius: 0.5rem;
        background-color: #3b82f6;
        color: white;
        margin-right: 0.5rem;
        margin-top: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .cross-doc-badge {
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    }
</style>
""", unsafe_allow_html=True)

st.title("🥗 Dietary Guidance ChatBot")
st.markdown("Ask questions about food, nutrition, and food safety based on official guidance.")

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []


@st.cache_data(show_spinner=False)
def get_document_names():
    """Cache the document list — it never changes while the app is running."""
    return _get_all_document_names()


# Sidebar for filters
with st.sidebar:
    st.header("⚙️ Settings")
    st.markdown("Filter retrieval to a specific document.")
    docs = get_document_names()
    doc_options = ["All documents"] + docs
    selected_doc = st.selectbox("Select Source", doc_options)
    
    st.markdown("---")
    st.markdown("### Official Sources Available")
    for d in docs:
        st.markdown(f"- <small>{d}</small>", unsafe_allow_html=True)

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg.get("refusal_mode") == "OOS":
            st.error(msg["content"])
        elif msg.get("refusal_mode") == "NIC":
            st.warning(msg["content"])
        else:
            st.markdown(msg["content"])
            
            # Show metadata if available
            meta_html = ""
            if msg.get("is_cross_document"):
                meta_html += f'<span class="badge cross-doc-badge">Multi-Source Resolved</span>'
            if msg.get("documents_used"):
                docs_list = ", ".join(msg["documents_used"])
                meta_html += f'<span class="badge">Sources: {docs_list}</span>'
                
            if meta_html:
                st.markdown(f"<div>{meta_html}</div>", unsafe_allow_html=True)

# Chat input
filter_doc = None if selected_doc == "All documents" else selected_doc

if prompt := st.chat_input("Ask about food, nutrition, or food safety..."):
    # Append user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
        
    # Generate assistant response
    with st.chat_message("assistant"):
        with st.spinner("Searching official guidance..."):
            response = run_query(prompt, filter_doc=filter_doc)
            
            if response.refusal_mode == "OOS":
                st.error(response.answer)
                msg_data = {"role": "assistant", "content": response.answer, "refusal_mode": "OOS"}
            elif response.refusal_mode == "NIC":
                st.warning(response.answer)
                msg_data = {"role": "assistant", "content": response.answer, "refusal_mode": "NIC"}
            else:
                st.markdown(response.answer)
                
                # Show metadata
                meta_html = ""
                if response.is_cross_document:
                    meta_html += f'<span class="badge cross-doc-badge">✨ Multi-Source Resolved</span>'
                if response.documents_used:
                    docs_list = ", ".join(response.documents_used)
                    meta_html += f'<span class="badge">📚 Sources: {docs_list}</span>'
                    
                if meta_html:
                    st.markdown(f"<div>{meta_html}</div>", unsafe_allow_html=True)
                    
                msg_data = {
                    "role": "assistant", 
                    "content": response.answer, 
                    "refusal_mode": None,
                    "is_cross_document": response.is_cross_document,
                    "documents_used": response.documents_used
                }
                
            st.session_state.messages.append(msg_data)

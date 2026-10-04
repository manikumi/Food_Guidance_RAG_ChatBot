"""
FastAPI backend for the Food Guidance RAG ChatBot.
Deployed to Vercel (serverless). Exposes REST endpoints consumed by the
Next.js frontend hosted on Railway.
"""

import os
import sys
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Path setup — needed because Vercel places the API at repo root
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

# Lazy-import the pipeline to avoid cold-start cost at module level
_pipeline_loaded = False
run_query = None
_get_all_document_names = None


def _ensure_pipeline():
    global _pipeline_loaded, run_query, _get_all_document_names
    if not _pipeline_loaded:
        from src.pipeline import run_query as _rq
        from src.retrieval.retriever import _get_all_document_names as _gadn
        run_query = _rq
        _get_all_document_names = _gadn
        _pipeline_loaded = True


# ---------------------------------------------------------------------------
# In-memory chat session store
# (For production scale, replace with Redis / a DB)
# ---------------------------------------------------------------------------
_sessions: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    refusal_mode: Optional[str] = None
    is_cross_document: bool = False
    documents_used: List[str] = Field(default_factory=list)
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class SendMessageRequest(BaseModel):
    content: str
    filter_doc: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    filter_doc: Optional[str] = None


class EditMessageRequest(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Food Guidance RAG ChatBot API",
    description="Backend API for the Dietary Guidance RAG ChatBot",
    version="1.0.0",
)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Debug Route
# ---------------------------------------------------------------------------
from fastapi import Request
@app.get("/debug/{path_name:path}")
def debug(request: Request, path_name: str):
    return {"path_name": path_name, "raw_url": str(request.url), "headers": dict(request.headers)}

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
@app.get("/documents")
def list_documents():
    """Return all available source document names."""
    _ensure_pipeline()
    docs = _get_all_document_names()
    return {"documents": docs}


# ---------------------------------------------------------------------------
# Sessions — CRUD
# ---------------------------------------------------------------------------
@app.get("/sessions")
def list_sessions():
    """List all chat sessions."""
    sessions_list = []
    for sid, s in _sessions.items():
        sessions_list.append({
            "session_id": sid,
            "title": s["title"],
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
            "message_count": len(s["messages"]),
            "filter_doc": s.get("filter_doc"),
        })
    sessions_list.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"sessions": sessions_list}


@app.post("/sessions", status_code=201)
def create_session(title: Optional[str] = None):
    """Create a new empty chat session."""
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    _sessions[sid] = {
        "session_id": sid,
        "title": title or "New Chat",
        "created_at": now,
        "updated_at": now,
        "messages": [],
        "filter_doc": None,
    }
    return _sessions[sid]


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    """Get full session including all messages."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return _sessions[session_id]


@app.patch("/sessions/{session_id}")
def update_session(session_id: str, body: UpdateSessionRequest):
    """Update session title or filter_doc."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = _sessions[session_id]
    if body.title is not None:
        s["title"] = body.title
    if body.filter_doc is not None:
        s["filter_doc"] = body.filter_doc
    s["updated_at"] = datetime.now(timezone.utc).isoformat()
    return s


@app.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str):
    """Delete a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del _sessions[session_id]


# ---------------------------------------------------------------------------
# Shareable link
# ---------------------------------------------------------------------------
@app.get("/sessions/{session_id}/share")
def share_session(session_id: str):
    """Return a shareable snapshot of the session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = _sessions[session_id]
    return {
        "share_id": session_id,
        "title": s["title"],
        "created_at": s["created_at"],
        "messages": s["messages"],
    }


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
@app.post("/sessions/{session_id}/messages")
def send_message(session_id: str, body: SendMessageRequest):
    """
    Append a user message to the session, run the RAG pipeline,
    and return the assistant response with full conversation history support.
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    _ensure_pipeline()
    s = _sessions[session_id]
    now = datetime.now(timezone.utc).isoformat()

    user_msg = ChatMessage(role="user", content=body.content, timestamp=now)
    s["messages"].append(user_msg.model_dump())

    # History for follow-up context (all messages before the one just added)
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in s["messages"][:-1]
    ]

    filter_doc = body.filter_doc or s.get("filter_doc")

    try:
        response = run_query(body.content, filter_doc=filter_doc, chat_history=history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    assistant_msg = ChatMessage(
        role="assistant",
        content=response.answer,
        refusal_mode=response.refusal_mode,
        is_cross_document=response.is_cross_document,
        documents_used=response.documents_used,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    s["messages"].append(assistant_msg.model_dump())

    # Auto-title from first user message
    if len(s["messages"]) == 2 and s["title"] == "New Chat":
        title_text = body.content[:60]
        s["title"] = title_text + ("..." if len(body.content) > 60 else "")

    s["updated_at"] = datetime.now(timezone.utc).isoformat()

    return {
        "user_message": user_msg.model_dump(),
        "assistant_message": assistant_msg.model_dump(),
        "session": {
            "session_id": session_id,
            "title": s["title"],
            "updated_at": s["updated_at"],
        },
    }


@app.patch("/sessions/{session_id}/messages/{message_index}")
def edit_message(session_id: str, message_index: int, body: EditMessageRequest):
    """
    Edit a user message. Truncates all subsequent messages and re-runs the
    pipeline from the edit point with the prior conversation as history.
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    _ensure_pipeline()
    s = _sessions[session_id]

    if message_index < 0 or message_index >= len(s["messages"]):
        raise HTTPException(status_code=400, detail="Invalid message index")

    if s["messages"][message_index]["role"] != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be edited")

    # Truncate at the edit point
    s["messages"] = s["messages"][:message_index]

    history = [
        {"role": m["role"], "content": m["content"]}
        for m in s["messages"]
    ]

    now = datetime.now(timezone.utc).isoformat()
    user_msg = ChatMessage(role="user", content=body.content, timestamp=now)
    s["messages"].append(user_msg.model_dump())

    filter_doc = s.get("filter_doc")

    try:
        response = run_query(body.content, filter_doc=filter_doc, chat_history=history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    assistant_msg = ChatMessage(
        role="assistant",
        content=response.answer,
        refusal_mode=response.refusal_mode,
        is_cross_document=response.is_cross_document,
        documents_used=response.documents_used,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    s["messages"].append(assistant_msg.model_dump())
    s["updated_at"] = datetime.now(timezone.utc).isoformat()

    return {
        "user_message": user_msg.model_dump(),
        "assistant_message": assistant_msg.model_dump(),
        "messages": s["messages"],
    }

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def catch_all(request: Request, path_name: str):
    return {
        "message": "Catch-all triggered. This means FastAPI didn't find the route you wanted.",
        "path_received_by_fastapi": path_name,
        "raw_url": str(request.url),
    }

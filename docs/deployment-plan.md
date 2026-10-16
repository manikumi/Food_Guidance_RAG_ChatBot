# 🚀 Deployment Guide — Full-Stack on Vercel

> **Status:** ✅ Deployment Completed
> **Live URL:** [https://food-guidance-rag-chat-bot-vdgr.vercel.app/](https://food-guidance-rag-chat-bot-vdgr.vercel.app/)
> **Backend:** FastAPI serverless functions on Vercel (`/api/*`)
> **Frontend:** Next.js 14 served by Vercel

---

## Architecture

```
User Browser
    │
    ▼
Vercel (Next.js frontend + FastAPI backend)
    │
    ├── / → frontend/          (Next.js static/SSR pages)
    └── /api/* → api/index.py  (FastAPI serverless functions)
                     │
                     └── src/pipeline.py
                              ├── src/generation/classifier.py  (Groq LLM)
                              ├── src/retrieval/retriever.py    (ChromaDB)
                              ├── src/generation/generator.py   (Groq LLM)
                              └── src/generation/citation_builder.py
```

**Key details:**
- Backend entry point: `api/index.py` — FastAPI app with `root_path="/api"`
- Frontend calls backend via `NEXT_PUBLIC_API_URL` (set to the same Vercel deployment URL)
- ChromaDB vector store is committed to the repo at `data/vectorstore/` and read from disk
- Embedding model: `BAAI/bge-small-en-v1.5` (ChromaDB ONNX backend — no `sentence-transformers` needed)

---

## Part 1 — Deploy to Vercel

### Prerequisites
- Vercel account at https://vercel.com (free tier is fine)
- Vercel CLI: `npm i -g vercel`

### Step 1 — Commit the Vector Store

The pre-built ChromaDB must be committed so Vercel can read it at runtime:

```bash
# Remove data/vectorstore from .gitignore if present, then:
git add -f data/vectorstore/
git commit -m "chore: include pre-built ChromaDB vectorstore"
git push
```

### Step 2 — Configure Vercel Project

```bash
# From the repo root
vercel

# Follow prompts:
# - Link to existing project OR create new
# - Root directory: . (repo root)
# - Framework preset: Next.js
# - Build command: cd frontend && npm install && npm run build
# - Output directory: frontend/.next
```

### Step 3 — Set Environment Variables in Vercel Dashboard

Go to: **Project Settings → Environment Variables**

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | `gsk_...` (your Groq key) |
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` |
| `LLM_MODEL` | `openai/gpt-oss-120b` |
| `CHROMA_PERSIST_DIR` | `data/vectorstore` |
| `CHROMA_COLLECTION` | `food_guidance_onnx` |
| `SCORE_THRESHOLD` | `0.55` |
| `TOP_K` | `5` |
| `NEXT_PUBLIC_API_URL` | `https://food-guidance-rag-chat-bot-vdgr.vercel.app` |
| `FRONTEND_ORIGIN` | `https://food-guidance-rag-chat-bot-vdgr.vercel.app` |

### Step 4 — Deploy

```bash
vercel --prod
```

Your app will be live at: `https://food-guidance-rag-chat-bot-vdgr.vercel.app/`

> **Note:** Vercel's free Hobby plan has a 10-second timeout for serverless functions.
> The RAG pipeline (embedding + retrieval + LLM) typically completes in 5–15 seconds.
> Upgrade to Vercel Pro for a 60-second function timeout if cold starts cause timeouts.

---

## API Endpoints Reference

All endpoints are served under `/api/*` by the FastAPI backend in `api/index.py`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/documents` | List available source documents |
| GET | `/api/sessions` | List all chat sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/{id}` | Get session with full history |
| PATCH | `/api/sessions/{id}` | Update session title/filter |
| DELETE | `/api/sessions/{id}` | Delete session |
| GET | `/api/sessions/{id}/share` | Get shareable session snapshot |
| POST | `/api/sessions/{id}/messages` | Send message (runs RAG pipeline) |
| PATCH | `/api/sessions/{id}/messages/{idx}` | Edit message & regenerate from that point |

---

## Local Development

### Backend
```bash
# From repo root
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev   # http://localhost:3000
```

---

## Environment Variable Reference

### Backend (Vercel / `.env`)

| Variable | Purpose | Default |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for LLM inference | — |
| `EMBEDDING_MODEL` | Sentence embedding model name | `BAAI/bge-small-en-v1.5` |
| `LLM_MODEL` | Groq model for classifier + generator | `openai/gpt-oss-120b` |
| `CHROMA_PERSIST_DIR` | Path to ChromaDB persistent storage | `data/vectorstore` |
| `CHROMA_COLLECTION` | ChromaDB collection name | `food_guidance_onnx` |
| `SCORE_THRESHOLD` | Minimum relevance score to retrieve | `0.55` |
| `TOP_K` | Number of chunks to retrieve per query | `5` |
| `FRONTEND_ORIGIN` | Allowed CORS origin (set to Vercel URL) | `*` |

### Frontend (Vercel / `.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for all backend API calls |

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Vercel timeout on first request | Cold start loading ChromaDB + ONNX model (~15-30s). Upgrade to Pro for 60s timeout. |
| CORS error in browser | Ensure `FRONTEND_ORIGIN` in Vercel env vars matches your deployed URL exactly |
| `Session not found` on page refresh | Sessions are in-memory; a new Vercel function instance has no session state from the previous one. This is expected on the free tier. |
| ChromaDB `collection not found` | Ensure `data/vectorstore/` is committed and `CHROMA_COLLECTION=food_guidance_onnx` is set correctly |
| `GROQ_API_KEY` missing | Add the key to Vercel Project Settings → Environment Variables and redeploy |
| Frontend shows blank / 404 on `/api/*` | Verify `vercel.json` routes `/api/(.*)` to `api/index.py` and that `root_path="/api"` is set in FastAPI |

---

## Post-Deployment Test Matrix

| Test | Expected Result |
|---|---|
| Open app — welcome screen | Suggestion cards visible, no console errors |
| Click suggestion card | Message sent, AI responds with inline citations |
| Ask a food safety question | Answer with source badges |
| Ask OOS question ("lose weight fast") | Red bubble with OOS badge + professional referral |
| Ask NIC question ("speed of light") | Amber bubble with NIC badge listing searched docs |
| Ask a follow-up question | LLM understands context from prior turn |
| Edit a past message | History truncated, new response generated |
| Click Share → copy URL | Shared URL opens read-only view |
| Filter by specific document | Retrieval limited to that document |
| Close tab, reopen | Active session restored from localStorage |
| Create second chat | Independent session in sidebar |
| Delete a session | Session removed from sidebar |

---

*Updated: 2026-10-16 | Platform: Vercel (full-stack Next.js + FastAPI serverless)*

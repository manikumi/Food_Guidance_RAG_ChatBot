# 🚀 Deployment Guide — Backend (Vercel) + Frontend (Railway)

## Architecture

```
User Browser
    │
    ▼
Railway (Next.js frontend)          Vercel (FastAPI backend)
frontend/                    ──►    api/main.py
src/app/page.tsx                    src/pipeline.py
src/lib/api.ts                      src/generation/
                                    src/retrieval/
                                    src/embedding/
                                    data/vectorstore/ (committed)
```

---

## Part 1 — Deploy Backend to Vercel

### Prerequisites
- Vercel account at https://vercel.com (free tier is fine)
- Vercel CLI: `npm i -g vercel`

### Step 1 — Commit the Vector Store

The vector store must be committed so Vercel can serve it:

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
# - Framework preset: Other
```

### Step 3 — Set Environment Variables in Vercel Dashboard

Go to: **Project Settings → Environment Variables**

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | `gsk_...` (your key) |
| `EMBEDDING_MODEL` | `small` |
| `LLM_MODEL` | `openai/gpt-oss-120b` |
| `CHROMA_PERSIST_DIR` | `data/vectorstore` |
| `CHROMA_COLLECTION` | `food_guidance` |
| `SCORE_THRESHOLD` | `0.55` |
| `TOP_K` | `5` |
| `FRONTEND_ORIGIN` | `https://your-frontend.railway.app` |

### Step 4 — Deploy

```bash
vercel --prod
```

Your backend will be live at: `https://your-project.vercel.app`

> **Note:** Vercel's free tier has a 10-second timeout for Hobby plans. Upgrade to Pro
> (or use the 60s function timeout in `vercel.json`) for the RAG pipeline which can take 5-15s.

---

## Part 2 — Deploy Frontend to Railway

### Prerequisites
- Railway account at https://railway.app
- Railway CLI: `npm i -g @railway/cli`

### Step 1 — Create Railway Project

```bash
railway login
railway init   # creates a new project
railway link   # link this directory to the project
```

Or use the Railway dashboard:
1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your `Food_Guidance_RAG_ChatBot` repository

### Step 2 — Configure Build Settings

In Railway dashboard → Service → Settings:

| Setting | Value |
|---|---|
| **Build Command** | `cd frontend && npm install && npm run build` |
| **Start Command** | `cd frontend && npm run start` |
| **Root Directory** | `/` (repo root) |

> Railway auto-detects `railway.json` — no manual config needed if it's committed.

### Step 3 — Set Environment Variables

In Railway dashboard → Service → Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.vercel.app` |
| `PORT` | `3000` (Railway sets this automatically) |

### Step 4 — Deploy

```bash
railway up
```

Or push to your `main` branch — Railway auto-deploys on every push.

---

## Part 3 — Connect Frontend ↔ Backend

After both are deployed:

1. **Copy your Vercel backend URL** (e.g., `https://food-guidance.vercel.app`)
2. **Set `NEXT_PUBLIC_API_URL`** in Railway to that URL
3. **Set `FRONTEND_ORIGIN`** in Vercel to your Railway URL (e.g., `https://food-guidance.railway.app`)
4. **Redeploy both** to pick up the new env vars

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/documents` | List available source documents |
| GET | `/sessions` | List all chat sessions |
| POST | `/sessions` | Create new session |
| GET | `/sessions/{id}` | Get session with full history |
| PATCH | `/sessions/{id}` | Update session title/filter |
| DELETE | `/sessions/{id}` | Delete session |
| GET | `/sessions/{id}/share` | Get shareable session snapshot |
| POST | `/sessions/{id}/messages` | Send message (runs RAG pipeline) |
| PATCH | `/sessions/{id}/messages/{idx}` | Edit message & regenerate from that point |

---

## Local Development

### Backend
```bash
# From repo root
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
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

## Troubleshooting

| Issue | Solution |
|---|---|
| Vercel timeout on first request | Cold start loading sentence-transformers (~30s). Use Pro plan for 60s timeout. |
| CORS error in browser | Ensure `FRONTEND_ORIGIN` is set correctly in Vercel to your Railway URL |
| `Session not found` on refresh | Sessions are in-memory; persistence requires Redis or a DB |
| Railway build fails | Ensure `frontend/package.json` exists and Node ≥18 |
| ChromaDB not found | Ensure `data/vectorstore/` is committed and `CHROMA_PERSIST_DIR` is correct |

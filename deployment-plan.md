# 🚀 Deployment Plan — Food Guidance RAG ChatBot (Streamlit Cloud)

## Overview

This document outlines the complete steps to deploy the **Food Guidance RAG ChatBot** to [Streamlit Community Cloud](https://streamlit.io/cloud) — a free, GitHub-integrated hosting platform purpose-built for Streamlit apps.

---

## Architecture at a Glance

```
User Browser
     │
     ▼
Streamlit Cloud (streamlit.io/cloud)
     │
     ├── app/streamlit_app.py          ← UI entry point
     ├── src/pipeline.py               ← RAG orchestration
     │    ├── src/generation/classifier.py   → Groq LLM (intent)
     │    ├── src/retrieval/retriever.py     → ChromaDB vector search
     │    ├── src/generation/generator.py   → Groq LLM (answer)
     │    └── src/generation/citation_builder.py
     └── data/vectorstore/             ← Pre-built ChromaDB (committed to repo)
```

**External APIs used:**
- **Groq** — LLM inference (classifier + generator, `openai/gpt-oss-120b`)
- **SentenceTransformers** — `BAAI/bge-large-en-v1.5` (downloaded at runtime from HuggingFace)
- **ChromaDB** — local persistent vector store (bundled in repo)

---

## Pre-Deployment Checklist

### 1. Critical: Commit the Vector Store to GitHub

The `data/vectorstore/` directory is currently in `.gitignore`. Streamlit Cloud cannot run scripts to build the index on first boot, so the **pre-built ChromaDB must be committed**.

```bash
# Step 1 — Remove vectorstore from .gitignore
# Edit .gitignore and delete (or comment out) the line:
#   data/vectorstore/

# Step 2 — Force-add the vectorstore files
git add -f data/vectorstore/
git commit -m "chore: include pre-built ChromaDB vectorstore for deployment"
git push
```

> [!WARNING]
> The `data/vectorstore/` folder contains `chroma.sqlite3` (~6.4 MB) and binary segment files. This is acceptable for Streamlit Cloud's free tier. If the index grows very large (>100 MB), consider using a hosted vector DB (Pinecone, Weaviate, Qdrant) instead.

### 2. Add a `secrets.toml` equivalent — Streamlit Secrets

The app reads from `.env` via `python-dotenv`. On Streamlit Cloud, secrets are injected via the **Secrets Manager** (not `.env` files). The app already calls `load_dotenv()`, and Streamlit Cloud exposes secrets as environment variables, so **no code change is needed**.

Required secrets to configure in Streamlit Cloud dashboard:

| Secret Key           | Value                          | Notes                              |
|----------------------|--------------------------------|------------------------------------|
| `GROQ_API_KEY`       | `gsk_...`                      | Your Groq API key                  |
| `EMBEDDING_MODEL`    | `BAAI/bge-large-en-v1.5`       | HuggingFace model name             |
| `LLM_MODEL`          | `openai/gpt-oss-120b`          | Model served via Groq              |
| `CHROMA_PERSIST_DIR` | `data/vectorstore`             | Relative path (as in `.env`)       |
| `CHROMA_COLLECTION`  | `food_guidance`                | ChromaDB collection name           |
| `SCORE_THRESHOLD`    | `0.55`                         | Retrieval relevance threshold      |
| `TOP_K`              | `5`                            | Number of retrieved chunks         |

### 3. Verify `requirements.txt`

Streamlit Cloud installs packages from `requirements.txt` automatically. The current file is complete, but confirm it is up to date:

```
openai>=1.0.0
groq>=0.4.0
chromadb>=0.4.0
sentence-transformers>=2.2.0
python-dotenv>=1.0.0
streamlit>=1.30.0
fastapi>=0.110.0
uvicorn>=0.27.0
pytest>=8.0.0
rich>=13.0.0
```

> [!NOTE]
> `fastapi`, `uvicorn`, `pytest`, and `rich` are only used locally. They won't cause issues in deployment, but you can optionally create a `requirements-deploy.txt` with only the runtime dependencies to speed up builds.

### 4. Ensure the Entry Point Path is Correct

Streamlit Cloud needs to know which file to run. The app file is at:

```
app/streamlit_app.py
```

This path will be specified during deployment configuration. No changes needed.

---

## Step-by-Step Deployment

### Step 1 — Push Your Code to GitHub

```bash
# Ensure your repo is up to date and the vectorstore is included
git status
git add .
git commit -m "feat: prepare for Streamlit Cloud deployment"
git push origin main
```

Your repository structure should look like this on GitHub:
```
Food_Guidance_RAG_ChatBot/
├── app/
│   └── streamlit_app.py       ← Streamlit entry point
├── data/
│   └── vectorstore/           ← ⚠️ Must be committed (not gitignored)
│       ├── chroma.sqlite3
│       └── <uuid>/
├── docs/
├── scripts/
├── src/
│   ├── embedding/
│   ├── generation/
│   ├── ingest/
│   ├── retrieval/
│   └── pipeline.py
├── requirements.txt           ← Must exist
├── .gitignore
└── deployment-plan.md
```

### Step 2 — Sign Up / Log In to Streamlit Cloud

1. Go to [https://share.streamlit.io](https://share.streamlit.io)
2. Click **"Sign in with GitHub"**
3. Authorize Streamlit to access your repositories

### Step 3 — Create a New App

1. Click **"New app"** in the Streamlit Cloud dashboard
2. Fill in the deployment form:

   | Field              | Value                                         |
   |--------------------|-----------------------------------------------|
   | **Repository**     | `your-github-username/Food_Guidance_RAG_ChatBot` |
   | **Branch**         | `main`                                        |
   | **Main file path** | `app/streamlit_app.py`                        |
   | **App URL**        | Choose a custom slug (e.g., `food-guidance-bot`) |

3. Click **"Advanced settings"** before deploying

### Step 4 — Add Secrets

In the **Advanced settings → Secrets** panel, paste the following (TOML format):

```toml
GROQ_API_KEY = "gsk_YOUR_ACTUAL_KEY_HERE"
EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"
LLM_MODEL = "openai/gpt-oss-120b"
CHROMA_PERSIST_DIR = "data/vectorstore"
CHROMA_COLLECTION = "food_guidance"
SCORE_THRESHOLD = "0.55"
TOP_K = "5"
```

> [!CAUTION]
> Never commit your actual `.env` file or expose `GROQ_API_KEY` in public repositories. Use only the Streamlit Secrets manager for sensitive values.

### Step 5 — Deploy

1. Click **"Deploy!"**
2. Streamlit Cloud will:
   - Clone your repository
   - Install packages from `requirements.txt` (this takes ~3-5 minutes due to `sentence-transformers` + `chromadb`)
   - Launch `app/streamlit_app.py`
3. Monitor the build logs for any errors
4. Once live, your app will be accessible at:
   ```
   https://your-slug.streamlit.app
   ```

---

## Known Issues & Mitigations

### Issue 1 — `sentence-transformers` Download on First Boot

**Problem:** The model `BAAI/bge-large-en-v1.5` (~1.3 GB) is downloaded from HuggingFace on the first app start.  
**Impact:** First cold start will be slow (~2-4 minutes). Subsequent starts use cache.  
**Mitigation:** This is normal behavior. Streamlit Cloud persists the model cache between restarts.

### Issue 2 — `CHROMA_PERSIST_DIR` Relative Path Resolution

**Problem:** ChromaDB uses `data/vectorstore` as a relative path. On Streamlit Cloud, the working directory is the **repo root**, so this path resolves correctly — but only if the app is not moved to a different subdirectory.  
**Status:** ✅ No action needed — the current setup is correct.

### Issue 3 — Memory Limits (Free Tier)

**Problem:** Streamlit Community Cloud free tier allows ~1 GB RAM. `sentence-transformers` + `chromadb` + the model together consume ~700-900 MB.  
**Mitigation:** Monitor memory. If hitting limits, switch to a smaller embedding model like `BAAI/bge-small-en-v1.5`.

### Issue 4 — App Sleeps After Inactivity

**Problem:** On the free tier, Streamlit apps go to sleep after ~7 days of inactivity. The next visitor wakes them up (takes ~30 seconds).  
**Mitigation:** Expected behavior. No action needed unless SLA requires always-on availability.

---

## Post-Deployment Verification

After the app is live, test these scenarios:

| Test Case                                     | Expected Behaviour                              |
|-----------------------------------------------|-------------------------------------------------|
| Ask a food safety question                    | Answer with source citations                    |
| Ask about BMI or weight loss                  | Refusal: OOS (out-of-scope) warning             |
| Ask something not in the corpus               | Refusal: NIC (not in corpus) message            |
| Filter by a specific document in the sidebar  | Retrieval limited to that document              |
| Ask a cross-document question                 | "Multi-Source Resolved" badge shown             |

---

## Optional Enhancements for Production

| Enhancement                        | Description                                                       |
|------------------------------------|-------------------------------------------------------------------|
| **Pinecone / Qdrant**              | Replace local ChromaDB with a hosted vector DB for scalability    |
| **Streamlit `st.cache_resource`**  | Wrap the ChromaDB collection loader to avoid reloading per session |
| **Custom domain**                  | Map a custom domain in Streamlit Cloud settings                   |
| **`requirements-deploy.txt`**      | Trim unused packages (`pytest`, `uvicorn`) from cloud builds      |
| **GitHub Actions CI**              | Rebuild the vectorstore and auto-push on new document additions   |

---

## Quick Reference — Key Files

| File                        | Purpose                                      |
|-----------------------------|----------------------------------------------|
| `app/streamlit_app.py`      | Streamlit UI entry point                     |
| `src/pipeline.py`           | RAG pipeline orchestrator                    |
| `src/generation/classifier.py` | Intent classifier (OOS detection)         |
| `src/generation/generator.py`  | LLM answer generator (Groq)               |
| `src/retrieval/retriever.py`   | ChromaDB semantic retrieval               |
| `src/embedding/embedder.py`    | Embedding function + index loader         |
| `scripts/build_index.py`    | Local-only: rebuild the vectorstore         |
| `requirements.txt`          | Python dependencies for deployment          |
| `data/vectorstore/`         | Pre-built ChromaDB (must be committed)      |

---

*Generated: 2026-10-02 | Target Platform: Streamlit Community Cloud (free tier)*

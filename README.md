# 🥦 Food Guidance RAG ChatBot

> **A production-grade Retrieval-Augmented Generation chatbot for dietary and food-safety guidance — grounded exclusively in official sources, with inline citations and smart refusal handling.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel&style=for-the-badge)](https://food-guidance-rag-chat-bot-vdgr.vercel.app/)

---

## 🌐 Live Demo

**🚀 Deployed URL:** [https://food-guidance-rag-chat-bot-vdgr.vercel.app/](https://food-guidance-rag-chat-bot-vdgr.vercel.app/)

**🎥 Video Demo:** [Watch on Google Drive](https://drive.google.com/file/d/1J1tEw3iXNdho-kf_8egCsHIYuPOpHy_A/view?usp=sharing)

---

## ✨ Features

| Feature | Description |
|---|---|
| **RAG Pipeline** | Retrieve → Classify → Generate → Cite — fully grounded, no hallucinations |
| **Inline Citations** | Every factual claim links to its source document |
| **OOS Refusal** | Medical / weight-loss questions refused with a professional referral |
| **NIC Refusal** | Off-topic questions declined naming the searched documents |
| **Multi-Source Answers** | Cross-document answers rendered per-source with `**According to X:**` sections |
| **Chat Sessions** | Multiple simultaneous sessions with full conversation history |
| **Follow-up Questions** | LLM understands prior conversation turns for natural dialogue |
| **Message Editing** | Edit any past message — history truncates and pipeline re-runs |
| **Document Filter** | Scope retrieval to a single source document via dropdown |
| **Share Links** | Generate a public read-only snapshot of any conversation |
| **Session Persistence** | Active session restored from `localStorage` on reload |

---

## 🏗️ Architecture

```
User Browser
    │
    ▼
Next.js 14 Frontend (Vercel)
frontend/src/app/page.tsx
frontend/src/lib/api.ts
    │
    │  REST API (/api/*)
    ▼
FastAPI Backend — api/index.py  (Vercel Serverless Python)
    │
    ▼
src/pipeline.py  — run_query()
    ├── src/generation/classifier.py      → Intent classification (Groq LLM)
    ├── src/retrieval/retriever.py         → ChromaDB semantic search
    ├── src/generation/generator.py       → Answer generation (Groq LLM)
    └── src/generation/citation_builder.py → Citation formatting
    │
    └── data/vectorstore/                 → Pre-built ChromaDB (committed to repo)
```

**External services:**
- **[Groq](https://groq.com)** — Ultra-fast LLM inference (`openai/gpt-oss-120b`)
- **ChromaDB** — Local persistent vector store (ONNX runtime, bundled in repo)
- **BAAI/bge-small-en-v1.5** — Sentence embedding model (via ChromaDB ONNX backend)

---

## 📚 Knowledge Corpus

The chatbot answers only from these 7 official documents:

| Document | Publisher | Year |
|---|---|---|
| WHO Healthy Diet Fact Sheet | WHO | 2023 |
| The Eatwell Guide | NHS / Public Health England | 2016 |
| WHO Five Keys to Safer Food | WHO | 2015 |
| Food-Based Dietary Guidelines | FAO / WHO | 2019 |
| FSA Chilled Food Safety Guidance | Food Standards Agency (UK) | 2021 |
| Kitchen Companion | USDA / FSIS | 2020 |
| Cold Food Storage Chart | USDA / FoodSafety.gov | 2022 |

The corpus is pre-processed into **1,001 blocks** in `docs/blocks.jsonl`, embedded with `BAAI/bge-small-en-v1.5`, and stored in ChromaDB at `data/vectorstore/`.

---

## 🗂️ Project Structure

```
Food_Guidance_RAG_ChatBot/
├── api/
│   └── index.py                  # FastAPI backend (Vercel entry point)
├── app/
│   └── streamlit_app.py          # Legacy Streamlit UI (local dev only)
├── data/
│   └── vectorstore/              # Pre-built ChromaDB (committed)
├── docs/
│   ├── blocks.jsonl              # 1,001 pre-chunked document blocks
│   ├── architecture.md
│   ├── implementation-plan.md
│   ├── deployment-plan.md
│   └── problemStatement.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main chat interface
│   │   │   ├── layout.tsx        # Root layout + SEO
│   │   │   ├── globals.css
│   │   │   └── share/[sessionId]/page.tsx  # Shareable read-only view
│   │   ├── lib/api.ts            # Typed REST client
│   │   └── types/index.ts        # TypeScript types
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.ts
├── scripts/
│   ├── build_index.py            # Offline: build ChromaDB from blocks.jsonl
│   └── query_cli.py              # CLI testing tool
├── src/
│   ├── embedding/embedder.py     # Embedding function + index loader
│   ├── generation/
│   │   ├── classifier.py         # Intent classifier (OOS detection)
│   │   ├── generator.py          # LLM answer generator
│   │   ├── citation_builder.py   # Citation parsing + formatting
│   │   └── refusal_handler.py    # OOS + NIC refusal messages
│   ├── ingest/
│   │   ├── loader.py             # load_blocks() + CORPUS_META
│   │   └── models.py             # ChunkRecord, DocumentRecord dataclasses
│   ├── retrieval/retriever.py    # retrieve() + is_relevant()
│   └── pipeline.py               # run_query() — full RAG orchestrator
├── tests/
│   ├── test_loader.py
│   └── test_retriever.py
├── requirements.txt
└── README.md
```

---

## ⚡ Quick Start — Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone & Install Python Dependencies

```bash
git clone https://github.com/your-username/Food_Guidance_RAG_ChatBot.git
cd Food_Guidance_RAG_ChatBot

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
GROQ_API_KEY=gsk_...           # Your Groq API key (https://console.groq.com)
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
LLM_MODEL=openai/gpt-oss-120b
CHROMA_PERSIST_DIR=data/vectorstore
CHROMA_COLLECTION=food_guidance_onnx
SCORE_THRESHOLD=0.55
TOP_K=5
```

### 3. Build the Vector Index (if not pre-built)

> ⚠️ Skip this step if `data/vectorstore/` already exists in the repo.

```bash
python scripts/build_index.py
```

### 4. Run the Backend

```bash
uvicorn api.index:app --reload --port 8000
```

### 5. Run the Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev   # http://localhost:3000
```

---

## 🔌 API Reference

Base URL (production): `https://food-guidance-rag-chat-bot-vdgr.vercel.app`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/documents` | List available source documents |
| `GET` | `/api/sessions` | List all chat sessions |
| `POST` | `/api/sessions` | Create new session |
| `GET` | `/api/sessions/{id}` | Get session with full history |
| `PATCH` | `/api/sessions/{id}` | Update session title / filter |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `GET` | `/api/sessions/{id}/share` | Shareable read-only snapshot |
| `POST` | `/api/sessions/{id}/messages` | Send message (runs RAG pipeline) |
| `PATCH` | `/api/sessions/{id}/messages/{idx}` | Edit message & regenerate |

---

## 🧠 Pipeline Flow

```
User Query
    │
    ▼
[1] classify_query()          ← Keyword guard + Groq LLM intent classifier
    │
    ├─► REFUSE_OOS             ← Medical / weight / BMI / symptom queries
    │
    ▼
[2] retrieve()                 ← ChromaDB semantic search (top-k=5, threshold=0.55)
    │
    ├─► REFUSE_NIC             ← No relevant chunks found
    │
    ▼
[3] generate_answer()          ← Groq LLM with [REF-N] citation instructions
    │
    ├─► NOT_IN_CORPUS          ← LLM signals no relevant content → NIC refusal
    │
    ▼
[4] build_citations()          ← Map [REF-N] markers to source metadata
    │
    ▼
[5] format_response()          ← Inline citations + References block
    │
    ▼
ChatResponse returned to frontend
```

---

## 🛡️ Refusal Modes

| Mode | Trigger | Visual |
|---|---|---|
| **OOS** (Out of Scope) | Medical advice, weight loss, diagnoses | 🔴 Red bubble |
| **NIC** (Not in Corpus) | Question not covered by any source doc | 🟡 Amber bubble |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.10+, Uvicorn |
| **LLM** | Groq API (`openai/gpt-oss-120b`) |
| **Vector DB** | ChromaDB (ONNX runtime, persistent) |
| **Embeddings** | `BAAI/bge-small-en-v1.5` via ChromaDB ONNX |
| **Deployment** | Vercel (full-stack: serverless Python + Next.js) |
| **Animations** | Framer Motion |
| **Markdown** | react-markdown + remark-gfm |

---

## 📦 Python Dependencies

```
openai>=1.0.0
groq>=0.4.0
chromadb>=0.5.0
pysqlite3-binary>=0.5.0
numpy<2.0.0
python-dotenv>=1.0.0
fastapi>=0.110.0
uvicorn>=0.27.0
pytest>=8.0.0
rich>=13.0.0
```

---

## 🧪 Running Tests

```bash
pytest tests/ -v
```

---

## 🚀 Deployment

The full app (frontend + backend) is deployed on **Vercel**:

- **Frontend** — Next.js served as static/SSR pages
- **Backend** — FastAPI running as Vercel Serverless Python functions under `/api/*`
- **Vector store** — `data/vectorstore/` is committed to the repository and served from disk

See [`docs/deployment-plan.md`](docs/deployment-plan.md) for the full step-by-step deployment guide.

---

## 📄 License

This project is for educational purposes. All dietary content is sourced from publicly available official documents (WHO, NHS, USDA, FSA, FAO).

---

*Built with ❤️ using FastAPI, Next.js, ChromaDB, and Groq.*

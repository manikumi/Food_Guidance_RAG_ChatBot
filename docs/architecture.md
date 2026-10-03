# Architecture — Dietary Guidance RAG Chatbot

> **Document:** `docs/architecture.md`
> **Project:** Food Guidance RAG ChatBot
> **Created:** 2026-09-28
> **Updated:** 2026-10-03 — reflects Phase 7 completion, FastAPI backend (Vercel), Next.js frontend (Railway), multi-session chat with conversation history

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
   - 3.1 [Document Ingestion Pipeline](#31-document-ingestion-pipeline)
   - 3.2 [Chunking Engine](#32-chunking-engine)
   - 3.3 [Embedding & Vector Index](#33-embedding--vector-index)
   - 3.4 [Query Classifier](#34-query-classifier)
   - 3.5 [Retriever](#35-retriever)
   - 3.6 [Answer Generator](#36-answer-generator)
   - 3.7 [Citation Layer](#37-citation-layer)
   - 3.8 [Refusal Handler](#38-refusal-handler)
   - 3.9 [Chat Interface — Next.js Frontend (Railway)](#39-chat-interface--nextjs-frontend-railway)
   - 3.10 [REST API Backend (Vercel)](#310-rest-api-backend-vercel)
4. [Data Models](#4-data-models)
   - 4.1 [Document Record](#41-document-record)
   - 4.2 [Chunk Record](#42-chunk-record)
   - 4.3 [Retrieved Context Object](#43-retrieved-context-object)
   - 4.4 [Chat Response Object](#44-chat-response-object)
   - 4.5 [Chat Session & Message Models](#45-chat-session--message-models)
5. [Corpus](#5-corpus)
6. [Retrieval Strategy](#6-retrieval-strategy)
7. [Prompt Design](#7-prompt-design)
8. [Refusal Logic](#8-refusal-logic)
9. [Citation Format](#9-citation-format)
10. [Directory Structure](#10-directory-structure)
11. [Technology Stack](#11-technology-stack)
12. [Data & Request Flow — Step by Step](#12-data--request-flow--step-by-step)
13. [Design Decisions & Trade-offs](#13-design-decisions--trade-offs)
14. [Constraints & Non-Negotiables](#14-constraints--non-negotiables)

---

## 1. System Overview

The Dietary Guidance RAG Chatbot is a **Retrieval-Augmented Generation (RAG)** system that answers questions about food, nutrition, and food safety strictly from a curated corpus of official public guidance documents. It is **not** a general-purpose food assistant — it is a grounded, citation-first information retrieval layer over authoritative written prose.

```
Core promise: Every answer is either sourced from the corpus with a citation,
              or the system explicitly says it cannot answer.
```

**Key architectural properties:**

| Property | Detail |
|---|---|
| Grounding | Answers derived exclusively from retrieved document chunks |
| Citations | Every claim carries document name, publisher, year, and source URL |
| Refusal | Two distinct modes: not in corpus, and out of scope by design |
| Isolation | Cross-document answers keep each source's claims separate |
| No blending | Claims from different documents are never merged |

---

## 2. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         OFFLINE PIPELINE                             │
│  [STEPS 3.1 & 3.2 PRE-COMPLETED]                                    │
│                                                                      │
│  docs/blocks.jsonl  →  loader.py  →  embedder.py  →  ChromaDB       │
└──────────────────────────────────────────────────┬───────────────────┘
                                                   │
                                         data/vectorstore/
                                                   │
┌──────────────────────┐     REST API      ┌───────┴───────────────────┐
│  Next.js Frontend    │ ◄────────────────► │  FastAPI Backend          │
│  (Railway)           │                   │  (Vercel)                  │
│                      │                   │                            │
│  • Multi-session     │                   │  api/main.py               │
│    sidebar           │                   │  POST /sessions/{id}/msgs  │
│  • Chat history      │                   │        │                   │
│  • Message editing   │                   │        ▼                   │
│  • Shareable links   │                   │  src/pipeline.run_query()  │
│  • Doc filter        │                   │        │                   │
└──────────────────────┘                   │   ┌────┴────┐             │
                                           │   │Classify │             │
                                           │   └────┬────┘             │
                                           │        │ In-scope         │
                                           │   ┌────┴────┐             │
                                           │   │Retrieve │ (ChromaDB)  │
                                           │   └────┬────┘             │
                                           │        │ chunks found     │
                                           │   ┌────┴────┐             │
                                           │   │Generate │ (Groq LLM)  │
                                           │   └────┬────┘             │
                                           │        │                  │
                                           │   ┌────┴────┐             │
                                           │   │ Cite    │             │
                                           │   └────┬────┘             │
                                           │        ▼                  │
                                           │   ChatResponse JSON       │
                                           └───────────────────────────┘
```

---

## 3. Component Breakdown

> [!IMPORTANT]
> **Steps 3.1 and 3.2 are pre-completed.** The file [`docs/blocks.jsonl`](./blocks.jsonl) already contains 1,001 pre-fetched, pre-parsed, and pre-chunked blocks across 7 documents. **Skip directly to [§3.3 Embedding & Vector Index](#33-embedding--vector-index)** and load the data using the loader described in those sections.

### 3.1 Document Ingestion Pipeline

> [!WARNING]
> **SKIPPED — Pre-fetched data available.** `docs/blocks.jsonl` already contains all raw document content, fetched and parsed from source URLs. There is no need to run the ingestion pipeline. This section is retained for reference only.

**Responsibility:** Download, parse, and persist raw document content alongside structured metadata.

**Steps:**
1. Fetch documents from public URLs (HTTP GET, with retry logic).
2. Parse content based on format:
   - **PDF:** Use `PyMuPDF` (`fitz`) or `pdfplumber` to extract text, preserving section headings and page numbers.
   - **HTML:** Use `BeautifulSoup` to extract body text, stripping nav/footer/sidebar noise.
3. Persist raw text to `data/raw/<document_id>.txt`.
4. Write document metadata to `data/corpus_index.json`.

**Inputs:** Public URLs from the corpus table.
**Outputs:** Raw text files + `corpus_index.json`.

---

### 3.2 Chunking Engine

> [!WARNING]
> **SKIPPED — Pre-chunked data available.** Each record in `docs/blocks.jsonl` is already a discrete block (`paragraph`, `list_item`, `table`, `heading`) with a `heading_path` field that provides full section context. The chunking strategy described below was effectively applied during data collection. Use `src/ingest/loader.py` to load blocks directly into `ChunkRecord` objects and proceed to §3.3.

**Responsibility:** Split raw document text into semantically coherent chunks, each carrying full provenance metadata.

**Strategy — Hierarchical / Section-Aware Chunking:**

The documents contain numbered recommendations, tables, and multi-paragraph sections. A naive fixed-size token splitter would cut these structures mid-sentence. The chosen strategy is:

1. **Split by section heading** first — detect headings via regex patterns (e.g., `## `, all-caps lines, numbered section markers like `1.`, `1.1`).
2. **Within each section**, apply a **recursive character splitter** with:
   - `chunk_size = 512 tokens`
   - `chunk_overlap = 64 tokens`
   - Splitting hierarchy: `\n\n` → `\n` → `. ` → ` `
3. **Tables:** Detected via pipe characters or consistent whitespace alignment. Kept as a single chunk regardless of size, tagged with `chunk_type = "table"`.
4. **Numbered lists / recommendations:** Kept together as one chunk when the list is ≤ 600 tokens.

Each chunk is stored as a structured record (see [§4.2](#42-chunk-record)).

**Trade-offs documented here:**

| Decision | Cost |
|---|---|
| Section-aware split preserves context | Sections vary wildly in length; some chunks may be large |
| Tables kept whole | A large table becomes a single oversized chunk |
| Overlap of 64 tokens | Slight redundancy in index; increases storage |
| Numbered lists kept together | May miss granular sub-recommendations |

---

### 3.3 Embedding & Vector Index

**Responsibility:** Convert chunks to dense vector representations and store them in a searchable index with metadata filters.

**Embedding Model:** `text-embedding-3-small` (OpenAI) or `all-MiniLM-L6-v2` (sentence-transformers, local fallback).

**Vector Store:** `ChromaDB` (default) — supports:
- Metadata filtering (e.g., `document_name == "WHO Food Safety"`)
- Persistent storage on disk (`data/vectorstore/`)
- Collection-level namespacing

**Index construction:**
```
for each chunk:
    vector = embed(chunk.text)
    vectorstore.add(
        id        = chunk.chunk_id,
        embedding = vector,
        document  = chunk.text,
        metadata  = {
            document_name, publisher, year,
            source_url, section_heading,
            chunk_type, page_number
        }
    )
```

---

### 3.4 Query Classifier

**Responsibility:** Determine whether an incoming question is safe to route to the retriever or must be immediately refused.

**Classification logic (rule-based + LLM hybrid):**

1. **Keyword guard (fast, deterministic):**
   - Block list includes: `BMI`, `lose weight`, `calorie deficit`, `how much should I weigh`, `diagnose`, `symptom`, `medication`, `disease`, `treatment`.
   - If any keyword matches → route to Refusal Handler (Out-of-Scope mode).

2. **LLM intent classifier (for ambiguous cases):**
   - Short system prompt classifying the query as one of:
     - `FOOD_SAFETY` — safe to retrieve
     - `NUTRITION_GUIDANCE` — safe to retrieve
     - `MEDICAL_ADVICE` — refuse (OOS)
     - `WEIGHT_BODY_COMPOSITION` — refuse (OOS)
     - `GENERAL_FOOD_QUESTION` — safe to retrieve
   - Returns a JSON label + confidence score.

**Output:** `{ "route": "RETRIEVE" | "REFUSE_OOS", "label": "...", "confidence": 0.0–1.0 }`

---

### 3.5 Retriever

**Responsibility:** Find the most relevant chunks for a given query, with support for global and per-document retrieval.

**Retrieval modes:**

| Mode | Description | When used |
|---|---|---|
| **Global** | Top-k across all documents | Default for most questions |
| **Filtered** | Top-k within one named document | When user specifies a source or for cross-doc resolution |

**Parameters:**
- `top_k = 5` (default; up to 8 for cross-document questions)
- Similarity metric: cosine similarity
- Minimum relevance score threshold: `0.35` (below this = "not in corpus" trigger)

**Cross-document retrieval flow:**
1. Run global retrieval.
2. Group returned chunks by `document_name`.
3. If ≥ 2 documents returned relevant chunks → flag as cross-document answer.
4. Answer Generator is instructed to produce per-document sub-answers.

**Output:** `List[Chunk]` — ordered by relevance score, with full metadata.

---

### 3.6 Answer Generator

**Responsibility:** Synthesise a grounded answer using only the retrieved chunks as context.

**Model:** GPT-4o (or compatible LLM via OpenAI API / local Ollama).

**System prompt (abbreviated):**
```
You are a dietary guidance assistant. You answer questions strictly using
the provided document excerpts. Rules:
- Never use knowledge outside the provided excerpts.
- Every factual claim must reference its source chunk by [REF-N].
- For cross-document questions, answer per source — never merge claims.
- If the excerpts do not answer the question, reply: "NOT_IN_CORPUS".
- Never give medical advice, diagnoses, or weight/calorie targets.
```

**Prompt structure:**
```
[SYSTEM]  <system prompt above>
[USER]    Question: {user_query}

          Context:
          [REF-1] ({document_name}, {publisher}, {year}, §{section_heading})
          {chunk_text}

          [REF-2] ({document_name}, {publisher}, {year}, §{section_heading})
          {chunk_text}

          ...

          Answer using only the above context. Cite each claim as [REF-N].
```

**Output:** Raw answer string with inline `[REF-N]` markers.

---

### 3.7 Citation Layer

**Responsibility:** Replace `[REF-N]` markers in the raw answer with structured, human-readable citations.

**Citation format (inline):**

> *"Vegetables should make up over a third of the food you eat each day. [NHS Eatwell Guide, NHS / Public Health England, 2016](https://www.nhs.uk/...)*"

**Citation record structure:**
```json
{
  "ref_id": "REF-1",
  "document_name": "The Eatwell Guide",
  "publisher": "NHS / Public Health England",
  "year": 2016,
  "section_heading": "The food groups",
  "source_url": "https://www.nhs.uk/live-well/eat-well/..."
}
```

**Output:** Final answer string with inline hyperlinked citations + a `References` block at the end of each response.

---

### 3.8 Refusal Handler

**Responsibility:** Generate the appropriate refusal message for one of two modes.

#### Mode A — Not In Corpus (NIC)

Triggered when: relevance score of all retrieved chunks < threshold, or LLM returns `NOT_IN_CORPUS`.

**Response template:**
```
I searched the following guidance documents but could not find information
covering your question:
  - {doc_1_name} ({publisher_1}, {year_1})
  - {doc_2_name} ({publisher_2}, {year_2})
  ...
If you believe this topic should be covered, please consult the documents
directly or contact the relevant health authority.
```

#### Mode B — Out of Scope by Design (OOS)

Triggered when: query classifier routes to `REFUSE_OOS`.

**Response template:**
```
This question involves {medical advice / weight or calorie targets}, which
falls outside what this assistant can provide.

Please consult a qualified professional such as a registered dietitian,
nutritionist, or your physician for personalised guidance.
```

---

### 3.9 Chat Interface — Next.js Frontend (Railway)

**Responsibility:** Production-grade chat UI deployed to Railway, consuming the FastAPI backend via REST.

**Technology:** Next.js 14 (App Router), TypeScript, Vanilla CSS, React.

**Key features:**

| Feature | Implementation |
|---|---|
| Multiple chat sessions | Sidebar with full session list; new session on button click |
| Chat history display | Scrollable message area, timestamps, source badges |
| Follow-up question support | Full conversation history forwarded to LLM on each turn |
| Chat persistence | Session ID saved to `localStorage`; loaded from API on reopen |
| Message editing | Inline edit → truncate history → re-run pipeline from edit point |
| Shareable link | Modal with copyable URL; read-only `/share/[sessionId]` view page |
| Document filter | Dropdown in header scopes retrieval to a single source document |
| Typing indicator | Three-dot animated indicator during LLM response |
| Suggestion cards | Welcome screen with pre-filled example questions |
| Markdown rendering | `react-markdown` + `remark-gfm` for citations, tables, code blocks |

**Entry points:**
- `frontend/src/app/page.tsx` — main chat interface
- `frontend/src/app/share/[sessionId]/page.tsx` — shareable read-only view
- `frontend/src/lib/api.ts` — typed REST API client

**Session state:** Managed server-side in the FastAPI backend (`_sessions` dict). The frontend holds only the active session ID in `localStorage` for persistence across page refreshes.

---

### 3.10 REST API Backend (Vercel)

**Responsibility:** Stateful FastAPI backend deployed to Vercel serverless functions, orchestrating the RAG pipeline and managing chat sessions.

**Entry point:** `api/main.py`

**Session management:** In-memory Python dict (`_sessions`). For production scale, replace with Redis or a managed database.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/documents` | List available source documents |
| GET | `/sessions` | List all sessions (sorted newest-first) |
| POST | `/sessions` | Create new empty session |
| GET | `/sessions/{id}` | Get full session with all messages |
| PATCH | `/sessions/{id}` | Update session title or document filter |
| DELETE | `/sessions/{id}` | Delete session |
| GET | `/sessions/{id}/share` | Return shareable read-only snapshot |
| POST | `/sessions/{id}/messages` | Send message, run pipeline, get response |
| PATCH | `/sessions/{id}/messages/{idx}` | Edit message, truncate history, re-run |

**Conversation history flow:**
```
POST /sessions/{id}/messages
  body: { content, filter_doc? }
    │
    ├── Appends user message to session
    ├── Builds chat_history from prior session messages
    ├── Calls run_query(content, filter_doc, chat_history=history)
    │       └── generator.py injects history as LLM context turns
    └── Returns { user_message, assistant_message, session }
```

**CORS:** `FRONTEND_ORIGIN` env var restricts access to the Railway frontend URL.

---

## 4. Data Models

### 4.1 Document Record

> [!NOTE]
> Since 3.1 (ingestion) is skipped, `DocumentRecord` objects are **not created by a fetcher** — they are constructed from the `CORPUS_META` lookup dict in `src/ingest/loader.py` using the `document_id` values present in `docs/blocks.jsonl`. Fields `retrieval_date`, `local_path`, and `format` are either hardcoded or omitted when loading from the pre-built file.

```python
@dataclass
class DocumentRecord:
    document_id: str          # slug matching blocks.jsonl document_id (e.g. "who-healthy-diet")
    document_name: str        # human title — from CORPUS_META lookup
    publisher: str            # issuing authority — from CORPUS_META lookup
    year: int                 # publication year — from CORPUS_META lookup
    source_url: str           # canonical public URL — from CORPUS_META lookup
    retrieval_date: str       # ISO 8601 date — set to blocks.jsonl retrieval date (not from fetcher)
    local_path: str           # NOT USED when loading from blocks.jsonl; set to "docs/blocks.jsonl"
    format: str               # NOT USED when loading from blocks.jsonl; set to "jsonl"
```

---

### 4.2 Chunk Record

```python
@dataclass
class ChunkRecord:
    chunk_id: str             # uuid4
    document_id: str          # FK → DocumentRecord
    document_name: str
    publisher: str
    year: int
    source_url: str
    section_heading: str      # nearest heading above this chunk
    page_number: int | None   # page number if PDF
    chunk_type: str           # "text" | "table" | "list"
    text: str                 # raw chunk content
    token_count: int          # approximate token length
    embedding: list[float]    # stored in vector DB, not in JSON
```

---

### 4.3 Retrieved Context Object

```python
@dataclass
class RetrievedContext:
    chunks: list[ChunkRecord]
    scores: list[float]           # cosine similarity per chunk
    is_cross_document: bool       # True if chunks span ≥ 2 documents
    documents_searched: list[str] # all document_names queried
    filter_applied: str | None    # document_name if filtered retrieval
```

---

### 4.4 Chat Response Object

```python
@dataclass
class ChatResponse:
    answer: str                   # final answer with inline citations
    citations: list[dict]         # list of CitationRecord dicts
    refusal_mode: str | None      # "NIC" | "OOS" | None
    documents_used: list[str]     # document_names that contributed
    is_cross_document: bool
```

---

### 4.5 Chat Session & Message Models

Defined in `api/main.py` (Pydantic models for the REST layer):

```python
class ChatMessage(BaseModel):
    role: str                     # "user" | "assistant"
    content: str                  # message text (markdown for assistant)
    refusal_mode: Optional[str]   # "NIC" | "OOS" | None
    is_cross_document: bool
    documents_used: List[str]
    timestamp: str                # ISO 8601 UTC

class ChatSession(BaseModel):
    session_id: str               # UUID4
    title: str                    # auto-set from first user message
    created_at: str
    updated_at: str
    messages: List[ChatMessage]
    filter_doc: Optional[str]     # active document scope filter
```

**Chat history format forwarded to pipeline:**
```python
# List of prior turns (excludes current user message)
history = [
    {"role": "user",      "content": "How much salt per day?"},
    {"role": "assistant", "content": "No more than 5g ... [REF-1]"},
    {"role": "user",      "content": "What about potassium?"},
    ...
]
# Injected by generator.py as conversation context before the current query
```

---

## 5. Corpus

The 6 selected official guidance documents:

| # | Document Title | Publisher | Year | URL |
|---|---|---|---|---|
| 1 | Healthy Eating — Nutrition and Food Safety | WHO | 2023 | https://www.who.int/initiatives/behealthy/healthy-diet |
| 2 | The Eatwell Guide | NHS / Public Health England | 2016 | https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/ |
| 3 | Food Safety — Key Facts | WHO | 2022 | https://www.who.int/news-room/fact-sheets/detail/food-safety |
| 4 | Dietary Reference Intakes (DRI) — Macronutrients | Health Canada | 2023 | https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html |
| 5 | Food-Based Dietary Guidelines — Background and Principles | FAO / WHO | 2019 | https://www.fao.org/3/I9659EN/i9659en.pdf |
| 6 | Scientific Opinion on Dietary Reference Values for Energy | EFSA | 2017 | https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2017.4863 |

**Coverage across documents:**
- **Food safety & handling:** Documents 3, 2
- **Nutrition guidance & food groups:** Documents 1, 2, 5
- **Dietary reference values / macronutrients:** Documents 4, 6
- **Cross-doc coverage (e.g., cooking oils):** Documents 1 (nutrition) + 3 (safety)

---

## 6. Retrieval Strategy

```
Query
  │
  ├──[filter_doc provided?]──YES──► Filtered retrieval (ChromaDB where clause)
  │
  └──NO──► Global retrieval (all documents)
              │
              ▼
         Top-k by cosine similarity
              │
              ├──[max score < 0.35]──► Route to NIC Refusal
              │
              └──[score ≥ 0.35]──► Pass chunks to Answer Generator
                      │
                      └──[chunks from ≥ 2 docs]──► Flag cross-document = True
```

**Re-ranking (optional enhancement):**
After top-k retrieval, apply a cross-encoder re-ranker (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`) to re-score chunks before passing to the LLM. This improves precision especially for cross-document questions.

---

## 7. Prompt Design

### System Prompt
```
You are a dietary guidance assistant. Your only job is to answer questions 
about food, nutrition, and food safety using the provided document excerpts.

Hard rules:
1. Answer ONLY from the provided [REF-N] excerpts. Do not use outside knowledge.
2. Every factual claim must end with its reference: e.g., "... [REF-1]."
3. If the question spans multiple documents, answer per document with its own
   heading and citation. Never merge claims from different documents.
4. If no excerpt is relevant, respond with exactly: NOT_IN_CORPUS
5. Never provide medical advice, diagnoses, calorie targets, or weight guidance.
   If asked, respond with exactly: OUT_OF_SCOPE
6. Do not speculate, hedge with "probably", or extrapolate beyond what is stated.
```

### User Turn Template
```
Question: {user_query}

Context:
[REF-1] Source: {document_name} | {publisher} | {year} | §{section_heading}
{chunk_text}

[REF-2] Source: {document_name} | {publisher} | {year} | §{section_heading}
{chunk_text}

[REF-3] ...

Answer strictly from the above context only.
```

---

## 8. Refusal Logic

```
                  ┌──────────────┐
  User Query ────►│   Classifier  │
                  └──────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        REFUSE_OOS            RETRIEVE
              │                     │
              ▼                     ▼
     OOS Refusal Msg         Vector Search
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                   score < 0.35          score ≥ 0.35
                         │                     │
                         ▼                     ▼
                   NIC Refusal Msg     Answer Generator
                                             │
                                   LLM returns NOT_IN_CORPUS?
                                             │
                                   YES ──► NIC Refusal Msg
                                   NO  ──► Citation Layer ──► Response
```

---

## 9. Citation Format

### Inline Citation (in answer body)
```
Fats should make up no more than 30% of total energy intake [REF-1].
```

### Reference Block (appended to every response)
```
---
References
[REF-1] WHO (2023). Healthy Eating — Nutrition and Food Safety.
        https://www.who.int/initiatives/behealthy/healthy-diet
        Section: Fats

[REF-2] NHS / Public Health England (2016). The Eatwell Guide.
        https://www.nhs.uk/live-well/eat-well/...
        Section: Oils & Spreads
```

### Cross-Document Answer Format
```
**According to WHO (Healthy Eating, 2023):**
Saturated fats should be limited. [REF-1]

**According to NHS / Public Health England (The Eatwell Guide, 2016):**
Choose unsaturated oils like olive or sunflower oil. [REF-2]
```

---

## 10. Directory Structure

```
Food_Guidance_RAG_ChatBot/
│
├── api/
│   └── main.py                     # ✅ FastAPI backend (deployed to Vercel)
│                                   #    Sessions, messages, share endpoints
│
├── frontend/                       # ✅ Next.js 14 frontend (deployed to Railway)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout + SEO metadata
│   │   │   ├── page.tsx            # Main ChatGPT-style chat interface
│   │   │   ├── globals.css         # Full design system (dark theme, animations)
│   │   │   └── share/
│   │   │       └── [sessionId]/
│   │   │           └── page.tsx    # Read-only shareable conversation view
│   │   ├── lib/
│   │   │   └── api.ts              # Typed REST API client
│   │   └── types/
│   │       └── index.ts            # TypeScript types (mirrors Pydantic models)
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── data/
│   ├── vectorstore/                # ChromaDB persistent storage (committed for deployment)
│   └── corpus_index.json           # document metadata registry (built by loader.py)
│
│   NOTE: data/raw/ and data/chunks/ are NOT needed.
│         docs/blocks.jsonl is the source of truth for all document content.
│
├── docs/
│   ├── blocks.jsonl                # ✅ PRE-BUILT: 1,001 blocks from 7 documents
│   ├── architecture.md             # this file
│   ├── implementation-plan.md
│   ├── problemStatement.md
│   └── stitch-prompt.md            # ✅ Google Stitch UI design prompt
│
├── src/
│   ├── ingest/
│   │   ├── loader.py               # load blocks.jsonl → ChunkRecord objects
│   │   └── models.py               # ChunkRecord, DocumentRecord dataclasses
│   ├── embedding/
│   │   └── embedder.py             # embed ChunkRecords + upsert to ChromaDB
│   ├── retrieval/
│   │   ├── retriever.py            # global + filtered retrieval
│   │   └── reranker.py             # optional cross-encoder re-ranking
│   ├── generation/
│   │   ├── classifier.py           # query intent classifier (Groq LLM)
│   │   ├── generator.py            # LLM answer generation + chat history support
│   │   ├── citation_builder.py     # REF-N → structured citations
│   │   └── refusal_handler.py      # NIC and OOS refusal templates
│   └── pipeline.py                 # run_query() orchestrator (accepts chat_history)
│
├── app/
│   └── streamlit_app.py            # Legacy Streamlit interface (local dev / fallback)
│
├── scripts/
│   ├── build_index.py              # offline: load + embed + index pipeline
│   └── query_cli.py                # CLI tool for retrieval testing
│
├── tests/
│   ├── test_loader.py
│   ├── test_retriever.py
│   └── test_pipeline.py
│
├── .env                            # GROQ_API_KEY, model configs (not committed)
├── requirements.txt                # Python backend dependencies
├── vercel.json                     # ✅ Vercel deployment config (backend)
├── railway.json                    # ✅ Railway deployment config (frontend)
└── deployment-plan.md              # Step-by-step deployment guide
```

---

## 11. Technology Stack

### Backend

| Layer | Library / Tool | Purpose | Status |
|---|---|---|---|
| **Data loading** | `json` (stdlib) | Load `docs/blocks.jsonl` → `ChunkRecord` objects | ✅ Replaces 3.1 & 3.2 |
| **PDF parsing** | `PyMuPDF` (`fitz`) | Extract text + structure from PDFs | ⛔ Not needed — pre-parsed |
| **HTML parsing** | `BeautifulSoup4` | Extract prose from web pages | ⛔ Not needed — pre-parsed |
| **Chunking** | `LangChain RecursiveCharacterTextSplitter` | Recursive splitting with overlap | ⛔ Not needed — pre-chunked |
| **Embedding** | `sentence-transformers` (`BAAI/bge-large-en-v1.5`) | Dense vector generation (local) | ✅ Active |
| **Vector store** | `ChromaDB` | Persistent local vector DB with metadata filter | ✅ Active |
| **LLM — Classifier** | `Groq` + `openai/gpt-oss-120b` (or `qwen/qwen3-27b`) | Intent classification | ✅ Active |
| **LLM — Generator** | `Groq` + `openai/gpt-oss-120b` (or `qwen/qwen3-27b`) | Answer generation with chat history | ✅ Active |
| **Re-ranking** | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Optional precision boost | ✅ Optional |
| **REST API** | `FastAPI` + `uvicorn` | Backend API; session & pipeline orchestration | ✅ Active |
| **Backend deployment** | `Vercel` (serverless Python) | Hosts `api/main.py` | ✅ Active |
| **Config** | `python-dotenv` | Environment variable management | ✅ Active |
| **Testing** | `pytest` | Unit + integration tests | ✅ Active |

### Frontend

| Layer | Library / Tool | Purpose | Status |
|---|---|---|---|
| **Framework** | `Next.js 14` (App Router) | React SSR/SPA frontend | ✅ Active |
| **Language** | `TypeScript` | Type-safe API client and components | ✅ Active |
| **Styling** | Vanilla CSS (custom properties) | Full design system, dark theme | ✅ Active |
| **Markdown** | `react-markdown` + `remark-gfm` | Renders citations, tables, code blocks | ✅ Active |
| **Animations** | CSS keyframes + `framer-motion` | Micro-animations, transitions | ✅ Active |
| **Dates** | `date-fns` | Message timestamp formatting | ✅ Active |
| **Frontend deployment** | `Railway` | Hosts Next.js frontend | ✅ Active |
| **Legacy UI** | `Streamlit` | Local dev / fallback interface | ✅ Retained |

---

## 12. Data & Request Flow — Step by Step

### Offline (Build Phase)

> [!IMPORTANT]
> **Steps 1–3 are replaced by a single Load step** using `docs/blocks.jsonl`. Run `scripts/build_index.py` instead of `scripts/build_corpus.py`.

```
[SKIPPED] Step 1 — Fetch
  Was: fetcher.py downloads documents → data/raw/
  Now: docs/blocks.jsonl already contains all content. No download needed.

[SKIPPED] Step 2 — Parse
  Was: parser_pdf.py / parser_html.py → clean text
  Now: blocks.jsonl records are already parsed text. No parsing needed.

[SKIPPED] Step 3 — Chunk
  Was: section_splitter.py + chunker.py → data/chunks/chunks.jsonl
  Now: each block in blocks.jsonl IS a chunk (paragraph / list_item / table).
       heading_path provides section context. No splitting needed.

Step 1 (NEW) — Load   ← ACTUAL ENTRY POINT
  scripts/build_index.py
    → loader.py reads docs/blocks.jsonl line by line
    → skips blocks where type == "heading" (metadata only)
    → maps each block to a ChunkRecord using CORPUS_META for publisher/year/url
    → writes corpus_index.json with 7 DocumentRecord entries
    → outputs List[ChunkRecord] in memory (no intermediate file needed)

Step 2 (NEW) — Embed & Index   (was Step 4)
    → embedder.py calls embedding model for each ChunkRecord
    → upserts (vector, metadata) into ChromaDB collection
    → persists to data/vectorstore/
```

### Online (Query Phase)

```
Step 1 — Receive user message via POST /sessions/{id}/messages (FastAPI)
    → Append user message to session store
    → Build chat_history from all prior session messages

Step 2 — Classify (classifier.py)
    → keyword check → if OOS keyword found → OOS Refusal (stop)
    → Groq LLM intent classification → if MEDICAL/WEIGHT → OOS Refusal (stop)

Step 3 — Retrieve (retriever.py)
    → global or filtered ChromaDB query (filter from session.filter_doc)
    → returns top-k chunks + cosine similarity scores

Step 4 — Relevance check
    → if max(scores) < 0.55 → NIC Refusal (stop)
    → if chunks span ≥ 2 docs → set is_cross_document = True

Step 5 — Generate (generator.py)
    → build prompt:
        [SYSTEM] system_prompt
        [prior turns from chat_history]   ← enables follow-up questions
        [USER] current query + REF-N context chunks
    → call Groq LLM (openai/gpt-oss-120b)
    → if response == "NOT_IN_CORPUS" → NIC Refusal (stop)

Step 6 — Build citations (citation_builder.py)
    → map [REF-N] markers to chunk metadata
    → format inline citations + reference block

Step 7 — Return ChatResponse → FastAPI serialises as JSON
    → Appended to session.messages
    → Next.js frontend renders markdown answer + source badges
    → Session title auto-set from first user message
```

---

## 13. Design Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|---|---|---|
| **Use `docs/blocks.jsonl` instead of live ingestion** | Saves ingestion + chunking time; data pre-validated | Corpus is frozen at collection date; adding new docs requires re-ingestion |
| Section-aware chunking (pre-applied in blocks.jsonl) | Preserves numbered recommendations and table integrity | Chunk sizes vary; tables may be oversized; no adjustable overlap |
| ChromaDB over Pinecone | Local, no API cost, persistent disk storage | Scales to ~1M chunks; not suitable for production at 10M+ |
| **Groq + `openai/gpt-oss-120b` for generation** | Fast inference, instruction-following for strict grounding, free tier available | Hosted API dependency; latency varies with Groq load |
| **`BAAI/bge-large-en-v1.5` for embedding** | High quality, runs locally via sentence-transformers, no API cost | ~1.3 GB download on first cold start |
| Keyword guard before LLM classifier | Deterministic, zero-latency for obvious OOS queries | May over-block edge cases with keyword matches in context |
| **Conversation history injected into LLM context** | Enables follow-up questions while keeping grounding strict | History grows; very long sessions may hit context window limits |
| In-memory session store in FastAPI | Simple, zero-dependency; fast reads/writes | Sessions lost on server restart; not suitable for multi-instance deployments without Redis |
| **Frontend on Railway, backend on Vercel** | Each platform is best-suited to its workload (Node vs Python serverless) | Two deployments to manage; requires CORS configuration |
| Per-document answer format for cross-doc | Prevents source blending; attribution stays clean | Longer, more complex responses |
| Minimum score threshold (0.55) | Prevents low-confidence answers from being presented as fact | May refuse answerable questions with unusual phrasing |

---

## 14. Constraints & Non-Negotiables

These rules must **never** be violated by any component:

1. **No knowledge beyond the corpus.** The LLM system prompt must explicitly prohibit use of parametric knowledge.
2. **No citation-free claims.** Every factual sentence in an answer must reference a `[REF-N]` chunk.
3. **No source blending.** When two documents address the same topic, their answers are presented separately with individual citations.
4. **No medical/weight advice.** This is a hard OOS boundary — keyword-blocked before the LLM is even called.
5. **NIC refusal must name the searched documents.** The user must know what corpus was queried when no answer is found.
6. **OOS refusal must refer to a professional.** The response must include a direction to a qualified healthcare professional.

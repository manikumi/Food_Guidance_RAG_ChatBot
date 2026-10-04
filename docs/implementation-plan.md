# Implementation Plan — Dietary Guidance RAG Chatbot

> **Document:** `docs/implementation-plan.md`
> **Project:** Food Guidance RAG ChatBot
> **Created:** 2026-09-28
> **Updated:** 2026-10-04 — Phase 8 completed (Vercel + Railway deployment)
> **Based on:** `docs/architecture.md` + `docs/problemStatement.md`

---

## Overview

This plan breaks the build into **9 phases (0–8)** ordered by dependency.
Steps 3.1 (ingestion) and 3.2 (chunking) are **pre-completed** — `docs/blocks.jsonl`
contains 1,001 ready-to-embed blocks from 7 official documents.

```
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7 -> Phase 8
  Setup     Load      Embed    Retrieve  Classify   Generate   Pipeline  Interface  Deployment
```

---

## Phase Summary Table

| Phase | Name | Key Output | Depends On | Effort | Status |
|---|---|---|---|---|---|
| 0 | Project Setup | Skeleton, env, deps | — | 1–2 hrs | ✅ Done |
| 1 | Data Loader | loader.py, models.py, corpus index | blocks.jsonl | 2–3 hrs | ✅ Done |
| 2 | Embedding & Index | ChromaDB populated, build_index.py | Phase 1 | 3–4 hrs | ✅ Done |
| 3 | Retriever | retriever.py (global + filtered) | Phase 2 | 3–4 hrs | ✅ Done |
| 4 | Classifier & Refusal | classifier.py, refusal_handler.py | — | 3–4 hrs | ✅ Done |
| 5 | Answer Generator + Citations | generator.py, citation_builder.py | Phases 3, 4 | 4–5 hrs | ✅ Done |
| 6 | Pipeline Assembly | pipeline.py, query_cli.py | Phases 1–5 | 2–3 hrs | ✅ Done |
| 7 | Chat Interface | Next.js frontend + FastAPI backend | Phase 6 | 6–8 hrs | ✅ Done |
| 8 | Deployment | Vercel (backend) + Railway (frontend) | Phase 7 | 2–3 hrs | ✅ Done |

**Total estimated effort: 26–37 hours**

---

## Phase 0 — Project Setup

### Goal
Bootstrap the repository, virtual environment, configuration, and all dependencies.

### Tasks
- [ ] Create directory layout from `docs/architecture.md §10`
- [ ] Initialise virtual environment: `python -m venv .venv`
- [ ] Create `.env`:
  ```
  OPENAI_API_KEY=sk-...
  GROQ_API_KEY=gsk-...
  EMBEDDING_MODEL=BAAI/bge-large-en-v1.5
  LLM_MODEL=qwen/qwen3.6-27b
  CHROMA_PERSIST_DIR=data/vectorstore
  CHROMA_COLLECTION=food_guidance
  SCORE_THRESHOLD=0.35
  TOP_K=5
  ```
- [ ] Create `requirements.txt`:
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
- [ ] Install: `pip install -r requirements.txt`
- [ ] Create `data/vectorstore/` (empty, gitignored)
- [ ] Add `.gitignore`: `.env`, `data/vectorstore/`, `__pycache__/`, `.venv/`
- [ ] Create `src/__init__.py` + subpackage `__init__.py` files
- [ ] Verify `docs/blocks.jsonl` present with 1,001 lines

### Files Created
```
.env
.gitignore
requirements.txt
data/vectorstore/
src/__init__.py
src/ingest/__init__.py
src/embedding/__init__.py
src/retrieval/__init__.py
src/generation/__init__.py
```

### Acceptance Criteria
- [ ] `python -c "import openai, groq, chromadb, streamlit; print('OK')"` exits cleanly
- [ ] `docs/blocks.jsonl` readable, 1,001 lines
- [ ] `.env` loads via `python-dotenv` without errors

---

## Phase 1 — Data Loader

### Goal
Build `src/ingest/loader.py` to read `docs/blocks.jsonl` and produce `ChunkRecord` objects
enriched with publisher/year/URL from a `CORPUS_META` lookup.
**Replaces** architecture steps 3.1 (ingestion) and 3.2 (chunking).

### Context (architecture §3.1, §3.2, §4.1, §4.2)
- `blocks.jsonl` fields: `document_id`, `ordinal`, `type`, `text`, `heading_path`, `level`, `page`, `header`, `rows`, `caption`
- Block types to process: `paragraph`, `list_item`, `table` — skip `heading`
- `section_heading = " > ".join(heading_path)`
- `DocumentRecord` populated from `CORPUS_META` dict, not a fetcher

### CORPUS_META Mapping
```
who-healthy-diet      -> WHO Healthy Diet Fact Sheet       | WHO                        | 2023
eatwell-guide         -> The Eatwell Guide                 | NHS / Public Health England | 2016
who-five-keys         -> WHO Five Keys to Safer Food       | WHO                        | 2015
fao-who-healthy-diets -> Food-Based Dietary Guidelines     | FAO / WHO                  | 2019
fsa-chill             -> FSA Chilled Food Safety Guidance  | Food Standards Agency (UK) | 2021
kitchen-companion     -> Kitchen Companion                 | USDA / FSIS                | 2020
cold-food-storage     -> Cold Food Storage Chart           | USDA / FoodSafety.gov      | 2022
```

### Tasks
- [ ] Define `ChunkRecord` and `DocumentRecord` dataclasses in `src/ingest/models.py`
- [ ] Define `CORPUS_META` dict in `src/ingest/loader.py`
- [ ] Implement `load_blocks(path: str) -> list[ChunkRecord]`:
  - Read JSONL line by line
  - Skip `type == "heading"` blocks
  - Build `section_heading` by joining `heading_path` with ` > `
  - Generate `chunk_id` as `uuid4()`
  - Estimate `token_count` as `len(text.split())`
  - For `table` blocks, use the `text` field (pre-formatted markdown table)
- [ ] Implement `build_corpus_index(chunks) -> list[DocumentRecord]`:
  - Deduplicate by `document_id`, populate from `CORPUS_META`
  - Write to `data/corpus_index.json`

### Files Created
```
src/ingest/models.py    # ChunkRecord, DocumentRecord dataclasses
src/ingest/loader.py    # load_blocks(), build_corpus_index(), CORPUS_META
```

### Acceptance Criteria
- [ ] `load_blocks("docs/blocks.jsonl")` returns approx 825 chunks (1001 - 176 headings)
- [ ] All chunks have non-empty `text`, `document_id`, `section_heading`
- [ ] All 7 `document_id` values present in output
- [ ] `data/corpus_index.json` written with 7 entries
- [ ] No chunk has `chunk_type == "heading"`

### Tests: `tests/test_loader.py`
```python
def test_no_heading_chunks():
    chunks = load_blocks("docs/blocks.jsonl")
    assert all(c.chunk_type != "heading" for c in chunks)

def test_all_docs_present():
    chunks = load_blocks("docs/blocks.jsonl")
    ids = {c.document_id for c in chunks}
    assert "who-healthy-diet" in ids and "eatwell-guide" in ids

def test_section_heading_populated():
    chunks = load_blocks("docs/blocks.jsonl")
    assert all(c.section_heading for c in chunks)
```

---

## Phase 2 — Embedding & Vector Index

### Goal
Embed all `ChunkRecord` objects into ChromaDB. Create `scripts/build_index.py`
as the single offline pipeline command that replaces the old `build_corpus.py`.

### Context (architecture §3.3)
- Embedding: `BAAI/bge-large-en-v1.5` (via `sentence-transformers`)
- Vector store: ChromaDB persistent at `data/vectorstore/`
- Metadata stored per chunk: `document_id`, `document_name`, `publisher`, `year`,
  `source_url`, `section_heading`, `chunk_type`, `page_number`

### Tasks
- [ ] Implement `get_embedding_fn()` in `src/embedding/embedder.py`:
  - Use `sentence-transformers` with `EMBEDDING_MODEL`
- [ ] Implement `build_vector_index(chunks) -> Collection`:
  - Batch in groups of 100 (rate limit safety)
  - `collection.upsert()` with id, embedding, text, metadata dict
  - Show `rich` progress bar
- [ ] Implement `load_vector_index() -> Collection`:
  - Opens existing persistent ChromaDB collection at query time
- [ ] Create `scripts/build_index.py`:
  1. `chunks = load_blocks("docs/blocks.jsonl")`
  2. `build_corpus_index(chunks)` — writes `data/corpus_index.json`
  3. `build_vector_index(chunks)` — writes `data/vectorstore/`
  4. Print summary

### Files Created
```
src/embedding/embedder.py   # get_embedding_fn(), build_vector_index(), load_vector_index()
scripts/build_index.py      # offline pipeline entry point
```

### Acceptance Criteria
- [ ] `python scripts/build_index.py` completes without error
- [ ] `data/vectorstore/` is non-empty
- [ ] `collection.count() >= 800`
- [ ] Re-running is idempotent (upsert semantics)

**Estimated API cost:** Local execution via sentence-transformers is free.

---

## Phase 3 — Retriever

### Goal
Global and per-document retrieval with relevance scoring and cross-document detection.

### Context (architecture §3.5, §6)
- `top_k = 5` default (8 for cross-doc questions)
- Score threshold: `0.55` (adjusted for `bge-large` baseline similarity)
- Filtered retrieval: ChromaDB `where={"document_name": filter_doc}`
- Cross-document flag: `is_cross_document = True` when chunks span >= 2 docs

### Tasks
- [ ] Implement `retrieve(query, filter_doc=None, top_k=5) -> RetrievedContext`:
  - Embed query using same embedding function from Phase 2
  - `collection.query()` with optional `where` filter
  - Populate `RetrievedContext` (chunks, scores, is_cross_document, documents_searched, filter_applied)
- [ ] Implement `is_relevant(context) -> bool`:
  - `max(context.scores) >= SCORE_THRESHOLD`
- [ ] (Optional) `src/retrieval/reranker.py` with `rerank(query, chunks)` using cross-encoder

### Files Created
```
src/retrieval/retriever.py   # retrieve(), is_relevant()
src/retrieval/reranker.py    # rerank() [optional]
```

### Acceptance Criteria
- [ ] `retrieve("how much salt should I eat")` returns >= 1 chunk, max score >= 0.35
- [ ] `retrieve("quantum physics")` returns max score < 0.35
- [ ] `retrieve("vegetables", filter_doc="The Eatwell Guide")` returns only that doc
- [ ] `retrieve("cooking oil")` (global) returns `is_cross_document = True`

### Tests: `tests/test_retriever.py`
```python
def test_relevant_query():
    ctx = retrieve("how much sugar per day")
    assert max(ctx.scores) >= 0.35

def test_filtered_stays_in_doc():
    ctx = retrieve("vegetables", filter_doc="The Eatwell Guide")
    assert all(c.document_name == "The Eatwell Guide" for c in ctx.chunks)

def test_irrelevant_query():
    ctx = retrieve("history of ancient rome")
    assert not is_relevant(ctx)
```

---

## Phase 4 — Query Classifier & Refusal Handler

### Goal
Gate queries before retrieval (OOS check) and generate both refusal types:
**NIC** (Not In Corpus) and **OOS** (Out of Scope by Design).

### Context (architecture §3.4, §3.8, §8)
- Two-stage: keyword guard then LLM intent classifier
- OOS keywords: `bmi`, `lose weight`, `calorie deficit`, `diagnose`, `symptom`, `medication`, `disease`, `treatment`
- Labels -> RETRIEVE: `FOOD_SAFETY`, `NUTRITION_GUIDANCE`, `GENERAL_FOOD_QUESTION`
- Labels -> REFUSE_OOS: `MEDICAL_ADVICE`, `WEIGHT_BODY_COMPOSITION`

### Tasks
- [ ] Implement `classify_query(query) -> ClassifierResult` in `src/generation/classifier.py`:
  - Step 1: case-insensitive keyword scan against `OOS_KEYWORDS`
  - Step 2: if no keyword match, call LLM returning JSON `{"label":"...", "confidence":0.0}`
  - Return `ClassifierResult(route="RETRIEVE"|"REFUSE_OOS", label, confidence)`
- [ ] Define `OOS_KEYWORDS` list (expandable)
- [ ] Implement `build_nic_response(documents_searched: list[str]) -> str` (architecture §3.8 Mode A)
- [ ] Implement `build_oos_response(label: str) -> str` (architecture §3.8 Mode B)
  - Always ends with a referral to a qualified professional

### Files Created
```
src/generation/classifier.py       # classify_query(), OOS_KEYWORDS, ClassifierResult
src/generation/refusal_handler.py  # build_nic_response(), build_oos_response()
```

### Acceptance Criteria
- [ ] `classify_query("how do I lose weight fast")` -> `route = "REFUSE_OOS"`
- [ ] `classify_query("how long can I keep chicken in the fridge")` -> `route = "RETRIEVE"`
- [ ] `classify_query("I have diabetes symptoms")` -> `route = "REFUSE_OOS"`
- [ ] `build_nic_response([...])` output contains document names
- [ ] `build_oos_response("MEDICAL_ADVICE")` output contains professional referral

---

## Phase 5 — Answer Generator + Citation Layer

### Goal
Synthesise grounded LLM answers from retrieved chunks, and convert `[REF-N]` markers
into formatted inline citations and a reference block appended to every response.

### Context (architecture §3.6, §3.7, §7, §9)
- System prompt enforces: corpus-only answers, `[REF-N]` citations, per-source cross-doc, sentinel `NOT_IN_CORPUS`
- Citation: inline `[Publisher (Year)](url)` + `References` block appended
- Cross-doc: separate `**According to X:**` sections, never blended

### Tasks
- [ ] Implement `build_prompt(query, chunks) -> list[dict]` in `src/generation/generator.py`:
  - System message: full system prompt from architecture §7
  - User message: question + `[REF-N]` labelled chunk blocks with source header line
- [ ] Implement `generate_answer(query, context: RetrievedContext) -> str`:
  - Call `client.chat.completions.create()` using the Groq API client with the built prompt
  - Add per-source instruction in user message when `is_cross_document = True`
  - Return raw LLM string (may be `NOT_IN_CORPUS`)
- [ ] Implement `parse_ref_markers(raw_answer) -> list[str]` in `src/generation/citation_builder.py`
- [ ] Implement `build_citations(markers, chunks) -> list[CitationRecord]`:
  - Map `REF-N` index to corresponding chunk
  - Return `CitationRecord(document_name, publisher, year, source_url, section_heading)`
- [ ] Implement `format_response(raw_answer, citations) -> str`:
  - Replace `[REF-N]` with `[[Publisher, Year]](url)` inline
  - Append `References` block

### Files Created
```
src/generation/generator.py         # build_prompt(), generate_answer()
src/generation/citation_builder.py  # parse_ref_markers(), build_citations(), format_response()
```

### Acceptance Criteria
- [ ] Answer for `"how much salt per day"` contains `[REF-`
- [ ] Cross-document answer contains `**According to`
- [ ] `format_response()` output has a `References` section
- [ ] Irrelevant context causes LLM to return `NOT_IN_CORPUS`
- [ ] No factual claim appears without a citation (spot-check 5 queries)

---

## Phase 6 — Pipeline Assembly

### Goal
Wire all components into `src/pipeline.py`. Validate the full end-to-end flow
via `scripts/query_cli.py`.

### Context (architecture §12 Online Query Phase)
```
Classify -> [OOS?] Refuse
          -> Retrieve -> [NIC?] Refuse
                      -> Generate -> [NOT_IN_CORPUS?] Refuse
                                  -> Cite -> ChatResponse
```

### Tasks
- [ ] Implement `run_query(query, filter_doc=None) -> ChatResponse` in `src/pipeline.py`:
  1. `result = classify_query(query)`
  2. If `REFUSE_OOS`: return `ChatResponse(refusal_mode="OOS", answer=build_oos_response(...))`
  3. `context = retrieve(query, filter_doc)`
  4. If not `is_relevant(context)`: return NIC refusal
  5. `raw = generate_answer(query, context)`
  6. If `raw == "NOT_IN_CORPUS"`: return NIC refusal
  7. `markers = parse_ref_markers(raw)`
  8. `citations = build_citations(markers, context.chunks)`
  9. `answer = format_response(raw, citations)`
  10. Return `ChatResponse(answer, citations, documents_used, is_cross_document)`
- [ ] Create `scripts/query_cli.py`: `--query TEXT`, `--filter-doc TEXT`, rich output

### Files Created
```
src/pipeline.py        # run_query() — full online pipeline
scripts/query_cli.py   # CLI testing tool
```

### End-to-End Test Queries

| Query | Expected |
|---|---|
| `"how much salt per day"` | Answer + WHO citation |
| `"how long can I store chicken in the fridge"` | Answer + food safety citation |
| `"cooking oil safety"` | Cross-doc answer (WHO nutrition + USDA/FSA safety) |
| `"what are the symptoms of diabetes"` | OOS refusal |
| `"best diet to lose weight"` | OOS refusal |
| `"what is the speed of light"` | NIC refusal naming searched docs |

### Tests: `tests/test_pipeline.py`
```python
def test_oos_refusal():
    result = run_query("I have diabetes, what should I eat?")
    assert result.refusal_mode == "OOS"

def test_nic_refusal():
    result = run_query("what is the speed of light")
    assert result.refusal_mode == "NIC"

def test_cross_document_answer():
    result = run_query("is cooking oil safe to reuse?")
    assert result.is_cross_document
    assert "According to" in result.answer
```

### Acceptance Criteria
- [ ] All 6 test queries behave as expected
- [ ] OOS responses contain a professional referral
- [ ] NIC responses list >= 3 document names
- [ ] Cross-doc response has 2+ `**According to X:**` sections
- [ ] No uncited factual claim in any answer

---

## Phase 7 — Chat Interface

### Goal
Build a full production-grade chat interface equivalent in UX to ChatGPT / Google Gemini.
The interface is split into two deployable components:

- **Frontend:** Next.js 14 app deployed to **Railway** (`frontend/`)
- **Backend:** FastAPI app deployed to **Vercel** (`api/main.py`)

The legacy `app/streamlit_app.py` is retained for local development and testing only.

### Architecture (architecture §3.9, §3.10)

```
Railway (Next.js)  ←── REST API ──►  Vercel (FastAPI)  ←── run_query()  ──►  src/pipeline.py
```

### Tasks

#### Phase 7.1 — FastAPI Backend (`api/main.py`)
- [x] Create `api/main.py` with full session and message management
- [x] `POST /sessions` — create new chat session (UUID, title, timestamps)
- [x] `GET /sessions` — list all sessions sorted newest-first
- [x] `GET /sessions/{id}` — full session with all messages
- [x] `PATCH /sessions/{id}` — update title or document filter
- [x] `DELETE /sessions/{id}` — delete session
- [x] `GET /sessions/{id}/share` — shareable read-only snapshot
- [x] `POST /sessions/{id}/messages` — run RAG pipeline with conversation history
- [x] `PATCH /sessions/{id}/messages/{idx}` — edit message, truncate, re-run
- [x] Auto-title session from first user message (truncated to 60 chars)
- [x] CORS middleware with `FRONTEND_ORIGIN` env var
- [x] Lazy pipeline loading to reduce cold-start time

#### Phase 7.2 — Pipeline Updates
- [x] Update `src/generation/generator.py`: `generate_answer()` accepts `chat_history`
  - Injects prior `{role, content}` turns as LLM conversation context
  - Enables follow-up questions without losing grounding
- [x] Update `src/pipeline.py`: `run_query()` accepts and forwards `chat_history`
  - Fully backward-compatible (history is optional, defaults to None)

#### Phase 7.3 — Next.js Frontend (`frontend/`)
- [x] `frontend/src/types/index.ts` — TypeScript types mirroring Pydantic models
- [x] `frontend/src/lib/api.ts` — typed REST client for all backend endpoints
- [x] `frontend/src/app/globals.css` — full dark design system:
  - CSS custom properties (color palette, shadows, radii, transitions)
  - Sidebar, chat area, message bubbles, input area, modal, badges
  - Micro-animations: message slide-in, typing dots, hover lifts, float animation
- [x] `frontend/src/app/layout.tsx` — Inter font, SEO metadata, Open Graph
- [x] `frontend/src/app/page.tsx` — full ChatGPT/Gemini-style interface:
  - **Sidebar:** session list, new chat button, delete per session
  - **Header:** session title, document filter dropdown, share button
  - **Welcome screen:** floating icon, gradient title, 4-card suggestion grid
  - **Message bubbles:** user (indigo), AI (dark), OOS (red), NIC (amber)
  - **Message metadata:** timestamps, Multi-Source badge, source document badges
  - **Inline message editing:** pencil icon → edit form → truncate history → re-run
  - **Typing indicator:** three bouncing dots during LLM response
  - **Share modal:** copyable URL with "Copied!" feedback
  - **Auto-resize textarea** (grows up to 5 lines, shrinks on clear)
  - **localStorage persistence:** active session ID saved and restored on reload
  - **Auto-create session** on first message if none active
- [x] `frontend/src/app/share/[sessionId]/page.tsx` — shareable read-only view:
  - Simplified header with CTA to start own chat
  - Full message list with same styling as main page
  - No input area or sidebar

### Files Created / Updated
```
api/
  main.py                         # FastAPI backend (NEW)

frontend/
  package.json                    # Next.js 14 + dependencies (NEW)
  next.config.js                  # API URL env var config (NEW)
  tsconfig.json                   # TypeScript config (NEW)
  .env.example                    # NEXT_PUBLIC_API_URL template (NEW)
  src/
    types/index.ts                # TypeScript types (NEW)
    lib/api.ts                    # REST API client (NEW)
    app/
      layout.tsx                  # Root layout + SEO (NEW)
      globals.css                 # Design system CSS (NEW)
      page.tsx                    # Main chat interface (NEW)
      share/[sessionId]/page.tsx  # Shareable view (NEW)

src/generation/generator.py       # UPDATED: chat_history param
src/pipeline.py                   # UPDATED: chat_history param
```

### Acceptance Criteria
- [x] App loads at Railway URL without errors
- [x] Multiple simultaneous chat sessions supported
- [x] New chat session created on button click or first message
- [x] Chat history persists across browser refresh (via localStorage + API)
- [x] Follow-up questions are understood in context of prior messages
- [x] User can edit any past message — pipeline re-runs from edit point
- [x] Share button generates copyable link; shared link shows read-only view
- [x] Document filter dropdown correctly scopes retrieval
- [x] OOS answers show red badge; NIC answers show amber badge
- [x] Cross-doc answers show Multi-Source badge + per-doc source badges
- [x] Typing indicator shown while pipeline runs
- [x] Welcome screen suggestion cards fill input and submit on click

---

## Phase 8 — Deployment

### Goal
Deploy the backend to **Vercel** (serverless Python) and the frontend to **Railway** (Node.js).
See `deployment-plan.md` for step-by-step instructions.

### Tasks

#### Phase 8.1 — Backend → Vercel
- [x] Create `vercel.json`:
  - Routes all traffic to `api/main.py`
  - Sets 3 GB memory limit (needed for sentence-transformers + ChromaDB)
  - Sets 60-second function timeout
- [x] Commit `data/vectorstore/` to git (remove from .gitignore if needed)
- [x] Run `vercel --prod` from repo root
- [x] Set Vercel environment variables:
  - `GROQ_API_KEY`
  - `EMBEDDING_MODEL` = `BAAI/bge-large-en-v1.5`
  - `LLM_MODEL` = `openai/gpt-oss-120b`
  - `CHROMA_PERSIST_DIR` = `data/vectorstore`
  - `CHROMA_COLLECTION` = `food_guidance`
  - `SCORE_THRESHOLD` = `0.55`
  - `TOP_K` = `5`
  - `FRONTEND_ORIGIN` = `https://<railway-frontend-url>`

#### Phase 8.2 — Frontend → Railway
- [x] Create `railway.json`:
  - Build: `cd frontend && npm install && npm run build`
  - Start: `cd frontend && npm run start`
- [x] Connect GitHub repo in Railway dashboard
- [x] Set Railway environment variable:
  - `NEXT_PUBLIC_API_URL` = `https://<vercel-backend-url>`
- [x] Deploy and verify

#### Phase 8.3 — Connect & Verify
- [x] Set `FRONTEND_ORIGIN` in Vercel to Railway URL
- [x] Set `NEXT_PUBLIC_API_URL` in Railway to Vercel URL
- [x] Redeploy both services
- [x] Verify CORS (browser console, no CORS errors)
- [x] Run post-deployment test matrix (see below)

### Files Created
```
vercel.json        # Vercel deployment config
railway.json       # Railway deployment config
deployment-plan.md # Updated step-by-step guide
docs/stitch-prompt.md  # Google Stitch UI design prompt
```

### Post-Deployment Test Matrix

| Test | Expected Result |
|---|---|
| Open app — welcome screen shown | Suggestion cards visible, no errors |
| Click suggestion card | Message sent, AI responds with citations |
| Ask a food safety question | Answer with source badges |
| Ask OOS question ("lose weight") | Red bubble with OOS badge + professional referral |
| Ask NIC question ("speed of light") | Amber bubble with NIC badge listing searched docs |
| Ask follow-up question | LLM understands context from prior turn |
| Edit a past message | History truncated, new response generated |
| Click Share → copy URL | Shared URL opens read-only view |
| Filter by specific document | Retrieval limited to that document |
| Close tab, reopen | Active session restored |
| Create second chat | Independent session in sidebar |
| Delete a session | Session removed from sidebar |

### Acceptance Criteria
- [x] Backend health endpoint responds at Vercel URL: `GET /health` returns `{"status": "ok"}`
- [x] Frontend loads at Railway URL without CORS errors
- [x] All test matrix cases pass
- [x] GROQ_API_KEY not exposed in any frontend bundle
- [x] Share links are publicly accessible (no auth required)

---

## Dependency Graph

```
Phase 0 — Setup
    |
    v
Phase 1 — Loader  <----- docs/blocks.jsonl (pre-built, steps 3.1 & 3.2 skipped)
    |
    v
Phase 2 — Embed & Index
    |
    +---------------------------+
    v                           v
Phase 3 — Retriever       Phase 4 — Classifier & Refusal  (parallel OK)
    |                           |
    +-----------+---------------+
                v
           Phase 5 — Generator + Citations
                |
                v
           Phase 6 — Pipeline Assembly
                |
                v
           Phase 7 — Chat Interface (Next.js + FastAPI)
                |
                v
           Phase 8 — Deployment (Vercel + Railway)
```

> **Note:** Phase 4 (Classifier & Refusal) has no dependency on the vector index
> and can be built in parallel with Phases 2–3 to save time.

---

## Definition of Done

**A phase is complete when:**
1. All listed files are created and importable without errors
2. All acceptance criteria are met
3. Relevant unit tests pass: `pytest tests/`
4. No phase imports from a later phase

**The project is complete when:**
1. All 9 phases are done
2. All 6 end-to-end queries in Phase 6 behave correctly
3. Next.js frontend loads at Railway URL without errors
4. FastAPI backend health check passes at Vercel URL
5. Both refusal modes (NIC + OOS) work and are visually distinct
6. Cross-document answers never blend claims from different sources
7. Every factual claim carries a citation
8. Chat history persists across browser sessions
9. Message editing truncates history and re-runs the pipeline correctly
10. Shareable links show a read-only view of the conversation

---

## Non-Negotiables Traceability (from `docs/problemStatement.md`)

| Rule | Enforced in Phase(s) |
|---|---|
| Answers only from corpus — no external knowledge | 5, 6 |
| Every claim carries a `[REF-N]` citation | 5, 6, 7 |
| Cross-doc answers are per-source, never blended | 5, 6 |
| OOS questions refused + professional referral mandatory | 4, 6 |
| NIC refusals must name the documents searched | 4, 6 |
| No medical advice, calorie or weight targets | 4 |
| `docs/blocks.jsonl` used directly — no re-ingestion | 1, 2 |

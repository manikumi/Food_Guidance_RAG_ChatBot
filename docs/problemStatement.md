# Problem Statement — Dietary Guidance RAG Chatbot

> **Document:** `docs/problemStatement.md`
> **Project:** Food Guidance RAG ChatBot
> **Created:** 2026-09-28

---

## 1. Overview

This project is a **prototype chatbot** that answers questions about **food, nutrition, and food safety**. It is grounded exclusively in official, publicly available dietary guidance documents through a **Retrieval-Augmented Generation (RAG)** architecture.

Every answer the chatbot provides must:
- Be derived solely from the retrieved guidance documents (no hallucinated or blended facts).
- Carry a **citation** — document name, publisher, year, and a source link.
- Acknowledge clearly when the guidance does **not** cover a question.

---

## 2. Motivation & Problem Context

Health authorities worldwide publish thorough, carefully written guidance on food, nutrition, and food safety — typically as long, detailed PDFs. These documents are:

- **Authoritative** — produced by recognised national nutrition institutes, food safety regulators, and international health bodies.
- **Publicly available** — but largely unread, as they exist only as written prose without a machine-readable API.
- **Unserved by existing tools** — most consumer chatbots either hallucinate nutritional claims or pull from unverified internet sources.

> **The gap RAG fills:** There is real, trustworthy guidance that already exists. The challenge is making it *accessible and citable* through a conversational interface.

In the final product vision, this prototype becomes the underlying service that answers questions like:
- *"Is this a reasonable way to eat?"*
- *"How long can I keep this in the fridge?"*

---

## 3. Scope & Constraints

| In Scope | Out of Scope |
|---|---|
| Food safety questions | Medical advice of any kind |
| Nutritional guidance from official documents | Calorie targets or weight-loss recommendations |
| Food storage and handling | Anything about what a person "should" weigh |
| Cross-document comparison of official guidance | Documents with a clean, queryable API |

When a question falls **out of scope by design** (e.g., medical or weight advice), the chatbot must **decline** and direct the user to a qualified professional.

---

## 4. What to Build — Six Core Deliverables

### 4.1 Corpus

Gather **5 to 7 public dietary guidance documents** from recognised authorities. The table below lists the **6 selected documents** for this project:

| # | Document Title | Publisher | Year | Public URL |
|---|---|---|---|---|
| 1 | Healthy Eating — Nutrition and Food Safety | **WHO** | 2023 | https://www.who.int/initiatives/behealthy/healthy-diet |
| 2 | The Eatwell Guide | **NHS / Public Health England** | 2016 | https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/ |
| 3 | Food Safety — Key Facts | **WHO** | 2022 | https://www.who.int/news-room/fact-sheets/detail/food-safety |
| 4 | Dietary Reference Intakes (DRI) — Macronutrients | **Health Canada** | 2023 | https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html |
| 5 | Food-Based Dietary Guidelines — Background and Principles | **FAO / WHO** | 2019 | https://www.fao.org/3/I9659EN/i9659en.pdf |
| 6 | Scientific Opinion on Dietary Reference Values for Energy | **EFSA** | 2017 | https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2017.4863 |

> **Selection criteria:** All documents are written prose from recognised national or international authorities, have no machine-queryable API, and span nutrition guidance, food safety, and dietary reference values.

**Requirements:**
- Documents must consist of **written prose only** — no sources backed solely by a structured/queryable API.
- Each document record must store the following metadata:

| Field | Description |
|---|---|
| `publisher` | Name of the issuing authority |
| `year` | Publication year |
| `source_url` | Original URL of the document |
| `retrieval_date` | Date the document was downloaded/retrieved |

---

### 4.2 Chunking

Each **chunk** of text extracted from a document must carry the following metadata:

| Field | Purpose |
|---|---|
| `document_name` | Identifies source document |
| `publisher` | Issuing authority |
| `year` | Publication year |
| `section_heading` | Contextual heading for the chunk |

> **Design Note:** These documents frequently contain **tables** and **numbered recommendations**. A naive fixed-size chunking strategy will split these structures mid-sentence or mid-row, degrading retrieval quality.
>
> The chosen chunking strategy and its trade-offs (e.g., semantic chunking, section-aware splitting, hybrid approach) **must be documented in the project README**, including what the strategy costs in terms of complexity or coverage.

---

### 4.3 Retrieval

Build a **vector index** over all chunks, supporting two retrieval modes:

1. **Global retrieval** — search across all documents in the corpus simultaneously.
2. **Filtered retrieval** — search restricted to one named document, identified by its metadata.

---

### 4.4 Answer Layer

The assistant must answer questions using **only the retrieved chunks**. No external knowledge, no fabrication.

Every claim in the answer must carry a **citation** that includes:
- Document name
- Publisher
- Year
- A direct link to the source

---

### 4.5 Cross-Document Questions

Some questions will have **multiple documents with relevant, potentially differing perspectives**. For example, a question about cooking oil may have input from:
- A **nutrition institute** (health perspective)
- A **food safety regulator** (handling/safety perspective)

**Rules for cross-document answers:**
- Answer **per document**, keeping each source's claims separate.
- Provide **separate citations** for each document's claims.
- **Never blend** two sources into a single synthesised claim about what "the guidelines say." Attribution must always be specific.

---

### 4.6 Two Kinds of Refusal

The chatbot must implement **two distinct refusal modes**:

#### Not in the Corpus
*Triggered when:* The retrieved chunks do not contain information relevant to the question.

**Behaviour:** The assistant states that the guidance does not cover the question and names the documents it searched.

> *Example response: "I searched the [NHS Eatwell Guide, USDA Dietary Guidelines, WHO Food Safety Guide] but found no guidance covering this specific question."*

#### Out of Scope by Design
*Triggered when:* The question involves medical advice, calorie/weight targets, or body weight recommendations.

**Behaviour:** The assistant declines to answer and directs the user to a qualified professional (e.g., a registered dietitian or physician).

> *Example response: "This question involves personalised medical or dietary advice, which is outside what I can provide. Please consult a qualified healthcare professional."*

---

## 5. Architecture Summary

```
User Question
      |
      v
+---------------------+
|   Query Classifier   |  ---> Out-of-scope? -> Decline + refer
+---------------------+
      |
      v
+---------------------+
|  Vector Retriever    |  ---> Global or per-document search
+---------------------+
      |  Retrieved chunks (with metadata)
      v
+---------------------+
|   Answer Generator   |  ---> Synthesise answer from chunks only
+---------------------+
      |  Answer + Citations
      v
+---------------------+
|   Citation Layer     |  ---> Attach doc name, publisher, year, link
+---------------------+
      |
      v
   Response to User
```

---

## 6. Key Principles

- **Grounded answers only.** The chatbot must never answer beyond what the retrieved documents say.
- **Transparent sourcing.** Every claim is traceable to a specific document and section.
- **Honest refusal.** Unknown or out-of-scope questions are acknowledged clearly — no guessing, no hedging.
- **No blending.** When two sources disagree or speak to the same topic differently, their views are kept separate and attributed individually.
- **No medical/weight advice.** This is a hard boundary, not a soft one.

---

## 7. README Requirements

The project README must document:

1. Which **documents** were selected for the corpus and why.
2. The **chunking strategy** chosen and the trade-offs it introduces (e.g., handling of tables, numbered lists, section boundaries).
3. How **retrieval** is implemented and configured.
4. How **citations** are formatted and attached to responses.

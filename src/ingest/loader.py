import json
import uuid
from typing import List
from pathlib import Path
from src.ingest.models import ChunkRecord, DocumentRecord

CORPUS_META = {
    "who-healthy-diet": {
        "document_name": "WHO Healthy Diet Fact Sheet",
        "publisher": "WHO",
        "year": 2023,
        "source_url": "https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
    },
    "eatwell-guide": {
        "document_name": "The Eatwell Guide",
        "publisher": "NHS / Public Health England",
        "year": 2016,
        "source_url": "https://www.nhs.uk/live-well/eat-well/the-eatwell-guide/"
    },
    "who-five-keys": {
        "document_name": "WHO Five Keys to Safer Food",
        "publisher": "WHO",
        "year": 2015,
        "source_url": "https://www.who.int/publications/i/item/9789241594639"
    },
    "fao-who-healthy-diets": {
        "document_name": "Food-Based Dietary Guidelines",
        "publisher": "FAO / WHO",
        "year": 2019,
        "source_url": "https://www.fao.org/nutrition/education/food-dietary-guidelines/en/"
    },
    "fsa-chill": {
        "document_name": "FSA Chilled Food Safety Guidance",
        "publisher": "Food Standards Agency (UK)",
        "year": 2021,
        "source_url": "https://www.food.gov.uk/safety-hygiene/chilling"
    },
    "kitchen-companion": {
        "document_name": "Kitchen Companion",
        "publisher": "USDA / FSIS",
        "year": 2020,
        "source_url": "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/kitchen-companion"
    },
    "cold-food-storage": {
        "document_name": "Cold Food Storage Chart",
        "publisher": "USDA / FoodSafety.gov",
        "year": 2022,
        "source_url": "https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts"
    }
}

def load_blocks(path: str) -> List[ChunkRecord]:
    chunks = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            block = json.loads(line)
            chunk_type = block.get("type", "paragraph")
            
            if chunk_type == "heading":
                continue
                
            document_id = block.get("document_id")
            meta = CORPUS_META.get(document_id, {})
            text = block.get("text", "")
            
            heading_path = block.get("heading_path", [])
            section_heading = " > ".join(heading_path) if heading_path else ""
            
            chunk_id = str(uuid.uuid4())
            token_count = len(text.split())
            
            chunk = ChunkRecord(
                chunk_id=chunk_id,
                document_id=document_id,
                chunk_type=chunk_type,
                text=text,
                section_heading=section_heading,
                token_count=token_count,
                document_name=meta.get("document_name", ""),
                publisher=meta.get("publisher", ""),
                year=meta.get("year", 0),
                source_url=meta.get("source_url", ""),
                page_number=block.get("page")
            )
            chunks.append(chunk)
            
    return chunks

def build_corpus_index(chunks: List[ChunkRecord]) -> List[DocumentRecord]:
    doc_ids_seen = set()
    docs = []
    for chunk in chunks:
        doc_id = chunk.document_id
        if doc_id not in doc_ids_seen:
            doc_ids_seen.add(doc_id)
            meta = CORPUS_META.get(doc_id, {})
            docs.append(DocumentRecord(
                document_id=doc_id,
                document_name=meta.get("document_name", ""),
                publisher=meta.get("publisher", ""),
                year=meta.get("year", 0),
                source_url=meta.get("source_url", "")
            ))
            
    output_path = Path("data/corpus_index.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json_data = [
            {
                "document_id": d.document_id,
                "document_name": d.document_name,
                "publisher": d.publisher,
                "year": d.year,
                "source_url": d.source_url
            } for d in docs
        ]
        json.dump(json_data, f, indent=2)
        
    return docs

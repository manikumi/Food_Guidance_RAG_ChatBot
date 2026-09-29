from dataclasses import dataclass
from typing import Optional

@dataclass
class DocumentRecord:
    document_id: str
    document_name: str
    publisher: str
    year: int
    source_url: str

@dataclass
class ChunkRecord:
    chunk_id: str
    document_id: str
    chunk_type: str
    text: str
    section_heading: str
    token_count: int
    document_name: str
    publisher: str
    year: int
    source_url: str
    page_number: Optional[int] = None

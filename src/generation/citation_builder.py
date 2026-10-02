import re
from dataclasses import dataclass
from typing import List
from src.ingest.models import ChunkRecord

@dataclass
class CitationRecord:
    ref_id: str
    document_name: str
    publisher: str
    year: int
    source_url: str
    section_heading: str

def parse_ref_markers(raw_answer: str) -> List[str]:
    """Extracts unique [REF-N] markers from the raw answer."""
    markers = re.findall(r'\[REF-\d+\]', raw_answer)
    # Return unique markers preserving order
    seen = set()
    result = []
    for m in markers:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result

def build_citations(markers: List[str], chunks: List[ChunkRecord]) -> List[CitationRecord]:
    citations = []
    for marker in markers:
        # Extract the integer N from [REF-N]
        match = re.search(r'\d+', marker)
        if match:
            idx = int(match.group(0)) - 1
            if 0 <= idx < len(chunks):
                chunk = chunks[idx]
                citations.append(CitationRecord(
                    ref_id=marker,
                    document_name=chunk.document_name,
                    publisher=chunk.publisher,
                    year=chunk.year,
                    source_url=chunk.source_url,
                    section_heading=chunk.section_heading
                ))
    return citations

def format_response(raw_answer: str, citations: List[CitationRecord]) -> str:
    final_answer = raw_answer
    
    # Replace inline markers with links
    for cit in citations:
        inline_link = f"[[{cit.publisher}, {cit.year}]]({cit.source_url})"
        final_answer = final_answer.replace(cit.ref_id, inline_link)
        
    if not citations:
        return final_answer
        
    # Append references block
    final_answer += "\n\n---\nReferences\n"
    for cit in citations:
        final_answer += f"{cit.ref_id} {cit.publisher} ({cit.year}). {cit.document_name}.\n"
        final_answer += f"        {cit.source_url}\n"
        final_answer += f"        Section: {cit.section_heading}\n\n"
        
    return final_answer.strip()

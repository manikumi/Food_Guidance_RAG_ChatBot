import sys
import os
from rich.console import Console

# Add project root to PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.ingest.loader import load_blocks, build_corpus_index
from src.embedding.embedder import build_vector_index

console = Console()

def main():
    console.print("[bold green]Starting Vector Index Build...[/bold green]")
    
    console.print("[cyan]Loading blocks from docs/blocks.jsonl...[/cyan]")
    chunks = load_blocks("docs/blocks.jsonl")
    console.print(f"Loaded {len(chunks)} chunks.")
    
    console.print("[cyan]Building corpus index...[/cyan]")
    docs = build_corpus_index(chunks)
    console.print(f"Indexed {len(docs)} unique documents.")
    
    console.print("[cyan]Building vector store (this may take a few minutes to download the model & embed)...[/cyan]")
    collection = build_vector_index(chunks)
    
    console.print(f"[bold green]Success![/bold green] Chroma collection now has {collection.count()} items.")

if __name__ == "__main__":
    main()

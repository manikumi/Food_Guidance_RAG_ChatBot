import os
from dotenv import load_dotenv
from chromadb import PersistentClient

def main():
    load_dotenv()
    
    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "data/vectorstore")
    collection_name = os.getenv("CHROMA_COLLECTION", "food_guidance")
    
    print(f"Loading ChromaDB from {persist_dir}...")
    client = PersistentClient(path=persist_dir)
    collection = client.get_collection(name=collection_name)
    
    # Get a few chunks with their embeddings
    print("Fetching a few embeddings...")
    results = collection.get(
        include=["documents", "metadatas", "embeddings"],
        limit=3
    )
    
    ids = results.get("ids", [])
    documents = results.get("documents", [])
    embeddings = results.get("embeddings", [])
    metadatas = results.get("metadatas", [])
    
    for i in range(len(ids)):
        print("-" * 50)
        print(f"ID: {ids[i]}")
        print(f"Document chunk: {documents[i][:100]}...")
        if metadatas[i]:
            print(f"Metadata (doc_name): {metadatas[i].get('document_name', 'Unknown')}")
        
        embedding = embeddings[i]
        # Just show the shape/length and the first few dimensions
        print(f"Embedding length: {len(embedding)}")
        print(f"Embedding snippet: {embedding[:5]} ...")
        
    print("-" * 50)
    print(f"Total chunks retrieved: {len(ids)}")

if __name__ == "__main__":
    main()

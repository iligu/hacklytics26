import os
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
from llama_index.core import (
    SimpleDirectoryReader,
    StorageContext,
    Settings,
    PropertyGraphIndex
)
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.indices.property_graph import (
    SimpleLLMPathExtractor,
    ImplicitPathExtractor
)

# Load environment variables
load_dotenv()

def build_graph_index():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file")

    print("\n🌐 Initializing GraphRAG Engine...")
    
    # 2. Configure Gemini & Local Embeddings
# Verified gemini-flash-latest has quota and works for this key
    llm = GoogleGenAI(model="models/gemini-flash-latest", api_key=os.getenv("GEMINI_API_KEY"))
    embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    Settings.llm = llm
    Settings.embed_model = embed_model
    Settings.chunk_size = 1024

    docs_path = Path("./docs")
    storage_path = Path("./graph_storage")

    # 1. Load Documents
    print("📚 Loading documents from docs/...")
    # Specifically targeting the CSV and Python files for the knowledge graph
    reader = SimpleDirectoryReader(
        input_dir=str(docs_path),
        recursive=True,
        required_exts=[".csv", ".py", ".md", ".txt"]
    )
    documents = reader.load_data()
    print(f"✅ Loaded {len(documents)} document chunks")

    # 2. Configure Graph Extractors
    # SimpleLLMPathExtractor is the "brain" of GraphRAG
    extractors = [
        SimpleLLMPathExtractor(
            llm=llm,
            max_paths_per_chunk=10,
            extract_prompt=(
                "Extract entities and their relationships from the provided data or code. "
                "Focus on identifying: \n"
                "- Data files (CSVs)\n"
                "- Variables and Indicators (e.g., fatigue_score, ghed, measles_cases)\n"
                "- Equations and Logic (e.g., methodology, score calculation)\n"
                "- Relationships: (FILE) -> CONTAINS -> (VARIABLE), (VARIABLE) -> USED_IN -> (LOGIC), (METRIC) -> DERIVED_FROM -> (DATASET)\n"
            )
        ),
        ImplicitPathExtractor()
    ]

    # 3. Build or Load Index
    if storage_path.exists() and any(storage_path.iterdir()):
        print("⚡ Storage found! SKIPPING expensive indexing phase.")
        print(f"✅ Loading existing Graph Index from {storage_path}...")
        index = PropertyGraphIndex.from_existing(
            storage_context=StorageContext.from_defaults(persist_dir=str(storage_path))
        )
    else:
        print("🔨 Building Knowledge Graph. ATTENTION: This calls Gemini to extract relationships.")
        print("   This only happens ONCE. Future runs will be free and instant.")
        index = PropertyGraphIndex.from_documents(
            documents,
            kg_extractors=extractors,
            show_progress=True
        )
        # Persist to disk
        index.storage_context.persist(persist_dir=str(storage_path))
        print(f"💾 Graph Index successfully saved to {storage_path}")

    return index

def main():
    try:
        index = build_graph_index()
        print("✅ GraphRAG System initialized successfully!")
        
        # Simple test query
        query_engine = index.as_query_engine(include_text=True)
        response = query_engine.query("Explain how the data in the CSV files is connected to the methodology in vectordb_actian.py")
        print(f"\n🧪 Graph Insight:\n{response}")
        
    except Exception as e:
        print(f"❌ Error building GraphRAG: {e}")

if __name__ == "__main__":
    main()

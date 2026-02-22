#!/usr/bin/env python3
"""
RAG Chatbot using LlamaIndex and Gemini API
Reads documents from docs/ folder and allows interactive chat in terminal
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
from llama_index.core import (
    VectorStoreIndex, SimpleDirectoryReader, Settings, Document,
    StorageContext, load_index_from_storage
)
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.memory import ChatMemoryBuffer

INDEX_STORAGE_DIR = "./index_storage"

# Load environment variables
load_dotenv()

def check_api_key():
    """Check if Gemini API key is set"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment variables.")
        print("\nPlease set your Gemini API key:")
        print("1. Get your API key from: https://aistudio.google.com/app/apikey")
        print("2. Create a .env file in the project root with:")
        print("   GEMINI_API_KEY=your_api_key_here")
        print("\nOr export it directly:")
        print("   export GEMINI_API_KEY=your_api_key_here")
        sys.exit(1)
    return api_key

def check_docs_folder():
    """Check if docs folder exists and has files"""
    docs_path = Path("docs")
    if not docs_path.exists():
        print("⚠️  Warning: docs/ folder not found. Creating it...")
        docs_path.mkdir(exist_ok=True)
        print("✅ Created docs/ folder. Please add some documents (.txt, .md, .pdf, .docx, .csv) to it.")
        return False
    
    # Check for supported file types
    supported_extensions = {'.txt', '.md', '.pdf', '.docx', '.csv'}
    files = [f for f in docs_path.iterdir() if f.suffix.lower() in supported_extensions]
    
    if not files:
        print("⚠️  Warning: No supported documents found in docs/ folder.")
        print(f"   Supported formats: {', '.join(supported_extensions)}")
        return False
    
    print(f"✅ Found {len(files)} document(s) in docs/ folder")
    return True

def initialize_rag_system(api_key):
    """Initialize the RAG system with LlamaIndex and Gemini"""
    print("\n🔄 Initializing RAG system...")
    
    # Configure LlamaIndex settings using the new google-genai SDK
    Settings.llm = GoogleGenAI(api_key=api_key, model="gemini-2.0-flash")
    # Local embeddings — runs on-device, no API calls, no quota issues
    # BAAI/bge-small-en-v1.5 is fast (~130MB) and high quality
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    # Smaller chunks = faster embedding
    Settings.chunk_size = 512
    Settings.chunk_overlap = 50
    
    # Load documents from docs folder
    print("📚 Loading documents...")
    docs_path = Path("docs")
    documents = []
    
    # Load non-CSV documents (txt, md, pdf, docx) via SimpleDirectoryReader
    # Exclude CSVs here to avoid double-loading them
    non_csv_files = [
        str(f) for f in docs_path.iterdir()
        if f.suffix.lower() in {'.txt', '.md', '.pdf', '.docx'}
    ]
    if non_csv_files:
        regular_docs = SimpleDirectoryReader(input_files=non_csv_files).load_data()
        documents.extend(regular_docs)

    # Load CSV files separately for richer text conversion
    csv_files = [f for f in docs_path.iterdir() if f.suffix.lower() == '.csv']
    for csv_file in csv_files:
        try:
            print(f"   Reading CSV: {csv_file.name}...")
            # Try normal read first; fall back to skiprows for World Bank-style
            # CSVs that have metadata rows before the actual header
            try:
                df = pd.read_csv(csv_file)
                # Sanity-check: if we got suspiciously few columns it's probably
                # the metadata rows being mistaken for data
                if len(df.columns) < 3:
                    raise ValueError("Too few columns — likely metadata rows")
            except Exception:
                df = pd.read_csv(csv_file, skiprows=4)
            
            # Convert CSV to text format for better RAG
            csv_text = f"CSV File: {csv_file.name}\n"
            csv_text += f"Columns: {', '.join(df.columns.tolist())}\n"
            csv_text += f"Total rows: {len(df)}\n\n"
            
            # Add sample rows (keep small to stay within embedding quota)
            sample_size = min(30, len(df))
            csv_text += "Sample data:\n"
            csv_text += df.head(sample_size).to_string(index=False)
            
            # If there are more rows, add summary statistics
            if len(df) > sample_size:
                csv_text += f"\n\n... ({len(df) - sample_size} more rows)\n"
                csv_text += "\nSummary statistics:\n"
                csv_text += df.describe().to_string()
            
            csv_doc = Document(text=csv_text, metadata={"source": str(csv_file), "type": "csv"})
            documents.append(csv_doc)
            print(f"   ✅ Loaded CSV: {csv_file.name} ({len(df)} rows)")
        except Exception as e:
            print(f"   ⚠️  Warning: Failed to load {csv_file.name}: {e}")
            continue
    
    if not documents:
        print("❌ Error: No documents could be loaded from docs/ folder")
        sys.exit(1)
    
    print(f"✅ Loaded {len(documents)} document chunk(s)")
    
    # Create or load vector index
    storage_path = Path(INDEX_STORAGE_DIR)
    if storage_path.exists() and any(storage_path.iterdir()):
        print("⚡ Loading existing index from disk (no re-embedding needed)...")
        storage_context = StorageContext.from_defaults(persist_dir=INDEX_STORAGE_DIR)
        index = load_index_from_storage(storage_context)
    else:
        print("🔨 Building vector index (this only happens once)...")
        index = VectorStoreIndex.from_documents(documents)
        index.storage_context.persist(persist_dir=INDEX_STORAGE_DIR)
        print(f"💾 Index saved to {INDEX_STORAGE_DIR}/ — future startups will be instant!")
    
    # Create chat engine with memory
    print("🧠 Creating chat engine with memory...")
    memory = ChatMemoryBuffer.from_defaults(token_limit=3000)
    chat_engine = index.as_chat_engine(
        chat_mode="context",
        memory=memory,
        verbose=True
    )
    
    print("✅ RAG system ready!\n")
    return chat_engine

def main():
    """Main chat loop"""
    print("=" * 60)
    print("🤖 RAG Chatbot - Powered by LlamaIndex & Gemini")
    print("=" * 60)
    
    # Check prerequisites
    api_key = check_api_key()
    if not check_docs_folder():
        print("\nPlease add documents to the docs/ folder and try again.")
        sys.exit(1)
    
    # Initialize RAG system
    try:
        chat_engine = initialize_rag_system(api_key)
    except Exception as e:
        print(f"❌ Error initializing RAG system: {e}")
        print("\nTroubleshooting:")
        print("1. Check your GEMINI_API_KEY is valid")
        print("2. Ensure you have internet connection")
        print("3. Verify documents in docs/ folder are readable")
        sys.exit(1)
    
    # Chat loop
    print("💬 Start chatting! Type 'quit', 'exit', or 'bye' to end the conversation.")
    print("   Type 'clear' to clear conversation history.\n")
    
    while True:
        try:
            user_query = input("You: ").strip()
            
            if not user_query:
                continue
            
            # Handle special commands
            if user_query.lower() in ['quit', 'exit', 'bye', 'q']:
                print("\n👋 Goodbye!")
                break
            
            if user_query.lower() == 'clear':
                chat_engine.reset()
                print("🧹 Conversation history cleared.\n")
                continue
            
            # Get response from RAG system
            print("\n🤖 Bot: ", end="", flush=True)
            response = chat_engine.chat(user_query)
            print(response)
            print()  # Empty line for readability
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please try again or type 'quit' to exit.\n")

if __name__ == "__main__":
    main()

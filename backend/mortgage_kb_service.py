"""
Mortgage Knowledge Base Service
Loads and queries large mortgage policy PDFs from RAG/documents folder
"""

import os
import PyPDF2
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import chromadb
import google.generativeai as genai
from dotenv import load_dotenv
from io import BytesIO

# ElevenLabs TTS
try:
    from elevenlabs.client import ElevenLabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ElevenLabs = None
    ELEVENLABS_AVAILABLE = False

# Web search (SerpAPI)
try:
    from serpapi import GoogleSearch
    SERPAPI_AVAILABLE = True
except ImportError:
    GoogleSearch = None
    SERPAPI_AVAILABLE = False

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("[Mortgage KB] Gemini API configured")

if ELEVENLABS_API_KEY and ELEVENLABS_AVAILABLE:
    print("[Mortgage KB] ElevenLabs TTS configured")
elif ELEVENLABS_AVAILABLE:
    print("[Mortgage KB] Warning: ELEVENLABS_API_KEY not set - TTS disabled")
else:
    print("[Mortgage KB] Warning: elevenlabs package not installed - TTS disabled")

if SERPAPI_API_KEY and SERPAPI_AVAILABLE:
    print("[Mortgage KB] SerpAPI configured for fallback web search")
else:
    print("[Mortgage KB] Warning: Web search fallback disabled")


class MortgageKnowledgeBase:
    """RAG system for mortgage policy documents"""
    
    def __init__(self, documents_path: str = None):
        # Initialize embedding model
        print("[Mortgage KB] Loading embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB for mortgage knowledge base
        if documents_path is None:
            documents_path = os.path.join(os.path.dirname(__file__), "RAG", "chroma_persistent_storage")
        
        os.makedirs(documents_path, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=documents_path)
        
        # Get or create mortgage policy collection
        self.policy_collection = self.chroma_client.get_or_create_collection(
            name="Mortgages_Collection",
            embedding_function=self._embedding_function_wrapper()
        )
        
        # Get or create user documents collection (for multi-page uploads)
        self.user_collection = self.chroma_client.get_or_create_collection(
            name="User_Documents_Collection",
            embedding_function=self._embedding_function_wrapper()
        )
        
        print(f"[Mortgage KB] Policy docs: {self.policy_collection.count()} chunks")
        print(f"[Mortgage KB] User docs: {self.user_collection.count()} chunks")
    
    def _embedding_function_wrapper(self):
        """Wrapper for sentence transformer to match ChromaDB interface"""
        class EmbeddingFunction:
            def __init__(self, model):
                self.model = model
            
            def name(self):
                return "all-MiniLM-L6-v2"
            
            def __call__(self, input):
                embeddings = []
                for text in input:
                    try:
                        response = self.model.encode(text)
                        embeddings.append(response.tolist())
                    except Exception as e:
                        print(f"[Mortgage KB] Error embedding text: {e}")
                        embeddings.append([0.0] * 384)
                return embeddings
            
            def embed_query(self, input: str = None, query: str = None):
                """Embed a single query string"""
                text = input or query
                if not text:
                    return [0.0] * 384
                try:
                    return self.model.encode(text).tolist()
                except Exception as e:
                    print(f"[Mortgage KB] Error embedding query: {e}")
                    return [0.0] * 384
            
            def embed_documents(self, documents: list):
                """Embed multiple documents"""
                return self.__call__(documents)
        
        return EmbeddingFunction(self.embedding_model)
    
    def load_documents_from_folder(self, folder_path: str, force_reload: bool = False):
        """
        Load all PDFs from a folder into the knowledge base
        
        Args:
            folder_path: Path to folder containing PDFs
            force_reload: If True, clear existing collection and reload
        """
        if force_reload:
            self.chroma_client.delete_collection(name="Mortgages_Collection")
            self.policy_collection = self.chroma_client.create_collection(
                name="Mortgages_Collection",
                embedding_function=self._embedding_function_wrapper()
            )
            print("[Mortgage KB] Cleared existing policy collection")
        
        # Check if already loaded
        if self.policy_collection.count() > 0 and not force_reload:
            print(f"[Mortgage KB] Policy collection already has {self.policy_collection.count()} chunks. Skipping reload.")
            return
        
        print(f"[Mortgage KB] Loading documents from {folder_path}...")
        
        documents = []
        
        # Walk through directory recursively
        for root, dirs, files in os.walk(folder_path):
            for filename in files:
                if filename.endswith(".pdf"):
                    pdf_path = os.path.join(root, filename)
                    try:
                        reader = PyPDF2.PdfReader(pdf_path)
                        for i, page in enumerate(reader.pages):
                            text = page.extract_text()
                            if text and text.strip():
                                documents.append({
                                    "id": f"{filename}_page_{i+1}",
                                    "pdf_name": filename,
                                    "page_number": i+1,
                                    "text": text,
                                    "path": os.path.relpath(pdf_path, folder_path)
                                })
                    except Exception as e:
                        print(f"[Mortgage KB] Error loading {filename}: {e}")
        
        print(f"[Mortgage KB] Loaded {len(documents)} pages from {len(set(d['pdf_name'] for d in documents))} PDFs")
        
        # Split into chunks and add to policy collection
        chunk_count = 0
        for doc in documents:
            chunks = self._split_text(doc["text"], chunk_size=1000, chunk_overlap=200)
            for i, chunk in enumerate(chunks):
                try:
                    self.policy_collection.upsert(
                        documents=[chunk],
                        embeddings=[self.embedding_model.encode(chunk).tolist()],
                        metadatas=[{
                            "pdf_name": doc["pdf_name"],
                            "page_number": doc["page_number"],
                            "path": doc["path"]
                        }],
                        ids=[f"{doc['pdf_name'].replace('.pdf', '')}_page_{doc['page_number']}_chunk_{i}"]
                    )
                    chunk_count += 1
                except Exception as e:
                    print(f"[Mortgage KB] Error adding chunk: {e}")
        
        print(f"[Mortgage KB] Added {chunk_count} chunks to policy collection")
    
    def _split_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start = end - chunk_overlap
        return chunks
    
    def add_user_document(self, document_id: str, text: str, filename: str, metadata: Optional[Dict] = None):
        """
        Add a user's multi-page document to the RAG system
        
        Args:
            document_id: Unique document ID
            text: Full document text
            filename: Original filename
            metadata: Optional additional metadata
        """
        try:
            chunks = self._split_text(text, chunk_size=1000, chunk_overlap=200)
            
            chunk_metadata = metadata or {}
            chunk_metadata.update({
                "document_id": document_id,
                "filename": filename,
                "source": "user_upload"
            })
            
            for i, chunk in enumerate(chunks):
                self.user_collection.upsert(
                    documents=[chunk],
                    embeddings=[self.embedding_model.encode(chunk).tolist()],
                    metadatas=[{**chunk_metadata, "chunk_index": i, "total_chunks": len(chunks)}],
                    ids=[f"user_{document_id}_chunk_{i}"]
                )
            
            print(f"[Mortgage KB] Added user document {filename} with {len(chunks)} chunks")
            return True
        except Exception as e:
            print(f"[Mortgage KB] Error adding user document: {e}")
            return False
    
    def query(self, question: str, n_results: int = 5, search_user_docs: bool = True, search_policy_docs: bool = True) -> Dict:
        """
        Unified query across policy documents and user-uploaded documents
        
        Args:
            question: User question
            n_results: Number of relevant chunks to retrieve from each collection
            search_user_docs: Whether to search user documents
            search_policy_docs: Whether to search policy documents
            
        Returns:
            Dict with answer and source information
        """
        try:
            all_context_docs = []
            all_sources = []
            
            # Query user documents
            if search_user_docs and self.user_collection.count() > 0:
                user_results = self.user_collection.query(
                    query_texts=[question],
                    n_results=n_results
                )
                if user_results['documents'] and user_results['documents'][0]:
                    all_context_docs.extend(user_results['documents'][0])
                    # Format user doc sources
                    for meta in user_results.get('metadatas', [[]])[0]:
                        all_sources.append({
                            "type": "user_document",
                            "filename": meta.get("filename", "Unknown"),
                            "document_id": meta.get("document_id", ""),
                            "chunk": f"{meta.get('chunk_index', 0)+1}/{meta.get('total_chunks', 1)}"
                        })
            
            # Query policy documents
            if search_policy_docs and self.policy_collection.count() > 0:
                policy_results = self.policy_collection.query(
                    query_texts=[question],
                    n_results=n_results
                )
                if policy_results['documents'] and policy_results['documents'][0]:
                    all_context_docs.extend(policy_results['documents'][0])
                    # Format policy doc sources
                    for meta in policy_results.get('metadatas', [[]])[0]:
                        all_sources.append({
                            "type": "policy_document",
                            "pdf_name": meta.get("pdf_name", "Unknown"),
                            "page": meta.get("page_number", "N/A"),
                            "path": meta.get("path", "")
                        })
            
            # If no context found in ChromaDB, try web search as fallback
            if not all_context_docs:
                print("[Mortgage KB] No documents found in ChromaDB, trying web search fallback...")
                web_answer = self._web_search_fallback(question)
                if web_answer:
                    return {
                        "answer": web_answer,
                        "sources": [],
                        "documents_found": 0,
                        "web_search_used": True
                    }
                return {
                    "answer": "No relevant information found in documents or web search. Try uploading documents or rephrasing your question.",
                    "sources": [],
                    "documents_found": 0,
                    "web_search_used": False
                }
            
            # Generate response with Gemini
            context = "\n\n".join(all_context_docs)
            
            prompt = (
                "You are a mortgage expert assistant. Answer the user's question using the provided context. "
                "The context may include: (1) official mortgage policy documents (Fannie Mae, FHA, etc.) "
                "and (2) user-uploaded documents (loan agreements, applications, etc.). "
                "Provide accurate answers and cite sources when possible. "
                "If the context doesn't fully answer, acknowledge limitations.\n\n"
                f"CONTEXT:\n{context}\n\n"
                f"QUESTION:\n{question}"
            )
            
            if not GEMINI_API_KEY:
                return {
                    "answer": "Gemini API key not configured.",
                    "sources": all_sources,
                    "documents_found": len(all_context_docs)
                }
            
            # Use Gemini for complex multi-doc queries
            model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
            response = model.generate_content(prompt)
            
            return {
                "answer": response.text,
                "sources": all_sources,
                "context_snippets": all_context_docs[:2],
                "documents_found": len(all_context_docs),
                "searched_user_docs": search_user_docs and self.user_collection.count() > 0,
                "searched_policy_docs": search_policy_docs and self.policy_collection.count() > 0
            }
            
        except Exception as e:
            print(f"[Mortgage KB] Error querying: {e}")
            import traceback
            traceback.print_exc()
            return {
                "answer": f"Error querying: {str(e)}",
                "sources": [],
                "documents_found": 0
            }
    
    def get_stats(self) -> Dict:
        """Get statistics about the knowledge base"""
        return {
            "policy_chunks": self.policy_collection.count(),
            "user_chunks": self.user_collection.count(),
            "total_chunks": self.policy_collection.count() + self.user_collection.count()
        }
    
    def _web_search_fallback(self, question: str) -> Optional[str]:
        """
        Fallback to web search when no relevant documents found in ChromaDB
        
        Args:
            question: User question
            
        Returns:
            Generated answer from web search results or None
        """
        if not (SERPAPI_API_KEY and SERPAPI_AVAILABLE):
            print("[Mortgage KB] Web search not available")
            return None
        
        try:
            # Perform web search
            params = {
                "engine": "google",
                "q": question,
                "api_key": SERPAPI_API_KEY,
                "num": 5,
                "hl": "en",
            }
            results = GoogleSearch(params).get_dict()
            snippets = [item.get("snippet", "") for item in results.get("organic_results", [])[:5]]
            snippets = [s for s in snippets if s]
            
            if not snippets:
                return None
            
            web_context = "\n\n".join(snippets)
            
            # Generate response using Gemini with web context
            prompt = (
                "You are a mortgage expert assistant. Answer the user's question using the web search results below. "
                "Provide accurate, up-to-date information with statistics when available. "
                "Cite sources briefly if helpful (e.g., 'According to recent data...').\n\n"
                f"WEB SEARCH RESULTS:\n{web_context}\n\n"
                f"QUESTION:\n{question}"
            )
            
            if not GEMINI_API_KEY:
                return None
            
            model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
            response = model.generate_content(prompt)
            
            return response.text
            
        except Exception as e:
            print(f"[Mortgage KB] Web search fallback error: {e}")
            return None
    
    def text_to_speech(self, text: str, voice_id: str = "JBFqnCBsd6RMkjVDRZzb") -> Optional[bytes]:
        """
        Convert text to speech using ElevenLabs API with file caching
        
        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID (default: professional male voice)
            
        Returns:
            Audio bytes (MP3 format) or None if failed
        """
        if not ELEVENLABS_AVAILABLE:
            print("[Mortgage KB] TTS not available - elevenlabs package not installed")
            return None
            
        if not ELEVENLABS_API_KEY:
            print("[Mortgage KB] TTS not available - ELEVENLABS_API_KEY not set in .env")
            return None
        
        try:
            # Create audio cache directory
            cache_dir = os.path.join(os.path.dirname(__file__), "audio_cache")
            os.makedirs(cache_dir, exist_ok=True)
            
            # Create cache key from text hash
            import hashlib
            text_hash = hashlib.md5(text.encode()).hexdigest()[:16]
            cache_file = os.path.join(cache_dir, f"{text_hash}_{voice_id}.mp3")
            
            # Check if cached audio exists
            if os.path.exists(cache_file):
                print(f"[Mortgage KB] Using cached TTS audio: {cache_file}")
                with open(cache_file, "rb") as f:
                    return f.read()
            
            # Generate new audio
            print(f"[Mortgage KB] Generating new TTS audio for {len(text)} characters...")
            client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
            )
            audio_bytes = b"".join(list(audio_generator))
            
            # Cache the audio file
            with open(cache_file, "wb") as f:
                f.write(audio_bytes)
            
            print(f"[Mortgage KB] Generated and cached TTS audio: {len(audio_bytes)} bytes")
            return audio_bytes
        except Exception as e:
            print(f"[Mortgage KB] TTS error: {e}")
            import traceback
            traceback.print_exc()
            return None


# Global instance
_mortgage_kb = None

def get_mortgage_kb() -> MortgageKnowledgeBase:
    """Get or create global mortgage knowledge base instance"""
    global _mortgage_kb
    if _mortgage_kb is None:
        _mortgage_kb = MortgageKnowledgeBase()
        # Auto-load documents on first access
        docs_path = os.path.join(os.path.dirname(__file__), "RAG", "documents")
        if os.path.exists(docs_path):
            _mortgage_kb.load_documents_from_folder(docs_path)
    return _mortgage_kb

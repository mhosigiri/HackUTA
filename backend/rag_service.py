"""
RAG (Retrieval-Augmented Generation) Service for Document Extraction
Integrates ChromaDB + Sentence Transformers + Gemini for intelligent document Q&A
"""

import os
import PyPDF2
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import chromadb
import google.generativeai as genai
from dotenv import load_dotenv

# Web search (SerpAPI)
try:
    from serpapi import GoogleSearch  # type: ignore
except ImportError:
    GoogleSearch = None  # Handled at runtime

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("[RAG] Gemini API configured")
else:
    print("[RAG] Warning: GEMINI_API_KEY not found")

# SerpAPI key for live web search
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
if SERPAPI_API_KEY and GoogleSearch:
    print("[RAG] SerpAPI configured for web search")
elif not GoogleSearch:
    print("[RAG] Warning: serpapi package not installed — live web search disabled")
else:
    print("[RAG] Warning: SERPAPI_API_KEY not set — live web search disabled")


class EmbeddingFunction:
    """Custom embedding function using Sentence Transformers"""
    
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("[RAG] Loaded embedding model: all-MiniLM-L6-v2")
    
    def name(self):
        return "all-MiniLM-L6-v2"
    
    def __call__(self, input):
        """Generate embeddings for a list of texts"""
        embeddings = []
        for text in input:
            try:
                response = self.model.encode(text)
                embeddings.append(response.tolist())
            except Exception as e:
                print(f"[RAG] Error embedding text: {e}")
                embeddings.append([0.0] * 384)  # Fallback embedding
        return embeddings
    
    def embed_query(self, input: str = None, query: str = None):
        """Generate embedding for a single query (required by ChromaDB)"""
        text = input or query
        if not text:
            return [0.0] * 384
        try:
            return self.model.encode(text).tolist()
        except Exception as e:
            print(f"[RAG] Error embedding query: {e}")
            return [0.0] * 384
    
    def embed_documents(self, documents: List[str]):
        """Generate embeddings for multiple documents (required by ChromaDB)"""
        return self.__call__(documents)


class RAGDocumentService:
    """RAG service for document extraction and Q&A"""
    
    def __init__(self):
        # Initialize embedding function
        self.embedding_function = EmbeddingFunction()
        
        # Initialize ChromaDB
        chroma_path = os.path.join(os.path.dirname(__file__), "chroma_storage")
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)
        
        # Get or create collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents_collection",
            embedding_function=self.embedding_function
        )
        
        print(f"[RAG] ChromaDB initialized with {self.collection.count()} documents")
    
    def add_document(self, document_id: str, text: str, metadata: Optional[Dict] = None):
        """
        Add a document to the RAG system
        
        Args:
            document_id: Unique document identifier
            text: Document text content
            metadata: Optional metadata (filename, upload_date, etc.)
        """
        try:
            # Split text into chunks
            chunks = self._split_text(text)
            
            # Add each chunk to collection
            for i, chunk in enumerate(chunks):
                chunk_id = f"{document_id}_chunk_{i}"
                chunk_metadata = metadata or {}
                chunk_metadata.update({
                    "document_id": document_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                })
                
                self.collection.upsert(
                    documents=[chunk],
                    embeddings=[self.embedding_function([chunk])[0]],
                    metadatas=[chunk_metadata],
                    ids=[chunk_id]
                )
            
            print(f"[RAG] Added document {document_id} with {len(chunks)} chunks")
            return True
            
        except Exception as e:
            print(f"[RAG] Error adding document: {e}")
            return False
    
    def query_documents(self, question: str, n_results: int = 3) -> List[str]:
        """
        Query documents using semantic search
        
        Args:
            question: User question
            n_results: Number of relevant chunks to retrieve
            
        Returns:
            List of relevant document chunks
        """
        try:
            results = self.collection.query(
                query_texts=[question],
                n_results=n_results
            )
            
            # Extract documents from results
            extracted_docs = []
            if results and results.get("documents"):
                extracted_docs = [doc for sublist in results["documents"] for doc in sublist]
            
            print(f"[RAG] Retrieved {len(extracted_docs)} relevant chunks")
            return extracted_docs
            
        except Exception as e:
            print(f"[RAG] Error querying documents: {e}")
            return []
    
    def generate_response(self, question: str, context_docs: List[str]) -> str:
        """
        Generate response using Gemini with retrieved context
        
        Args:
            question: User question
            context_docs: Retrieved context documents
            
        Returns:
            Generated response
        """
        if not GEMINI_API_KEY:
            return "Gemini API key not configured. Cannot generate response."
        
        try:
            context = "\n\n".join(context_docs)
            
            prompt = (
                "You are an assistant for document analysis and question-answering tasks. "
                "Use the following pieces of retrieved context to answer the question. "
                "If you don't know the answer, say that you don't know. "
                "Use only the necessary sentences and keep the answer concise.\n\n"
                f"Context:\n{context}\n\n"
                f"Question:\n{question}"
            )
            
            model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
            response = model.generate_content(prompt)
            
            return response.text
            
        except Exception as e:
            print(f"[RAG] Error generating response: {e}")
            return f"Error generating response: {str(e)}"
    
    def rag_query(self, question: str, n_results: int = 3) -> Dict:
        """
        Complete RAG query: retrieve relevant docs and generate answer
        
        Args:
            question: User question
            n_results: Number of chunks to retrieve
            
        Returns:
            Dictionary with answer and sources
        """
        # Retrieve relevant documents
        context_docs = self.query_documents(question, n_results)
        
        # Detect if question is general (mortgage knowledge) vs document-specific
        general_keywords = ["current", "average", "typical", "what is", "how much", "explain", 
                           "define", "difference between", "requirements for", "process of",
                           "rate", "rates", "guidelines", "rules", "regulations", "qualify"]
        is_general_question = any(keyword in question.lower() for keyword in general_keywords)
        
        # If question seems general OR no documents found, use web-enhanced response
        if is_general_question or not context_docs:
            print(f"[RAG] {'General question detected' if is_general_question else 'No documents found'}, using web-enhanced response")
            general_answer = self._generate_general_response(question)
            return {
                "answer": general_answer,
                "sources": [],
                "context_used": False,
                "web_search_used": True
            }
        
        # Generate response with document context (for document-specific questions)
        answer = self.generate_response(question, context_docs)
        
        return {
            "answer": answer,
            "sources": context_docs,
            "context_used": True,
            "num_sources": len(context_docs),
            "web_search_used": False
        }
    
    def _generate_general_response(self, question: str) -> str:
        """
        Generate response using Gemini without document context (for general questions)
        
        Args:
            question: User question
            
        Returns:
            Generated response
        """
        if not GEMINI_API_KEY:
            return "Gemini API key is not configured."

        # Gather web context
        web_snippets = self._web_search(question, k=5)
        web_context = "\n\n".join(web_snippets)
        if not web_context:
            web_context = "(No live web results found.)"

        try:
            prompt = (
                "You are a senior mortgage underwriting AI assistant. "
                "Answer the user's question with authoritative, up-to-date mortgage information. "
                "Incorporate statistics (rates, averages, limits) if available in the CONTEXT or your training. "
                "Cite external facts briefly (e.g., 'According to HUD 2024 report, …'). "
                "Keep the answer concise and actionable.\n\n"
                f"CONTEXT:\n{web_context}\n\nQUESTION:\n{question}"
            )

            model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[RAG] Error generating general response: {e}")
            return (
                "I'm here to help with mortgage questions, but I encountered an error fetching or generating the answer. "
                f"Error: {str(e)}"
            )
    
    def extract_key_value_pairs_with_rag(self, document_text: str) -> Dict:
        """
        Use RAG to extract key-value pairs from document
        
        Args:
            document_text: Full document text
            
        Returns:
            Dictionary with extracted key-value pairs
        """
        # Add document to RAG temporarily
        temp_id = f"temp_{hash(document_text) % 10000}"
        self.add_document(temp_id, document_text, {"temporary": True})
        
        # Query for specific information
        queries = [
            "What are the names mentioned in this document?",
            "What are the dates mentioned in this document?",
            "What are the amounts or prices mentioned?",
            "What are the addresses mentioned?",
            "What are the contact details (email, phone)?",
            "What are the invoice or reference numbers?"
        ]
        
        extracted_info = {}
        
        for query in queries:
            try:
                result = self.rag_query(query, n_results=1)
                extracted_info[query] = result["answer"]
            except Exception as e:
                print(f"[RAG] Error extracting {query}: {e}")
        
        return {
            "rag_extracted_info": extracted_info,
            "extraction_method": "rag_gemini"
        }
    
    def _split_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to split
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks
            
        Returns:
            List of text chunks
        """
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start = end - chunk_overlap
        return chunks

    # -------------------- Web Search --------------------
    def _web_search(self, query: str, k: int = 5) -> List[str]:
        """Return top-k snippet strings from SerpAPI Google search"""
        if not (SERPAPI_API_KEY and GoogleSearch):
            return []
        try:
            params = {
                "engine": "google",
                "q": query,
                "api_key": SERPAPI_API_KEY,
                "num": k,
                "hl": "en",
            }
            results = GoogleSearch(params).get_dict()
            snippets = [item.get("snippet", "") for item in results.get("organic_results", [])[:k]]
            return [s for s in snippets if s]
        except Exception as e:
            print(f"[RAG] Web search error: {e}")
            return []
    
    def load_pdf(self, pdf_path: str) -> List[Dict]:
        """
        Load PDF and extract text from all pages
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of page dictionaries with text
        """
        documents = []
        try:
            reader = PyPDF2.PdfReader(pdf_path)
            filename = os.path.basename(pdf_path)
            
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    documents.append({
                        "id": f"{filename}_page_{i+1}",
                        "pdf_name": filename,
                        "page_number": i+1,
                        "text": text
                    })
            
            print(f"[RAG] Loaded {len(documents)} pages from {filename}")
            return documents
            
        except Exception as e:
            print(f"[RAG] Error loading PDF: {e}")
            return []
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the document collection"""
        return {
            "total_documents": self.collection.count(),
            "collection_name": self.collection.name
        }


# Global RAG service instance
_rag_service = None

def get_rag_service() -> RAGDocumentService:
    """Get or create global RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGDocumentService()
    return _rag_service

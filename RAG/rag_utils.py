"""
Utility functions for RAG (Retrieval-Augmented Generation) operations
"""

import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
import chromadb
from chromadb.api.models.Collection import Collection

class RAGSystem:
    def __init__(self, client: genai.Client, collection: Collection):
        self.client = client
        self.collection = collection
    
    def add_documents(self, documents: List[str], metadatas: Optional[List[Dict]] = None, ids: Optional[List[str]] = None):
        """
        Add documents to the ChromaDB collection
        
        Args:
            documents: List of document texts
            metadatas: Optional list of metadata dictionaries
            ids: Optional list of document IDs
        """
        if metadatas is None:
            metadatas = [{"source": f"doc_{i}"} for i in range(len(documents))]
        
        if ids is None:
            ids = [f"doc_{i}_{hash(doc) % 10000}" for i, doc in enumerate(documents)]
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Added {len(documents)} documents to collection")
    
    def search_similar(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """
        Search for similar documents using vector similarity
        
        Args:
            query: Search query text
            n_results: Number of results to return
            
        Returns:
            Dictionary containing search results
        """
        # Generate query embedding with RETRIEVAL_QUERY task type
        query_embedding = self._generate_query_embedding(query)
        
        # Query the collection using the custom embedding
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        return results
    
    def _generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a query using RETRIEVAL_QUERY task type
        
        Args:
            query: Query text
            
        Returns:
            Query embedding vector
        """
        try:
            response = self.client.models.embed_content(
                model="models/embedding-001",
                contents=query,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY",
                )
            )
            return response.embedding
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            return [0.0] * 768
    
    def generate_response_with_context(self, query: str, context_docs: List[str], max_context_length: int = 2000) -> str:
        """
        Generate a response using retrieved context documents
        
        Args:
            query: User query
            context_docs: List of relevant documents for context
            max_context_length: Maximum length of context to include
            
        Returns:
            Generated response string
        """
        # Truncate context if too long
        context = " ".join(context_docs)
        if len(context) > max_context_length:
            context = context[:max_context_length] + "..."
        
        prompt = f"""
        Based on the following context documents, please answer the user's question.
        
        Context:
        {context}
        
        User Question: {query}
        
        Please provide a helpful answer based on the context provided. If the context doesn't contain enough information to answer the question, please say so.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating response: {e}"
    
    def rag_query(self, query: str, n_results: int = 3) -> str:
        """
        Complete RAG pipeline: retrieve relevant documents and generate response
        
        Args:
            query: User query
            n_results: Number of documents to retrieve for context
            
        Returns:
            Generated response with retrieved context
        """
        # Step 1: Retrieve relevant documents
        search_results = self.search_similar(query, n_results=n_results)
        
        if not search_results['documents'][0]:
            return "No relevant documents found for your query."
        
        # Step 2: Generate response with context
        context_docs = search_results['documents'][0]
        response = self.generate_response_with_context(query, context_docs)
        
        return response
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection
        
        Returns:
            Dictionary with collection statistics
        """
        count = self.collection.count()
        return {
            "total_documents": count,
            "collection_name": self.collection.name
        }

def load_text_file(file_path: str) -> str:
    """
    Load text from a file
    
    Args:
        file_path: Path to the text file
        
    Returns:
        File content as string
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        return ""

def split_text_into_chunks(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Split text into overlapping chunks for better retrieval
    
    Args:
        text: Input text to split
        chunk_size: Size of each chunk
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at sentence boundary
        if end < len(text):
            last_period = chunk.rfind('.')
            last_exclamation = chunk.rfind('!')
            last_question = chunk.rfind('?')
            
            last_sentence_end = max(last_period, last_exclamation, last_question)
            if last_sentence_end > start + chunk_size // 2:  # Only break if we don't lose too much
                chunk = text[start:start + last_sentence_end + 1]
                end = start + last_sentence_end + 1
        
        chunks.append(chunk.strip())
        start = end - overlap
        
        if start >= len(text):
            break
    
    return chunks

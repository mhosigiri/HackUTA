from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import os
import shutil
import uuid
from datetime import datetime
from document_ai_service import process_document
from rag_service import get_rag_service
import json

api_router = APIRouter()

# Simple in-memory storage for documents (for demo purposes)
documents_store = {}

# Initialize RAG service
try:
    rag_service = get_rag_service()
    print("[Router] RAG service initialized")
except Exception as e:
    print(f"[Router] Warning: RAG service initialization failed: {e}")
    rag_service = None

@api_router.get("/documents")
async def list_documents():
    """
    List all uploaded documents
    """
    return {
        "documents": [
            {
                "id": doc_id,
                "name": doc["file_name"],
                "uploadDate": doc["upload_date"],
                "size": f"{doc['file_size'] // 1024} KB",
                "status": doc["status"],
                "extractedData": doc.get("extracted_data", {})
            }
            for doc_id, doc in documents_store.items()
        ]
    }


@api_router.post("/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload one or more documents for text extraction.
    Saves files to local storage and records metadata.
    """
    base_upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(base_upload_dir, exist_ok=True)

    saved_documents = []
    
    for upload in files:
        try:
            original_name = upload.filename or "unnamed"
            file_ext = os.path.splitext(original_name)[1]
            unique_id = uuid.uuid4().hex
            unique_name = f"{unique_id}{file_ext}"
            target_path = os.path.join(base_upload_dir, unique_name)

            # Persist file to disk
            upload.file.seek(0)
            with open(target_path, "wb") as out_file:
                shutil.copyfileobj(upload.file, out_file)

            file_size = os.path.getsize(target_path)
            file_type = upload.content_type or file_ext.lstrip(".") or "unknown"

            # Store document metadata
            doc_data = {
                "id": unique_id,
                "file_name": original_name,
                "file_path": target_path,
                "file_size": file_size,
                "file_type": file_type,
                "status": "uploaded",
                "upload_date": datetime.utcnow().isoformat(),
                "extracted_data": None
            }
            
            documents_store[unique_id] = doc_data

            saved_documents.append({
                "id": unique_id,
                "file_name": original_name,
                "file_size": file_size,
                "status": "uploaded",
                "upload_date": doc_data["upload_date"],
                "message": "Uploaded successfully"
            })
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload {upload.filename}: {str(e)}")

    return {"message": "Documents uploaded successfully", "documents": saved_documents}


@api_router.post("/documents/{document_id}/process")
async def process_document_endpoint(document_id: str, use_rag: bool = True):
    """
    Process a document using Document AI and optionally enhance with RAG.
    
    Args:
        document_id: Document ID to process
        use_rag: Whether to use RAG for enhanced extraction (default: True)
    """
    # Get the document
    doc = documents_store.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Update status to processing
        doc["status"] = "processing"

        # Read the file content
        with open(doc["file_path"], "rb") as f:
            file_content = f.read()

        # Determine MIME type based on stored file_type
        ft_lower = doc["file_type"].lower()
        if ft_lower in ["pdf", "application/pdf"]:
            mime_type = "application/pdf"
        elif ft_lower.startswith("image/"):
            mime_type = ft_lower  # e.g., image/png, image/jpeg
        else:
            mime_type = "application/octet-stream"

        # Process with Document AI (or fallback)
        extracted_data = process_document(file_content, mime_type)

        # Enhance with RAG if enabled and available
        if use_rag and rag_service and extracted_data.get("text"):
            print(f"[Router] Enhancing extraction with RAG for document {document_id}")
            
            # Add document to RAG system
            rag_service.add_document(
                document_id=document_id,
                text=extracted_data["text"],
                metadata={
                    "file_name": doc["file_name"],
                    "upload_date": doc["upload_date"]
                }
            )
            
            # Use RAG to extract additional key-value pairs
            rag_extraction = rag_service.extract_key_value_pairs_with_rag(extracted_data["text"])
            
            # Merge RAG results with Document AI results
            extracted_data["rag_enhanced"] = True
            extracted_data["rag_extraction"] = rag_extraction
        
        # Update document with extracted data
        doc["extracted_data"] = extracted_data
        doc["status"] = "processed"
        doc["processed_date"] = datetime.utcnow().isoformat()

        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "extracted_data": extracted_data,
            "rag_enhanced": use_rag and rag_service is not None
        }

    except Exception as e:
        # Update status to failed
        doc["status"] = "failed"
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """
    Get document details including extracted data
    """
    doc = documents_store.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": doc["id"],
        "name": doc["file_name"],
        "uploadDate": doc["upload_date"],
        "size": f"{doc['file_size'] // 1024} KB",
        "status": doc["status"],
        "extractedData": doc.get("extracted_data", {}),
        "processedDate": doc.get("processed_date")
    }


@api_router.get("/documents/{document_id}/extracted-data")
async def get_extracted_data(document_id: str):
    """
    Get the extracted data for a specific document.
    """
    doc = documents_store.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        "file_name": doc["file_name"],
        "status": doc["status"],
        "extracted_data": doc.get("extracted_data", {}),
        "processed_date": doc.get("processed_date")
    }


@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document and its file
    """
    doc = documents_store.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Delete the file
        if os.path.exists(doc["file_path"]):
            os.remove(doc["file_path"])
        
        # Remove from store
        del documents_store[document_id]
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@api_router.post("/rag/query")
async def rag_query_endpoint(request: dict):
    """
    Query documents using RAG (Retrieval-Augmented Generation)
    
    Request body:
        {
            "query": "Your question here",
            "n_results": 3  (optional)
        }
        
    Returns:
        Answer generated from relevant document context
    """
    if not rag_service:
        raise HTTPException(status_code=503, detail="RAG service not available")
    
    query = request.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    n_results = request.get("n_results", 3)
    
    try:
        result = rag_service.rag_query(query, n_results)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")


@api_router.get("/rag/stats")
async def rag_stats():
    """Get RAG system statistics"""
    if not rag_service:
        return {"available": False, "message": "RAG service not initialized"}
    
    try:
        stats = rag_service.get_collection_stats()
        return {
            "available": True,
            "stats": stats
        }
    except Exception as e:
        return {"available": False, "error": str(e)}
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import os
import shutil
import uuid
from datetime import datetime
from document_ai_service import process_document
from rag_service import get_rag_service
from mortgage_kb_service import get_mortgage_kb
import json
import PyPDF2
from io import BytesIO

api_router = APIRouter()

def get_page_count(file_path: str) -> int:
    """
    Get page count for a document
    Returns 1 for images/text files, actual page count for PDFs
    """
    try:
        if file_path.lower().endswith('.pdf'):
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                return len(reader.pages)
        else:
            # Images and text files are considered single-page
            return 1
    except Exception as e:
        print(f"[Router] Error getting page count: {e}")
        return 1

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
async def process_document_endpoint(document_id: str):
    """
    Process a document:
    - Single-page docs: Extract key-value pairs only
    - Multi-page docs: Extract key-value pairs + add to RAG for querying
    
    Args:
        document_id: Document ID to process
    """
    # Get the document
    doc = documents_store.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Update status to processing
        doc["status"] = "processing"

        # Get page count
        page_count = get_page_count(doc["file_path"])
        doc["page_count"] = page_count
        
        print(f"[Router] Processing document {doc['file_name']} with {page_count} page(s)")

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

        # Extract key-value pairs with Document AI or fallback
        extracted_data = process_document(file_content, mime_type)
        extracted_data["page_count"] = page_count

        # If multi-page document, add to RAG knowledge base for querying
        if page_count > 1 and extracted_data.get("text"):
            print(f"[Router] Multi-page document detected - adding to RAG knowledge base")
            kb = get_mortgage_kb()
            success = kb.add_user_document(
                document_id=document_id,
                text=extracted_data["text"],
                filename=doc["file_name"],
                metadata={
                    "upload_date": doc["upload_date"],
                    "page_count": page_count
                }
            )
            extracted_data["added_to_rag"] = success
            extracted_data["queryable"] = success
        else:
            print(f"[Router] Single-page document - key-value extraction only")
            extracted_data["added_to_rag"] = False
            extracted_data["queryable"] = False
        
        # Update document with extracted data
        doc["extracted_data"] = extracted_data
        doc["status"] = "processed"
        doc["processed_date"] = datetime.utcnow().isoformat()

        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "page_count": page_count,
            "extracted_data": extracted_data,
            "processing_type": "rag_enabled" if page_count > 1 else "key_value_only"
        }

    except Exception as e:
        # Update status to failed
        doc["status"] = "failed"
        print(f"[Router] Error processing document: {e}")
        import traceback
        traceback.print_exc()
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


@api_router.post("/mortgage-kb/query")
async def mortgage_kb_query(request: dict):
    """
    Query the mortgage knowledge base (trained on policy PDFs)
    
    Request body:
        {
            "query": "Your question about mortgage policies",
            "n_results": 3  (optional)
        }
        
    Returns:
        Answer with source citations from mortgage policy documents
    """
    query = request.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    n_results = request.get("n_results", 3)
    
    try:
        kb = get_mortgage_kb()
        result = kb.query(query, n_results)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mortgage KB query failed: {str(e)}")


@api_router.get("/mortgage-kb/stats")
async def mortgage_kb_stats():
    """Get mortgage knowledge base statistics"""
    try:
        kb = get_mortgage_kb()
        stats = kb.get_stats()
        return {
            "available": True,
            "stats": stats
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


@api_router.post("/mortgage-kb/tts")
async def mortgage_kb_tts(request: dict):
    """
    Convert text to speech using ElevenLabs
    
    Request body:
        {
            "text": "Text to convert to speech",
            "voice_id": "JBFqnCBsd6RMkjVDRZzb"  (optional)
        }
        
    Returns:
        MP3 audio stream
    """
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    voice_id = request.get("voice_id", "JBFqnCBsd6RMkjVDRZzb")
    
    try:
        kb = get_mortgage_kb()
        audio_bytes = kb.text_to_speech(text, voice_id)
        
        if not audio_bytes:
            raise HTTPException(status_code=503, detail="TTS service not available or failed")
        
        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=response.mp3"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
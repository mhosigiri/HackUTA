"""
Google Cloud Storage service for file uploads
"""

import os
from typing import Optional
from google.cloud import storage
from dotenv import load_dotenv

load_dotenv()

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")


def upload_to_gcs(file_content: bytes, destination_blob_name: str, content_type: str) -> str:
    """
    Upload a file to Google Cloud Storage.
    
    Args:
        file_content: File content as bytes
        destination_blob_name: Destination path in the bucket
        content_type: MIME type of the file
    
    Returns:
        Public URL of the uploaded file
    """
    try:
        if not BUCKET_NAME:
            raise ValueError("GCS_BUCKET_NAME must be configured")
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)
        
        blob.upload_from_string(file_content, content_type=content_type)
        
        # Return the GCS path
        return f"gs://{BUCKET_NAME}/{destination_blob_name}"
        
    except Exception as e:
        print(f"Error uploading to GCS: {e}")
        raise


def download_from_gcs(blob_name: str) -> bytes:
    """
    Download a file from Google Cloud Storage.
    
    Args:
        blob_name: Name of the blob to download
    
    Returns:
        File content as bytes
    """
    try:
        if not BUCKET_NAME:
            raise ValueError("GCS_BUCKET_NAME must be configured")
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        return blob.download_as_bytes()
        
    except Exception as e:
        print(f"Error downloading from GCS: {e}")
        raise


def delete_from_gcs(blob_name: str) -> bool:
    """
    Delete a file from Google Cloud Storage.
    
    Args:
        blob_name: Name of the blob to delete
    
    Returns:
        True if successful
    """
    try:
        if not BUCKET_NAME:
            raise ValueError("GCS_BUCKET_NAME must be configured")
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        blob.delete()
        
        return True
        
    except Exception as e:
        print(f"Error deleting from GCS: {e}")
        return False

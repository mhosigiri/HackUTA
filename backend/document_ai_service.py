"""
Document AI Service for processing documents with Google Cloud Document AI
"""

import os
from typing import Optional, Dict, List
from google.cloud import documentai_v1 as documentai
from google.api_core.client_options import ClientOptions
from dotenv import load_dotenv

load_dotenv()

# Document AI configuration - prioritize DOCAI_ prefixed variables
PROJECT_ID = os.getenv("DOCAI_PROJECT_ID") or os.getenv("GCP_PROJECT_ID", "652485593933")
LOCATION = os.getenv("DOCAI_LOCATION", "us")  # Format: 'us' or 'eu'
PROCESSOR_ID = os.getenv("DOCAI_PROCESSOR_ID", "488eb737f920bc88")  # Your processor ID

# Set Google credentials path
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not GOOGLE_CREDENTIALS_PATH:
    # Try default locations
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "docuextractmhosigiri-4cc95bebf955.json"),
        "/Users/arniskc/Documents/HackUTA/docuextractmhosigiri-4cc95bebf955.json"
    ]
    for path in possible_paths:
        if os.path.exists(path):
            GOOGLE_CREDENTIALS_PATH = path
            break

if GOOGLE_CREDENTIALS_PATH and os.path.exists(GOOGLE_CREDENTIALS_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH
    print(f"[Document AI] Using credentials: {GOOGLE_CREDENTIALS_PATH}")
    print(f"[Document AI] Project: {PROJECT_ID}, Location: {LOCATION}, Processor: {PROCESSOR_ID}")
else:
    print(f"[Document AI] Warning: Credentials file not found. Will use fallback extraction.")


def process_document(
    file_content: bytes,
    mime_type: str,
    processor_id: Optional[str] = None
) -> Dict:
    """
    Process a document using Document AI and extract key-value pairs.
    
    Args:
        file_content: The document file content as bytes
        mime_type: MIME type of the document (e.g., 'application/pdf', 'image/jpeg')
        processor_id: Optional processor ID (uses default if not provided)
    
    Returns:
        Dictionary containing extracted entities and key-value pairs
    """
    try:
        # Use provided processor_id or fall back to environment variable
        proc_id = processor_id or PROCESSOR_ID
        
        if not PROJECT_ID or not proc_id:
            print("Document AI not configured, using simple text extraction")
            return simple_text_extraction(file_content, mime_type)
        
        # Initialize Document AI client
        opts = ClientOptions(api_endpoint=f"{LOCATION}-documentai.googleapis.com")
        client = documentai.DocumentProcessorServiceClient(client_options=opts)
        
        # Full resource name of the processor
        name = client.processor_path(PROJECT_ID, LOCATION, proc_id)
        
        # Create the document
        raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)
        
        # Configure the process request
        request = documentai.ProcessRequest(name=name, raw_document=raw_document)
        
        # Process the document
        result = client.process_document(request=request)
        document = result.document
        
        # Extract key-value pairs
        entities = extract_entities(document)
        key_value_pairs = extract_key_value_pairs(document)
        tables = extract_tables(document)
        
        return {
            "text": document.text,
            "entities": entities,
            "key_value_pairs": key_value_pairs,
            "tables": tables,
            "pages": len(document.pages),
            "confidence": calculate_confidence(document)
        }
        
    except Exception as e:
        print(f"Error processing document with Document AI: {e}, falling back to simple extraction")
        return simple_text_extraction(file_content, mime_type)


def extract_entities(document: documentai.Document) -> List[Dict]:
    """
    Extract entities from the Document AI response.
    
    Args:
        document: The Document AI document object
    
    Returns:
        List of entities with type, mention_text, and confidence
    """
    entities = []
    
    for entity in document.entities:
        entity_dict = {
            "type": entity.type_,
            "mention_text": entity.mention_text,
            "confidence": entity.confidence,
        }
        
        # Add normalized value if available
        if entity.normalized_value:
            entity_dict["normalized_value"] = {
                "text": entity.normalized_value.text,
            }
        
        entities.append(entity_dict)
    
    return entities


def extract_key_value_pairs(document: documentai.Document) -> List[Dict]:
    """
    Extract form fields (key-value pairs) from the document.
    
    Args:
        document: The Document AI document object
    
    Returns:
        List of key-value pairs
    """
    key_value_pairs = []
    
    for page in document.pages:
        if not page.form_fields:
            continue
            
        for field in page.form_fields:
            # Extract field name (key)
            field_name = get_text(field.field_name, document)
            
            # Extract field value
            field_value = get_text(field.field_value, document)
            
            key_value_pairs.append({
                "key": field_name.strip() if field_name else "",
                "value": field_value.strip() if field_value else "",
                "confidence": field.field_value.confidence if field.field_value else 0.0
            })
    
    return key_value_pairs


def extract_tables(document: documentai.Document) -> List[Dict]:
    """
    Extract tables from the document.
    
    Args:
        document: The Document AI document object
    
    Returns:
        List of tables with rows and cells
    """
    tables = []
    
    for page in document.pages:
        if not page.tables:
            continue
            
        for table in page.tables:
            table_data = {
                "rows": [],
                "header_rows": table.header_rows if hasattr(table, 'header_rows') else []
            }
            
            for row in table.body_rows:
                row_data = []
                for cell in row.cells:
                    cell_text = get_text(cell.layout, document)
                    row_data.append(cell_text.strip() if cell_text else "")
                table_data["rows"].append(row_data)
            
            tables.append(table_data)
    
    return tables


def get_text(layout: documentai.Document.Page.Layout, document: documentai.Document) -> str:
    """
    Extract text from a layout object.
    
    Args:
        layout: The layout object containing text segment references
        document: The full document containing the text
    
    Returns:
        Extracted text string
    """
    if not layout or not layout.text_anchor:
        return ""
    
    text = ""
    for segment in layout.text_anchor.text_segments:
        start_index = int(segment.start_index) if segment.start_index else 0
        end_index = int(segment.end_index) if segment.end_index else 0
        text += document.text[start_index:end_index]
    
    return text


def calculate_confidence(document: documentai.Document) -> float:
    """
    Calculate overall confidence score for the document.
    
    Args:
        document: The Document AI document object
    
    Returns:
        Average confidence score
    """
    if not document.pages:
        return 0.0
    
    total_confidence = 0.0
    count = 0
    
    for page in document.pages:
        if page.form_fields:
            for field in page.form_fields:
                if field.field_value and field.field_value.confidence:
                    total_confidence += field.field_value.confidence
                    count += 1
    
    return total_confidence / count if count > 0 else 0.0


def simple_text_extraction(file_content: bytes, mime_type: str) -> Dict:
    """
    Simple fallback text extraction when Document AI is not available.
    
    Args:
        file_content: The document file content as bytes
        mime_type: MIME type of the document
    
    Returns:
        Dictionary with extracted text and basic key-value pairs
    """
    import re
    
    try:
        # For text files, just decode
        if mime_type in ['text/plain', 'text/txt']:
            text = file_content.decode('utf-8', errors='ignore')
        else:
            # For other types, try to extract as text
            text = file_content.decode('utf-8', errors='ignore')
        
        # Extract simple key-value pairs (looking for patterns like "Key: Value")
        key_value_pairs = []
        lines = text.split('\n')
        
        for line in lines:
            # Look for patterns like "Name: John Doe" or "Amount: $100"
            match = re.match(r'([^:]+):\s*(.+)', line.strip())
            if match:
                key, value = match.groups()
                key_value_pairs.append({
                    "key": key.strip(),
                    "value": value.strip(),
                    "confidence": 0.8
                })
        
        # Extract potential entities (simple regex patterns)
        entities = []
        
        # Email pattern
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            entities.append({
                "type": "email",
                "mention_text": email,
                "confidence": 0.9
            })
        
        # Phone pattern
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
        for phone in phones:
            entities.append({
                "type": "phone",
                "mention_text": phone,
                "confidence": 0.85
            })
        
        # Currency pattern
        currencies = re.findall(r'\$\s*\d+(?:,\d{3})*(?:\.\d{2})?', text)
        for currency in currencies:
            entities.append({
                "type": "currency",
                "mention_text": currency,
                "confidence": 0.9
            })
        
        return {
            "text": text,
            "entities": entities,
            "key_value_pairs": key_value_pairs,
            "tables": [],
            "pages": 1,
            "confidence": 0.75,
            "extraction_method": "simple_regex"
        }
        
    except Exception as e:
        print(f"Error in simple text extraction: {e}")
        return {
            "text": "",
            "entities": [],
            "key_value_pairs": [],
            "tables": [],
            "pages": 0,
            "confidence": 0.0,
            "error": str(e)
        }


def classify_document(file_content: bytes, mime_type: str) -> str:
    """
    Classify a document to determine its type (e.g., invoice, receipt, form).
    
    Args:
        file_content: The document file content as bytes
        mime_type: MIME type of the document
    
    Returns:
        Document classification type
    """
    # This would use a Document AI Classifier processor
    # For now, return a placeholder
    return "document"

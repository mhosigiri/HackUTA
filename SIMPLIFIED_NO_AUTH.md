# Simplified Document Extraction App (No Authentication)

## ✅ What Was Done

### Backend Changes
1. **Removed Auth0/JWT Authentication**
   - Removed all `@auth0` dependencies from `main.py`
   - Removed token verification from all endpoints
   - Simplified CORS to allow all origins (`allow_origins=["*"]`)

2. **Simplified Routers**
   - Removed all authentication checks from `routers.py`
   - Removed database dependencies (using in-memory storage)
   - Kept only document upload and extraction endpoints
   - No user management, activities, or profile endpoints

3. **Added Fallback Text Extraction**
   - Created `simple_text_extraction()` function in `document_ai_service.py`
   - Works without Google Document AI when credentials are not configured
   - Extracts:
     - **Key-Value Pairs**: Patterns like "Name: John Doe"
     - **Entities**: Emails, phone numbers, currency amounts
     - **Raw Text**: Full document content

### Frontend Changes
1. **Removed Auth0**
   - Removed `Auth0Provider` from `index.tsx`
   - Removed all `useAuth0()` hooks from components
   - Removed token logic from API calls

2. **Simplified UI**
   - Kept only Dashboard route
   - Removed Activities and Profile pages
   - Simplified Header component

## 🚀 How to Use

### Start Backend
```bash
cd /Users/arniskc/Documents/HackUTA/backend
../backend/.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend
```bash
cd /Users/arniskc/Documents/HackUTA/frontend
npm start
```

### Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📡 API Endpoints

### Upload Documents
```bash
POST /api/documents/upload
Content-Type: multipart/form-data

# Example:
curl -X POST http://localhost:8000/api/documents/upload \
  -F "files=@document.txt"
```

**Response:**
```json
{
  "message": "Documents uploaded successfully",
  "documents": [
    {
      "id": "abc123...",
      "file_name": "document.txt",
      "file_size": 1024,
      "status": "uploaded",
      "upload_date": "2025-10-05T10:39:55.404727"
    }
  ]
}
```

### Process Document (Extract Data)
```bash
POST /api/documents/{document_id}/process

# Example:
curl -X POST http://localhost:8000/api/documents/abc123.../process
```

**Response:**
```json
{
  "message": "Document processed successfully",
  "document_id": "abc123...",
  "extracted_data": {
    "text": "Full document text...",
    "key_value_pairs": [
      {
        "key": "Name",
        "value": "John Doe",
        "confidence": 0.8
      }
    ],
    "entities": [
      {
        "type": "email",
        "mention_text": "john@example.com",
        "confidence": 0.9
      }
    ],
    "tables": [],
    "pages": 1,
    "confidence": 0.75
  }
}
```

### List All Documents
```bash
GET /api/documents

# Example:
curl http://localhost:8000/api/documents
```

### Get Document Details
```bash
GET /api/documents/{document_id}

# Example:
curl http://localhost:8000/api/documents/abc123...
```

### Delete Document
```bash
DELETE /api/documents/{document_id}

# Example:
curl -X DELETE http://localhost:8000/api/documents/abc123...
```

## 📝 Extracted Data Format

### Key-Value Pairs
The system extracts structured data in the format:
```
Key: Value
```

Example document:
```
Name: Sarah Johnson
Email: sarah.johnson@email.com
Phone: 555-987-6543
Annual Income: $125,000.00
```

### Entities
Automatically detected:
- **Emails**: `user@domain.com`
- **Phone Numbers**: `555-123-4567`, `555.123.4567`, `5551234567`
- **Currency**: `$1,250.00`, `$1,250`, `$ 1250.00`

## 🧪 Test Example

```bash
# Create a sample mortgage application
cat > /tmp/mortgage_app.txt << 'EOF'
Applicant Name: Sarah Johnson
Social Security Number: 123-45-6789
Email Address: sarah.johnson@email.com
Phone Number: 555-987-6543
Annual Income: $125,000.00
Requested Loan Amount: $350,000.00
Property Value: $425,000.00
EOF

# Upload the document
DOC_ID=$(curl -X POST http://localhost:8000/api/documents/upload \
  -F "files=@/tmp/mortgage_app.txt" -s | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['documents'][0]['id'])")

# Process and extract data
curl -X POST "http://localhost:8000/api/documents/$DOC_ID/process" -s | \
  python3 -m json.tool

# View all documents
curl http://localhost:8000/api/documents -s | python3 -m json.tool
```

## 🎯 Current Status

✅ **Backend**: Running on port 8000  
✅ **Frontend**: Running on port 3000  
✅ **CORS**: Fully permissive (no restrictions)  
✅ **Authentication**: Disabled (no login required)  
✅ **Document Upload**: Working  
✅ **Text Extraction**: Working (regex-based fallback)  
✅ **Key-Value Extraction**: Working  
✅ **Entity Recognition**: Working (email, phone, currency)  

## 🔧 Next Steps (Optional)

1. **Add PDF Support**: Install `PyPDF2` or `pdfplumber` for PDF text extraction
2. **Add Image OCR**: Use `pytesseract` for image-based documents
3. **Enable Google Document AI**: Set up GCP credentials for advanced extraction
4. **Add Persistence**: Replace in-memory storage with SQLite or PostgreSQL
5. **Improve UI**: Add document viewer, edit extracted data, export to CSV/JSON

## 📂 File Structure

```
backend/
  ├── main.py                    # FastAPI app (no auth)
  ├── routers.py                 # API endpoints (no auth)
  ├── document_ai_service.py     # Text extraction logic
  └── uploads/                   # Uploaded files storage

frontend/
  ├── src/
  │   ├── App.tsx               # Main app (no auth)
  │   ├── index.tsx             # Entry point (no Auth0Provider)
  │   ├── components/
  │   │   ├── Header.tsx        # Simplified header
  │   │   ├── DocumentUpload.tsx # Upload component (no auth)
  │   │   └── ExtractedDataView.tsx
  │   └── pages/
  │       └── Dashboard.tsx     # Main page
```

## 🌟 Features

- ✅ Drag & drop file upload
- ✅ Multiple file upload support
- ✅ Real-time extraction
- ✅ Key-value pair extraction
- ✅ Entity recognition (email, phone, currency)
- ✅ Document listing
- ✅ No authentication required
- ✅ CORS enabled for localhost
- ✅ Works without Google Cloud credentials

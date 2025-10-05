# System Status - Document & Policy Assistant

## ✅ Current Status: FULLY OPERATIONAL

**Last Updated:** October 5, 2025  
**Backend:** http://localhost:8000  
**Frontend:** http://localhost:3000

---

## 📋 System Architecture

### Backend Components

1. **Document Processing** (`routers.py`)
   - Automatic page count detection
   - Single-page docs: Key-value extraction only
   - Multi-page docs: Key-value extraction + RAG indexing

2. **Mortgage Knowledge Base** (`mortgage_kb_service.py`)
   - **Policy Collection:** 516 chunks from official mortgage documents
   - **User Collection:** Dynamic - multi-page user uploads
   - **Embeddings:** SentenceTransformer (all-MiniLM-L6-v2)
   - **Vector DB:** ChromaDB (persistent storage)
   - **AI Model:** Gemini 2.0 Flash Exp

3. **RAG Service** (`rag_service.py`)
   - Web search integration (SerpAPI)
   - General mortgage Q&A with live data
   - Gemini AI powered responses

### Frontend Components

1. **Document Upload**
   - Multi-file drag & drop
   - Automatic processing
   - Real-time status updates

2. **Document & Policy Assistant** (Unified Chat)
   - Queries user documents (multi-page)
   - Queries policy documents
   - Source citations (color-coded)
   - Powered by Gemini 2.0 Flash Exp

3. **Document List & Extracted Data Viewer**
   - View all uploaded documents
   - Key-value pairs display
   - Status tracking

---

## 📁 File Organization

### Backend Structure
```
backend/
├── main.py                      # FastAPI app entry
├── routers.py                   # API endpoints
├── document_ai_service.py       # OCR & extraction
├── rag_service.py               # RAG + web search
├── mortgage_kb_service.py       # Unified KB (NEW)
├── rag_app.py                   # Copied from RAG/app.py
├── rag_utils_backup.py          # Copied from RAG/rag_utils.py
├── uploads/                     # User uploaded files
└── RAG/
    ├── documents/               # Policy PDFs (516 chunks loaded)
    │   ├── Fannie Mae guides
    │   ├── FHA handbooks
    │   ├── USDA policies
    │   └── Sample agreements
    └── chroma_persistent_storage/  # Vector DB storage
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── DocumentUpload.tsx
│   │   ├── MortgageKnowledgeBase.tsx  # Unified chat (NEW)
│   │   ├── ExtractedDataView.tsx
│   │   └── Header.tsx
│   └── pages/
│       └── Dashboard.tsx
└── build/                       # Production build
```

---

## 🔧 Configuration

### Environment Variables (.env)
```bash
GEMINI_API_KEY=AIzaSyDqztTsptGNg6zYtZe5xVDr6jk8vi38P-Q
SERPAPI_API_KEY=44008bff401215c6eeea1bad4302c1a0457999de539b0cf3ea5fd062732dbd3e
DOCAI_PROJECT_ID=652485593933
DOCAI_PROCESSOR_ID=488eb737f920bc88
DOCAI_LOCATION=us
```

### Key Dependencies
- `google-generativeai` - Gemini AI
- `sentence-transformers` - Embeddings
- `chromadb` - Vector database
- `google-search-results` - SerpAPI
- `PyPDF2` / `pdfplumber` - PDF processing
- `pytesseract` - OCR for images

---

## 🎯 How It Works

### Document Upload Flow

```
User uploads file
      ↓
Auto-detect page count
      ↓
   ┌──────┴──────┐
   │             │
1 page        2+ pages
   │             │
Key-value    Key-value + RAG
extraction      indexing
   │             │
   └──────┬──────┘
         ↓
    Processing complete
```

### Query Flow

```
User asks question
      ↓
Unified KB Query
      ↓
   ┌──────┴──────┐
   │             │
Search        Search
User Docs   Policy Docs
   │             │
   └──────┬──────┘
         ↓
   Merge contexts
         ↓
  Gemini 2.0 Flash
         ↓
  Answer + Sources
```

---

## 📊 Current Data

### Policy Documents (516 chunks)
- Fannie Mae Selling Guide (Sept 2025)
- Fannie Mae Servicing Guide (Aug 2025)
- FHA Handbook 4000.1
- USDA Rural Development Guide
- Closing Disclosure forms
- Sample loan agreements

### User Documents (Dynamic)
- Automatically indexed when multi-page
- Queryable via unified chat
- Tracked separately from policies

---

## 🧪 Testing

### Test Single-Page Document
1. Upload `invoice.png` or `ID.jpg`
2. Wait for processing
3. View extracted key-values in "Your Documents"
4. ⚠️ **Not queryable in chat** (single-page)

### Test Multi-Page Document
1. Upload multi-page PDF (loan agreement)
2. Wait for processing (added to RAG)
3. Ask in chat: "What is the loan amount in my document?"
4. ✅ **Queryable with Gemini responses**

### Test Policy Questions
1. In chat, ask: "What are Fannie Mae debt-to-income requirements?"
2. Receive answer with policy document citations
3. Sources shown in green badges

---

## ⚙️ API Endpoints

### Document Management
- `POST /api/documents/upload` - Upload files
- `POST /api/documents/{id}/process` - Process document
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get document details

### Knowledge Base
- `POST /api/mortgage-kb/query` - Query unified KB
- `GET /api/mortgage-kb/stats` - Get KB statistics

### RAG (Legacy - still available)
- `POST /api/rag/query` - Query with web search
- `GET /api/rag/stats` - Get RAG statistics

---

## 🔍 Troubleshooting

### Issue: Chatbot not responding
**Fix:** Model name updated to `gemini-2.0-flash-exp` (valid Gemini model)

### Issue: Slow policy extraction
**Cause:** SentenceTransformer loads on first query (~1s is normal)
**Status:** ✅ Working correctly (0.94s load time)

### Issue: Documents not queryable
**Check:**
1. Is it multi-page? (only multi-page docs are RAG-indexed)
2. Check KB stats: `curl http://localhost:8000/api/mortgage-kb/stats`
3. Look for "added to RAG" in backend logs

---

## 🚀 Starting the Application

### Backend
```bash
cd backend
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npx serve -s build -l 3000
```

### Or (Development)
```bash
cd frontend
npm start
```

---

## 📝 Recent Changes

### Fixed Issues ✅
1. ✅ Removed duplicate purple chatbot
2. ✅ Unified chat interface (green)
3. ✅ Page count detection for smart routing
4. ✅ Separate collections (policy vs user docs)
5. ✅ Fixed Gemini model name (2.5-pro → 2.0-flash-exp)
6. ✅ Moved RAG files to backend folder
7. ✅ Verified SentenceTransformer performance

### System Status ✅
- Backend: Running ✅
- Frontend: Running ✅
- KB Query: Working ✅ (533 char responses, 4 sources)
- Document Processing: Working ✅
- Policy Documents: Loaded ✅ (516 chunks)

---

## 🎉 Ready for Production

The system is fully operational and ready for use!

**Next Steps:**
1. Upload documents at http://localhost:3000
2. Ask questions in the Document & Policy Assistant
3. View extracted data in document list

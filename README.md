# 🏠 Document & Policy Assistant

AI-powered mortgage document extraction and intelligent policy Q&A system with RAG (Retrieval-Augmented Generation).

---

## 🚀 Features

- 📤 **Smart Document Upload** - Multi-file drag & drop with automatic processing
- 🔍 **Intelligent Text Extraction** - OCR for images, PDF parsing, key-value pair extraction
- 💬 **Unified AI Assistant** - Query uploaded documents & official mortgage policies
- 📚 **Policy Knowledge Base** - Pre-trained on Fannie Mae, FHA, USDA, Freddie Mac guidelines (14,383+ chunks)
- 🔊 **Text-to-Speech** - Optional voice responses with ElevenLabs AI
- 🌐 **Web Search Fallback** - Live mortgage data when documents don't contain the answer
- 🎯 **Smart Document Routing** - Single-page: key-value extraction | Multi-page: RAG indexing

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | High-performance Python web framework |
| **Uvicorn** | ASGI server |
| **Python 3.9+** | Runtime |

### AI & Machine Learning
| Technology | Purpose |
|-----------|---------|
| **Google Gemini 2.0 Flash** | Large language model for intelligent responses |
| **Sentence Transformers** | Text embeddings (all-MiniLM-L6-v2) |
| **ChromaDB** | Vector database for document similarity search |
| **LangChain** | Text splitting and chunking utilities |
| **ElevenLabs** | Text-to-speech AI (multilingual) |
| **SerpAPI** | Real-time web search integration |

### Document Processing
| Technology | Purpose |
|-----------|---------|
| **Google Document AI** | Advanced OCR & entity extraction (optional) |
| **PyPDF2 / pdfplumber** | PDF text extraction |
| **Pytesseract** | OCR for images |
| **Pillow** | Image processing |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first styling |
| **React Router** | Client-side routing |

---

## 📦 Installation

### Prerequisites
```bash
# Python 3.9+
python3 --version

# Node.js 16+
node --version

# Tesseract OCR (for image text extraction)
brew install tesseract  # macOS
# or: sudo apt-get install tesseract-ocr  # Linux
```

### Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys:
# - GEMINI_API_KEY
# - SERPAPI_API_KEY
# - ELEVENLABS_API_KEY (optional, for TTS)

# Start backend server
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build production version
npm run build

# Serve static build
npx serve -s build -l 3000

# Or run development server
npm start
```

---

## 🔑 API Keys Required

### Essential
- **GEMINI_API_KEY** - Get from [Google AI Studio](https://aistudio.google.com/apikey)
- **SERPAPI_API_KEY** - Get from [SerpAPI](https://serpapi.com/)

### Optional
- **ELEVENLABS_API_KEY** - Get from [ElevenLabs](https://elevenlabs.io/) (for TTS)
- **DOCAI_PROJECT_ID** - Google Cloud Document AI (fallback uses free OCR)

Add these to `backend/.env`:
```bash
GEMINI_API_KEY="your_key_here"
SERPAPI_API_KEY="your_key_here"
ELEVENLABS_API_KEY="your_key_here"  # Optional
```

---

## 🏗️ Architecture

### System Flow
```
┌─────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Tailwind)          │
│  http://localhost:3000                              │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ HTTP/REST API
┌─────────────────────────────────────────────────────┐
│  Backend (FastAPI + Python)                         │
│  http://localhost:8000                              │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Document AI     │  │ Mortgage KB     │          │
│  │ OCR + Extraction│  │ RAG System      │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                      │
│  ┌─────────────────────────────────────┐           │
│  │ ChromaDB Vector Database             │           │
│  │ • Policy Collection: 14,383 chunks   │           │
│  │ • User Collection: Dynamic           │           │
│  └─────────────────────────────────────┘           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Gemini   │  │ SerpAPI  │  │ ElevenLabs│         │
│  │ AI       │  │ Search   │  │ TTS       │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

### Document Processing Pipeline
```
Upload File
    ↓
Page Count Detection
    ↓
┌───────────┴───────────┐
│                       │
1 Page              2+ Pages
│                       │
Key-Value           Key-Value +
Extraction          RAG Indexing
    ↓                   ↓
Display          Queryable in Chat
```

---

## 📊 API Endpoints

### Document Management
```
POST   /api/documents/upload          Upload files
POST   /api/documents/{id}/process    Process & extract
GET    /api/documents                 List all documents
GET    /api/documents/{id}            Get document details
DELETE /api/documents/{id}            Delete document
```

### Knowledge Base & Chat
```
POST   /api/mortgage-kb/query         Query unified KB (ChromaDB → Web)
GET    /api/mortgage-kb/stats         Get KB statistics
POST   /api/mortgage-kb/tts           Text-to-speech conversion
```

### Legacy Endpoints (Still Available)
```
POST   /api/rag/query                 RAG query with web search
GET    /api/rag/stats                 RAG statistics
```

---

## 🗂️ Project Structure

```
HackUTA/
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── routers.py                 # API endpoints
│   ├── mortgage_kb_service.py     # Unified RAG + TTS
│   ├── document_ai_service.py     # OCR & extraction
│   ├── rag_service.py             # RAG with web search
│   ├── storage_service.py         # Google Cloud Storage
│   ├── audio_cache/               # TTS audio files
│   ├── uploads/                   # User uploaded files
│   ├── chroma_storage/            # Vector DB
│   └── RAG/
│       └── documents/             # Policy PDFs (14K+ chunks)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── MortgageKnowledgeBase.tsx  # Unified chat
│   │   │   ├── ExtractedDataView.tsx
│   │   │   └── Header.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   └── config/
│   │       └── constants.ts
│   └── build/                     # Production build
│
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

---

## 💡 How It Works

### 1. Document Upload
- User uploads PDFs, images, or text files
- System detects page count automatically
- Single-page: Extract key-values (invoices, IDs)
- Multi-page: Extract + add to RAG for Q&A

### 2. Intelligent Query System
**Priority Order:**
1. 🥇 **ChromaDB** - Search user documents + policy documents first
2. 🥈 **Web Search** - Only if no relevant docs found in ChromaDB
3. 🥉 **Gemini AI** - Generate intelligent answers from context

### 3. Text-to-Speech (Optional)
- Toggle TTS on/off in UI
- Responses read aloud with professional voice
- Cached for instant replay (saves API calls)

---

## 🎯 Use Cases

### For Mortgage Professionals
- ✅ Upload client loan applications
- ✅ Extract key information automatically
- ✅ Query multi-page loan agreements
- ✅ Compare against policy guidelines

### For Homebuyers
- ✅ Understand document requirements
- ✅ Get mortgage process guidance
- ✅ Ask policy-related questions
- ✅ Organize loan documents

---

## 🧪 Testing

### Test Document Upload
```bash
# Visit http://localhost:3000
# Upload a PDF or image
# Watch automatic processing
# View extracted key-value pairs
```

### Test Knowledge Base
```bash
# In the Document & Policy Assistant:
# Ask: "What are Fannie Mae debt-to-income requirements?"
# Get answer with policy document citations
```

### Test TTS
```bash
# Enable TTS toggle (purple checkbox)
# Ask any question
# Hear response read aloud
```

---

## 📈 Performance

### Document Processing
- Single-page extraction: < 2 seconds
- Multi-page RAG indexing: ~1 second per page
- OCR fallback: 2-5 seconds (images)

### Query Response Time
- ChromaDB search: < 500ms
- Gemini generation: 1-3 seconds
- Cached TTS: < 50ms (instant!)
- New TTS: 2-4 seconds

### Knowledge Base
- 14,383+ policy document chunks indexed
- Semantic search across 500+ pages
- Sub-second retrieval

---

## 🔒 Security Notes

- ✅ CORS configured for local development
- ✅ API keys stored in `.env` (never committed)
- ✅ File uploads validated and sanitized
- ✅ UUID-based file naming prevents collisions
- ⚠️ For production: Add authentication, rate limiting, and HTTPS

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version
python3 --version  # Must be 3.9+

# Install dependencies
pip install -r requirements.txt

# Check API keys
grep -E "GEMINI|SERP" backend/.env
```

### TTS not working
```bash
# Verify ElevenLabs key is set
grep ELEVENLABS backend/.env

# Check backend logs
tail -20 backend/backend.log | grep -i elevenlabs
```

### Documents not queryable
- Single-page docs are NOT queryable (by design)
- Only multi-page PDFs are added to RAG
- Check processing logs for "added to RAG" message

---

## 📚 Dependencies

### Python (Backend)
```
google-generativeai  # Gemini AI
chromadb            # Vector database
sentence-transformers  # Embeddings
elevenlabs          # Text-to-speech
google-search-results  # SerpAPI
fastapi             # Web framework
pdfplumber          # PDF processing
pytesseract         # OCR
```

### Node.js (Frontend)
```
react              # UI framework
typescript         # Type safety
tailwindcss        # Styling
react-router-dom   # Routing
```

---

## 🎨 Screenshots

### Main Dashboard
- Document upload with drag & drop
- Unified AI assistant interface
- TTS toggle for voice responses
- Document list with status tracking

### Knowledge Base Chat
- Color-coded sources (blue = user docs, green = policies)
- Real-time query with source citations
- Suggested questions
- Auto-play audio responses

---

## 🤝 Contributing

This project was built for HackUTA. Key features:
- Clean, modular architecture
- Comprehensive error handling
- Persistent vector storage
- Intelligent fallback systems
- Production-ready codebase

---

## 📝 License

MIT License - Built for HackUTA 2025

---

## 🌟 Credits

**Technologies Used:**
- Google Gemini AI
- ElevenLabs TTS
- ChromaDB Vector Database
- Sentence Transformers
- SerpAPI
- FastAPI
- React + TypeScript

**Built with ❤️ at HackUTA**

---

## 🚀 Quick Start

```bash
# 1. Clone and install
cd backend && pip install -r requirements.txt
cd frontend && npm install

# 2. Configure API keys in backend/.env
GEMINI_API_KEY="your_key"
SERPAPI_API_KEY="your_key"
ELEVENLABS_API_KEY="your_key"  # Optional

# 3. Start services
cd backend && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
cd frontend && npx serve -s build -l 3000 &

# 4. Open browser
open http://localhost:3000
```

**You're ready to go!** 🎉

---

**For detailed documentation, see:**
- System architecture & API docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

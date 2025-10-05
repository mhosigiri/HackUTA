from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import api_router
import os

app = FastAPI(
    title="Document Extraction API",
    description="Simple document upload and text extraction service",
    version="1.0.0"
)

# Permissive CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    print(f"[startup] Upload directory ready: {upload_dir}")

@app.get("/")
async def root():
    return {"message": "Document Extraction API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Include API routers
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

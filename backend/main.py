from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token
from routers import api_router
import os
from database import init_db

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:3000"  # Example: your frontend application's origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

security = HTTPBearer()

@app.on_event("startup")
def on_startup():
    # Ensure database tables exist on startup (best-effort)
    try:
        init_db()
    except Exception as e:
        # Avoid crashing app if DB is not available in local dev
        print(f"[startup] Skipping DB init due to error: {e}")

@app.get("/")
async def root():
    return {"message": "FastAPI Auth0 Backend"}

@app.get("/api/public")
async def public():
    return {"message": "This is a public endpoint"}

@app.get("/api/protected")
async def protected(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"message": "This is a protected endpoint", "user": payload}

# Include API routers
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

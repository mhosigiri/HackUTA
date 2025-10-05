from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token
from routers import api_router
import os

app = FastAPI(
    title="FastAPI Auth0 Backend",
    description="FastAPI backend with Auth0 authentication",
    version="1.0.0"
)

# CORS configuration
allowed_origins_env = os.getenv("CORS_ORIGINS")
# Accept localhost on any port if not explicitly set
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [f"http://localhost:{port}" for port in ("3000","3001","5173")]  # CRA / Vite defaults

if os.getenv("DEV_PERMISSIVE_CORS", "true") == "true":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

security = HTTPBearer()

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

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app.models import Base
from app.routers import analysis, comments, mitigations, registers, risks

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="DARPI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(registers.router, prefix="/api/v1")
app.include_router(risks.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(mitigations.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")

# Serve built frontend (if it exists)
if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all: serve index.html for any non-API route (SPA routing)."""
        return FileResponse(FRONTEND_DIR / "index.html")

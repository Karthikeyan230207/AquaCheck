from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.analysis import router as analysis_router
from app.api.reports import router as reports_router


app = FastAPI(
	title="AquaCheck API",
	description="Water quality report extraction and deterministic analysis API.",
	version="0.1.0",
)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["GET", "POST"],
	allow_headers=["*"],
)
app.include_router(reports_router)
app.include_router(analysis_router)
app.include_router(ai_router)


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
	return {"name": "AquaCheck API", "status": "running"}


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
	return {"status": "ok"}

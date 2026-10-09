import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.seed_data import seed_database
from app.services.voice_service import get_voice_model_status, load_local_model
from app.routers import (
    auth_router, cases_router, questions_router, upload_router, websocket_router
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("triage_bot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Seed Synthetic Data
    logger.info("Initializing Triage-Bot Database...")
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    logger.info("Synthetic healthcare triage data pre-loaded successfully.")
    async def preload_voice_model():
        try:
            await asyncio.to_thread(load_local_model)
        except Exception:
            logger.exception("Local voice model could not load; the rest of the API will remain available")

    app.state.voice_model_task = asyncio.create_task(preload_voice_model())
    yield
    # Shutdown
    logger.info("Triage-Bot Backend shutting down.")


app = FastAPI(
    title="Triage-Bot: Multimodal Healthcare Triage Assistant",
    description=(
        "Privacy-First, Human-in-the-Loop Healthcare Triage System for Government & Institutional Health Facilities. "
        "Strictly Non-Diagnostic: Organizes symptoms, extracts report data via OCR, highlights urgency, "
        "and supports qualified medical workers."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Mobile Apps (Expo Go) and Reviewer Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(cases_router.router)
app.include_router(questions_router.router)
app.include_router(upload_router.router)
app.include_router(websocket_router.router)


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Triage-Bot Backend",
        "version": "1.0.0",
        "voice_model": get_voice_model_status(),
        "compliance": "Non-diagnostic triage support only. Synthetic prototype mode."
    }


@app.get("/", tags=["System"])
async def root_info():
    return {
        "name": "Multimodal Healthcare Triage Assistant API",
        "description": "Human-in-the-loop triage support for Indian healthcare facilities",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "auth": "/api/auth",
            "cases": "/api/cases",
            "questions": "/api/questions",
            "uploads": "/api/upload",
            "websocket_case": "/ws/case/{case_id}",
            "websocket_reviewer": "/ws/reviewer/notifications"
        },
        "disclaimer": (
            "NOTICE: This system provides clinical organization and advisory triage support only. "
            "It does not prescribe medications, diagnose diseases, or replace a licensed medical officer."
        )
    }


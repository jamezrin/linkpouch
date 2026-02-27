"""Linkpouch Indexer Service - Main Application"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import Settings, get_settings
from src.services.redis_consumer import RedisStreamConsumer

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting Indexer Service", version=settings.app_version)
    
    # Start Redis consumer in background
    consumer = RedisStreamConsumer(settings)
    consumer_task = asyncio.create_task(consumer.start())
    
    app.state.consumer = consumer
    app.state.consumer_task = consumer_task
    
    yield
    
    # Shutdown
    logger.info("Shutting down Indexer Service")
    await consumer.stop()
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="Linkpouch Indexer Service",
        description="Async link indexing and screenshot service",
        version=settings.app_version,
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/health")
    @app.head("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "service": "indexer"}
    
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "service": "Linkpouch Indexer",
            "version": settings.app_version,
        }
    
    return app


app = create_app()

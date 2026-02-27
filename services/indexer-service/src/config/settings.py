"""Application settings."""

import socket
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = Field(default="linkpouch-indexer")
    app_version: str = Field(default="0.1.0")
    environment: str = Field(default="development")
    
    # Redis
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)
    
    # Redis Streams
    link_stream_key: str = Field(default="linkpouch:events:link")
    screenshot_stream_key: str = Field(default="linkpouch:events:screenshot")
    consumer_group: str = Field(default="indexer-workers")
    consumer_name: str = Field(default_factory=socket.gethostname)
    
    # Playwright
    playwright_headless: bool = Field(default=True)
    playwright_timeout: int = Field(default=30000)  # 30 seconds
    
    # S3/MinIO
    s3_endpoint: str = Field(default="http://localhost:9000")
    s3_access_key: str = Field(default="minioadmin")
    s3_secret_key: str = Field(default="minioadmin")
    s3_bucket: str = Field(default="linkpouch-screenshots")
    
    # Indexing
    max_content_length: int = Field(default=100_000)  # Max characters to index
    screenshot_width: int = Field(default=1280)
    screenshot_height: int = Field(default=720)
    
    # Stash Service
    stash_service_url: str = Field(default="http://stash-service:8080")
    stash_service_timeout: int = Field(default=30)
    indexer_callback_secret: str = Field(...)  # Required — no default allowed
    
    @property
    def redis_url(self) -> str:
        """Get Redis connection URL."""
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

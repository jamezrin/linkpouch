"""HTTP client for communicating with Stash Service."""

from typing import Any

import httpx
import structlog

from src.config.settings import Settings

logger = structlog.get_logger()


class StashServiceClient:
    """Client for sending indexing results to Stash Service."""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=settings.stash_service_url,
            timeout=settings.stash_service_timeout,
            headers={"X-Indexer-Secret": settings.indexer_callback_secret},
        )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def update_link_metadata(
        self,
        link_id: str,
        title: str | None,
        description: str | None,
        favicon_url: str | None,
        page_content: str | None,
        final_url: str | None,
    ) -> None:
        """Send scraped metadata back to Stash Service."""
        try:
            payload = {
                "title": title,
                "description": description,
                "faviconUrl": favicon_url,
                "pageContent": page_content,
                "finalUrl": final_url,
            }
            
            response = await self.client.patch(
                f"/links/{link_id}/metadata",
                json=payload,
            )
            response.raise_for_status()
            
            logger.info(
                "Link metadata updated",
                link_id=link_id,
                title=title,
            )
            
        except Exception as e:
            logger.error(
                "Failed to update link metadata",
                link_id=link_id,
                error=str(e),
            )
            raise
    
    async def update_link_status(
        self,
        link_id: str,
        status: str,
    ) -> None:
        """Notify Stash Service of a terminal link status (e.g. FAILED)."""
        try:
            response = await self.client.patch(
                f"/links/{link_id}/status",
                json={"status": status},
            )
            response.raise_for_status()

            logger.info(
                "Link status updated",
                link_id=link_id,
                status=status,
            )

        except Exception as e:
            logger.error(
                "Failed to update link status",
                link_id=link_id,
                status=status,
                error=str(e),
            )
            raise

    async def update_ai_summary(
        self,
        link_id: str,
        status: str,
        summary: str | None,
        model: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        elapsed_ms: int | None = None,
    ) -> None:
        """Notify Stash Service of the AI summary result."""
        try:
            payload: dict = {"status": status}
            if summary is not None:
                payload["summary"] = summary
            if model is not None:
                payload["model"] = model
            if input_tokens is not None:
                payload["inputTokens"] = input_tokens
            if output_tokens is not None:
                payload["outputTokens"] = output_tokens
            if elapsed_ms is not None:
                payload["elapsedMs"] = elapsed_ms

            response = await self.client.patch(
                f"/links/{link_id}/ai-summary",
                json=payload,
            )
            response.raise_for_status()

            logger.info(
                "AI summary updated",
                link_id=link_id,
                status=status,
            )

        except Exception as e:
            logger.error(
                "Failed to update AI summary",
                link_id=link_id,
                status=status,
                error=str(e),
            )
            raise

    async def update_screenshot(
        self,
        link_id: str,
        screenshot_key: str,
    ) -> None:
        """Notify Stash Service that screenshot is ready."""
        try:
            response = await self.client.patch(
                f"/links/{link_id}/screenshot",
                json={"screenshotKey": screenshot_key},
            )
            response.raise_for_status()
            
            logger.info(
                "Screenshot updated",
                link_id=link_id,
                screenshot_key=screenshot_key,
            )
            
        except Exception as e:
            logger.error(
                "Failed to update screenshot",
                link_id=link_id,
                error=str(e),
            )
            raise

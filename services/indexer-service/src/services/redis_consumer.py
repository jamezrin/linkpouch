"""Redis Streams consumer for async event processing."""

import asyncio
import json
from typing import Any

import structlog
from redis.asyncio import Redis

from src.config.settings import Settings
from src.services.scraper import LinkScraper
from src.services.stash_client import StashServiceClient
from src.services.storage_service import ScreenshotStorageService

logger = structlog.get_logger()


class RedisStreamConsumer:
    """Consumer for Redis Streams events."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis: Redis | None = None
        self.storage_service = ScreenshotStorageService(settings)
        self.scraper = LinkScraper(settings, self.storage_service)
        self.stash_client = StashServiceClient(settings)
        self._running = False
        
    async def start(self) -> None:
        """Start the consumer."""
        logger.info(
            "Starting Redis Stream Consumer",
            group=self.settings.consumer_group,
            name=self.settings.consumer_name,
        )
        
        self.redis = Redis.from_url(
            self.settings.redis_url,
            decode_responses=True,
        )
        self._running = True
        
        # Create consumer group if not exists
        await self._create_consumer_groups()
        
        # Start consuming
        await self._consume()
    
    async def stop(self) -> None:
        """Stop the consumer."""
        logger.info("Stopping Redis Stream Consumer")
        self._running = False
        if self.redis:
            await self.redis.close()
        await self.stash_client.close()
        self.storage_service.shutdown()
    
    async def _create_consumer_groups(self) -> None:
        """Create consumer groups for streams."""
        streams = [
            self.settings.link_stream_key,
            self.settings.screenshot_stream_key,
        ]
        
        for stream in streams:
            try:
                await self.redis.xgroup_create(  # type: ignore
                    stream,
                    self.settings.consumer_group,
                    id="0",
                    mkstream=True,
                )
                logger.info("Created consumer group", stream=stream)
            except Exception as e:
                if "already exists" in str(e):
                    logger.debug("Consumer group already exists", stream=stream)
                else:
                    logger.error("Failed to create consumer group", stream=stream, error=str(e))
    
    async def _consume(self) -> None:
        """Main consumption loop."""
        streams = {
            self.settings.link_stream_key: self._handle_link_event,
            self.settings.screenshot_stream_key: self._handle_screenshot_event,
        }
        # Tracks the XAUTOCLAIM cursor per stream (start from oldest pending on boot)
        autoclaim_cursors: dict[str, str] = {key: "0-0" for key in streams}
        # Reclaim messages that have been pending for more than 60 seconds
        min_idle_ms = 60_000

        while self._running:
            try:
                for stream_key, handler in streams.items():
                    # 1. Reclaim stale pending messages before reading new ones
                    cursor = autoclaim_cursors[stream_key]
                    claimed = await self.redis.xautoclaim(  # type: ignore
                        stream_key,
                        self.settings.consumer_group,
                        self.settings.consumer_name,
                        min_idle_time=min_idle_ms,
                        start_id=cursor,
                        count=1,
                    )
                    # xautoclaim returns (next_cursor, [(msg_id, msg_data), ...], deleted_ids)
                    next_cursor, claimed_msgs, _ = claimed
                    if claimed_msgs:
                        for msg_id, msg_data in claimed_msgs:
                            await self._process_message(stream_key, msg_id, msg_data, handler)
                    # Reset cursor to "0-0" when we've swept through all pending entries
                    autoclaim_cursors[stream_key] = next_cursor if next_cursor != "0-0" else "0-0"

                    # 2. Read new (undelivered) messages
                    messages = await self.redis.xreadgroup(  # type: ignore
                        groupname=self.settings.consumer_group,
                        consumername=self.settings.consumer_name,
                        streams={stream_key: ">"},
                        count=1,
                        block=1000,
                    )

                    if messages:
                        for stream_name, msgs in messages:
                            for msg_id, msg_data in msgs:
                                await self._process_message(
                                    stream_name,
                                    msg_id,
                                    msg_data,
                                    handler,
                                )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in consumption loop", error=str(e))
                await asyncio.sleep(1)
    
    async def _process_message(
        self,
        stream: str,
        msg_id: str,
        msg_data: dict,
        handler: Any,
    ) -> None:
        """Process a single message. Only acks on success; leaves the message
        pending on failure so it can be reclaimed and retried."""
        logger.debug(
            "Processing message",
            stream=stream,
            msg_id=msg_id,
            event_type=msg_data.get("eventType"),
        )

        try:
            await handler(msg_data)
        except Exception as e:
            logger.error(
                "Failed to process message — leaving pending for retry",
                stream=stream,
                msg_id=msg_id,
                error=str(e),
                exc_info=True,
            )
            return

        # Acknowledge only after successful processing
        await self.redis.xack(stream, self.settings.consumer_group, msg_id)  # type: ignore
        logger.info(
            "Message processed and acknowledged",
            stream=stream,
            msg_id=msg_id,
        )
    
    async def _handle_link_event(self, data: dict) -> None:
        """Handle link.added event."""
        event_type = data.get("eventType")
        link_id = data.get("linkId")
        url = data.get("url")
        
        logger.info(
            "Handling link event",
            event_type=event_type,
            link_id=link_id,
            url=url,
        )
        
        if event_type == "link.added":
            if not url:
                logger.warning("No URL provided for link.added event", link_id=link_id)
                return
            # Scrape metadata
            result = await self.scraper.scrape_link(url)
            logger.info("Link scraped", link_id=link_id, title=result.get("title"))
            await self.stash_client.update_link_metadata(
                link_id=link_id,
                title=result.get("title"),
                description=result.get("description"),
                favicon_url=result.get("favicon_url"),
                page_content=result.get("page_content"),
                final_url=result.get("final_url"),
            )
            # Take screenshot automatically for new links
            screenshot = await self.scraper.take_screenshot(url)
            logger.info(
                "Initial screenshot taken",
                link_id=link_id,
                screenshot_key=screenshot.get("key"),
            )
            if link_id and screenshot.get("key"):
                await self.stash_client.update_screenshot(
                    link_id=link_id,
                    screenshot_key=screenshot["key"],
                )
    
    async def _handle_screenshot_event(self, data: dict) -> None:
        """Handle screenshot.refresh.requested event."""
        event_type = data.get("eventType")
        link_id = data.get("linkId")
        url = data.get("url")
        
        logger.info(
            "Handling screenshot event",
            event_type=event_type,
            link_id=link_id,
            url=url,
        )
        
        if event_type == "screenshot.refresh.requested":
            if not url:
                logger.warning("No URL provided for screenshot.refresh.requested event", link_id=link_id)
                return
            # Regenerate screenshot
            screenshot = await self.scraper.take_screenshot(url)
            logger.info(
                "Screenshot refreshed",
                link_id=link_id,
                screenshot_key=screenshot.get("key"),
            )
            # Notify stash service about new screenshot
            if link_id and screenshot.get("key"):
                await self.stash_client.update_screenshot(
                    link_id=link_id,
                    screenshot_key=screenshot["key"],
                )

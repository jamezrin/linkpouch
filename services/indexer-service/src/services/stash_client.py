"""gRPC client for communicating with Stash Service."""

import grpc
import structlog

from src.config.settings import Settings
from src.generated import stash_indexer_pb2, stash_indexer_pb2_grpc

logger = structlog.get_logger()


class StashServiceClient:
    """Client for sending indexing results to Stash Service over gRPC."""

    def __init__(self, settings: Settings):
        self.settings = settings
        target = f"{settings.stash_service_grpc_host}:{settings.stash_service_grpc_port}"
        self._channel = grpc.aio.insecure_channel(target)
        self._stub = stash_indexer_pb2_grpc.IndexerCallbackServiceStub(self._channel)
        self._metadata = [("x-indexer-secret", settings.indexer_callback_secret)]
        self._timeout = settings.stash_service_timeout

    async def close(self) -> None:
        """Close the gRPC channel."""
        await self._channel.close()

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
            request = stash_indexer_pb2.UpdateLinkMetadataRequest(link_id=link_id)
            if title is not None:
                request.title = title
            if description is not None:
                request.description = description
            if favicon_url is not None:
                request.favicon_url = favicon_url
            if page_content is not None:
                request.page_content = page_content
            if final_url is not None:
                request.final_url = final_url

            await self._stub.UpdateLinkMetadata(
                request, metadata=self._metadata, timeout=self._timeout
            )
            logger.info("Link metadata updated", link_id=link_id, title=title)
        except grpc.RpcError as e:
            logger.error(
                "Failed to update link metadata",
                link_id=link_id,
                grpc_code=e.code(),
                grpc_details=e.details(),
            )
            raise

    async def update_link_status(self, link_id: str, status: str) -> None:
        """Notify Stash Service of a terminal link status (e.g. FAILED)."""
        try:
            status_value = stash_indexer_pb2.LinkStatus.Value(status)
            request = stash_indexer_pb2.UpdateLinkStatusRequest(
                link_id=link_id, status=status_value
            )
            await self._stub.UpdateLinkStatus(
                request, metadata=self._metadata, timeout=self._timeout
            )
            logger.info("Link status updated", link_id=link_id, status=status)
        except grpc.RpcError as e:
            logger.error(
                "Failed to update link status",
                link_id=link_id,
                status=status,
                grpc_code=e.code(),
                grpc_details=e.details(),
            )
            raise

    async def get_ai_credentials(self, stash_id: str) -> str:
        """Fetch the decrypted AI API key for the account that owns the given stash.
        Returns an empty string if no credentials are configured."""
        try:
            request = stash_indexer_pb2.GetAiCredentialsRequest(stash_id=stash_id)
            response = await self._stub.GetAiCredentials(
                request, metadata=self._metadata, timeout=self._timeout
            )
            return response.api_key
        except grpc.RpcError as e:
            logger.error(
                "Failed to fetch AI credentials",
                stash_id=stash_id,
                grpc_code=e.code(),
                grpc_details=e.details(),
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
            ai_status = (
                stash_indexer_pb2.AiSummaryStatus.AI_COMPLETED
                if status == "COMPLETED"
                else stash_indexer_pb2.AiSummaryStatus.AI_FAILED
            )
            request = stash_indexer_pb2.UpdateLinkAiSummaryRequest(
                link_id=link_id, status=ai_status
            )
            if summary is not None:
                request.summary = summary
            if model is not None:
                request.model = model
            if input_tokens is not None:
                request.input_tokens = input_tokens
            if output_tokens is not None:
                request.output_tokens = output_tokens
            if elapsed_ms is not None:
                request.elapsed_ms = elapsed_ms

            await self._stub.UpdateLinkAiSummary(
                request, metadata=self._metadata, timeout=self._timeout
            )
            logger.info("AI summary updated", link_id=link_id, status=status)
        except grpc.RpcError as e:
            logger.error(
                "Failed to update AI summary",
                link_id=link_id,
                status=status,
                grpc_code=e.code(),
                grpc_details=e.details(),
            )
            raise

    async def update_screenshot(self, link_id: str, screenshot_key: str) -> None:
        """Notify Stash Service that screenshot is ready."""
        try:
            request = stash_indexer_pb2.UpdateLinkScreenshotRequest(
                link_id=link_id, screenshot_key=screenshot_key
            )
            await self._stub.UpdateLinkScreenshot(
                request, metadata=self._metadata, timeout=self._timeout
            )
            logger.info("Screenshot updated", link_id=link_id, screenshot_key=screenshot_key)
        except grpc.RpcError as e:
            logger.error(
                "Failed to update screenshot",
                link_id=link_id,
                grpc_code=e.code(),
                grpc_details=e.details(),
            )
            raise

"""S3-compatible storage service for screenshots."""

import asyncio
from concurrent.futures import ThreadPoolExecutor

import boto3
import structlog
from botocore.config import Config
from botocore.exceptions import ClientError

from src.config.settings import Settings

logger = structlog.get_logger()


class ScreenshotStorageService:
    """Handles screenshot upload to S3-compatible storage (MinIO/SeaweedFS)."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._client = None
        self._bucket = settings.s3_bucket

    def _get_client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=self.settings.s3_endpoint,
                aws_access_key_id=self.settings.s3_access_key,
                aws_secret_access_key=self.settings.s3_secret_key,
                config=Config(signature_version="s3v4"),
                region_name="us-east-1",
            )
            self._ensure_bucket()
        return self._client

    def _ensure_bucket(self):
        """Create the bucket if it does not exist."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchBucket"):
                try:
                    self._client.create_bucket(Bucket=self._bucket)
                    logger.info("Created S3 bucket", bucket=self._bucket)
                except Exception as create_err:
                    logger.error(
                        "Failed to create S3 bucket",
                        bucket=self._bucket,
                        error=str(create_err),
                    )
                    raise
            else:
                raise

    def _upload_sync(self, key: str, data: bytes, content_type: str) -> None:
        client = self._get_client()
        client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    async def upload(self, key: str, data: bytes, content_type: str = "image/png") -> str:
        """Upload screenshot bytes and return the stored key."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            self._executor,
            lambda: self._upload_sync(key, data, content_type),
        )
        logger.info("Screenshot uploaded to S3", key=key, size=len(data))
        return key

    def shutdown(self) -> None:
        """Shut down the thread pool executor."""
        self._executor.shutdown(wait=False)

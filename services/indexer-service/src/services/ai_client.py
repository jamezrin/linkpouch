"""AI provider strategies for generating link summaries."""

import asyncio
import time
from abc import ABC, abstractmethod

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger()

MAX_CONTENT_LENGTH = 80_000
# Hard total timeout per attempt; tenacity will retry up to 3 times on TimeoutError
TOTAL_TIMEOUT_S = 90.0
_HTTPX_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=5.0)


def _truncate(text: str | None) -> str:
    if not text:
        return ""
    return text[:MAX_CONTENT_LENGTH]


class AiSummaryProvider(ABC):
    """Strategy interface for AI summary generation."""

    @abstractmethod
    async def generate_summary(
        self, api_key: str, model: str, system_prompt: str, page_content: str
    ) -> dict:
        """Generate a summary and return a dict with summary, model, token stats, and elapsed_ms."""


class OpenAiCompatibleProvider(AiSummaryProvider):
    """Strategy for OpenAI-compatible chat completions APIs (OpenRouter, OpenAI, OpenCode, INCLUDED)."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_summary(
        self, api_key: str, model: str, system_prompt: str, page_content: str
    ) -> dict:
        truncated = _truncate(page_content)

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=_HTTPX_TIMEOUT) as client:
            response = await asyncio.wait_for(
                client.post(
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": truncated},
                        ],
                    },
                ),
                timeout=TOTAL_TIMEOUT_S,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            response.raise_for_status()
            data = response.json()
            usage = data.get("usage", {})
            return {
                "summary": data["choices"][0]["message"]["content"],
                "model": data.get("model", model),
                "input_tokens": usage.get("prompt_tokens"),
                "output_tokens": usage.get("completion_tokens"),
                "elapsed_ms": elapsed_ms,
            }


class AnthropicProvider(AiSummaryProvider):
    """Strategy for the Anthropic Messages API."""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_summary(
        self, api_key: str, model: str, system_prompt: str, page_content: str
    ) -> dict:
        truncated = _truncate(page_content)

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=_HTTPX_TIMEOUT) as client:
            response = await asyncio.wait_for(
                client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": truncated},
                        ],
                    },
                ),
                timeout=TOTAL_TIMEOUT_S,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            response.raise_for_status()
            data = response.json()
            usage = data.get("usage", {})
            return {
                "summary": data["content"][0]["text"],
                "model": data.get("model", model),
                "input_tokens": usage.get("input_tokens"),
                "output_tokens": usage.get("output_tokens"),
                "elapsed_ms": elapsed_ms,
            }


_REGISTRY: dict[str, AiSummaryProvider] = {
    "OPENROUTER_INCLUDED": OpenAiCompatibleProvider("https://openrouter.ai/api/v1"),
    "OPENROUTER": OpenAiCompatibleProvider("https://openrouter.ai/api/v1"),
    "OPENAI": OpenAiCompatibleProvider("https://api.openai.com/v1"),
    "OPENCODE": OpenAiCompatibleProvider("https://api.opencode.ai/v1"),
    "ANTHROPIC": AnthropicProvider(),
}


def get_provider(provider: str) -> AiSummaryProvider:
    """Return the strategy instance for the given provider key."""
    strategy = _REGISTRY.get(provider)
    if strategy is None:
        raise ValueError(f"Unknown AI provider: {provider!r}")
    return strategy

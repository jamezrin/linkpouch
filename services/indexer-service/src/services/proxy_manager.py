"""Proxy resolution with per-proxy EMA reliability scoring.

Flow:
  1. Fetch proxy lists from all enabled adapters concurrently.
  2. Merge and deduplicate by (ip, port); cache merged list in Redis.
  3. For a given country, load per-proxy scores from Redis and sort candidates
     by score descending (higher = more reliable).
  4. Try up to max_attempts candidates with a connectivity check.
  5. Return the first working proxy URL, or None to fall back to direct connection.

Scores are stored as floats in Redis under ``linkpouch:proxy_score:{ip}:{port}``
with a 24-hour TTL. They are updated via EMA after each connectivity check AND
after the real scrape completes (update_proxy_score is called by redis_consumer).
"""

import asyncio
import json
import random
from typing import Any

import httpx
import structlog
from redis.asyncio import Redis

from src.config.settings import Settings
from src.services.proxy_sources import ProxyEntry, build_adapters

logger = structlog.get_logger()

_LIST_CACHE_KEY = "linkpouch:proxy_list"
_SCORE_KEY_PREFIX = "linkpouch:proxy_score:"
_SCORE_TTL = 86_400  # 24 hours
_EMA_ALPHA = 0.8     # weight on history; new observation counts for 20 %
_INITIAL_SCORE = 0.5


def _score_key(ip: str, port: int) -> str:
    return f"{_SCORE_KEY_PREFIX}{ip}:{port}"


def _proxy_url(entry: ProxyEntry) -> str:
    return f"http://{entry['ip']}:{entry['port']}"


async def _fetch_all_adapters(settings: Settings) -> list[ProxyEntry]:
    """Fetch from all enabled adapters concurrently and return a deduplicated list."""
    adapters = build_adapters(settings.proxy_enabled_sources)
    results_per_adapter: list[list[ProxyEntry]] = await asyncio.gather(
        *[adapter.fetch() for adapter in adapters],
        return_exceptions=False,
    )

    seen: set[tuple[str, int]] = set()
    merged: list[ProxyEntry] = []
    for entries in results_per_adapter:
        if isinstance(entries, Exception):
            continue
        for entry in entries:
            key = (entry["ip"], entry["port"])
            if key not in seen:
                seen.add(key)
                merged.append(entry)

    logger.info("Proxy lists merged", total=len(merged))
    return merged


async def _get_cached_list(redis: Redis, settings: Settings) -> list[ProxyEntry]:
    """Return the proxy list from Redis cache, refreshing if missing."""
    raw = await redis.get(_LIST_CACHE_KEY)
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass

    proxies = await _fetch_all_adapters(settings)
    if proxies:
        await redis.setex(_LIST_CACHE_KEY, settings.proxy_cache_ttl, json.dumps(proxies))
    return proxies


async def _get_score(redis: Redis, ip: str, port: int) -> float:
    raw = await redis.get(_score_key(ip, port))
    if raw is None:
        return _INITIAL_SCORE
    try:
        return float(raw)
    except (TypeError, ValueError):
        return _INITIAL_SCORE


async def _update_score(redis: Redis, ip: str, port: int, success: bool) -> None:
    old = await _get_score(redis, ip, port)
    outcome = 1.0 if success else 0.0
    new = _EMA_ALPHA * old + (1.0 - _EMA_ALPHA) * outcome
    await redis.setex(_score_key(ip, port), _SCORE_TTL, str(new))


async def update_proxy_score(redis: Redis, proxy_url: str | None, success: bool) -> None:
    """Update the EMA reliability score for a proxy URL after a real scrape result.

    Call this from redis_consumer after each scrape attempt to feed real-world
    outcomes back into the ranking. No-op if proxy_url is None.
    """
    if not proxy_url:
        return
    try:
        # proxy_url is "http://ip:port"
        without_scheme = proxy_url.removeprefix("http://").removeprefix("https://")
        ip, port_str = without_scheme.rsplit(":", 1)
        await _update_score(redis, ip, int(port_str), success)
    except Exception as exc:
        logger.debug("Failed to update proxy score", proxy_url=proxy_url, error=str(exc))


async def resolve_proxy(redis: Redis, country_code: str, settings: Settings) -> str | None:
    """Resolve a working HTTPS proxy for the given ISO 3166-1 alpha-2 country code.

    Returns an ``http://ip:port`` URL or None if no working proxy is found.
    Candidates are sorted by reliability score (descending). Each candidate is
    tested with a 10-second connectivity check before being returned.
    """
    proxies = await _get_cached_list(redis, settings)
    upper = country_code.upper()
    candidates = [p for p in proxies if p["country"] == upper and p["supports_https"]]

    if not candidates:
        logger.info("No proxy candidates for country", country=upper)
        return None

    # Score each candidate and sort by score descending
    scores: list[tuple[float, ProxyEntry]] = []
    for entry in candidates:
        score = await _get_score(redis, entry["ip"], entry["port"])
        scores.append((score, entry))
    scores.sort(key=lambda t: t[0], reverse=True)

    # Try top candidates
    for score, entry in scores[: settings.proxy_max_attempts]:
        url = _proxy_url(entry)
        ok = await _test_proxy(url)
        await _update_score(redis, entry["ip"], entry["port"], ok)
        if ok:
            logger.info("Proxy selected", proxy_url=url, country=upper, score=score)
            return url
        logger.debug("Proxy connectivity check failed", proxy_url=url, country=upper)

    logger.warning(
        "All proxy candidates failed; falling back to direct connection",
        country=upper,
        attempted=min(settings.proxy_max_attempts, len(candidates)),
    )
    return None


async def _test_proxy(proxy_url: str) -> bool:
    """Return True if the proxy can reach https://example.com within 10 seconds."""
    try:
        async with httpx.AsyncClient(proxy=proxy_url, timeout=10) as client:
            response = await client.get("https://example.com")
            return response.status_code < 500
    except Exception:
        return False

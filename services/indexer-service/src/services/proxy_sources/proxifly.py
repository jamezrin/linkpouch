"""Proxifly free-proxy-list adapter.

Source: https://github.com/proxifly/free-proxy-list
JSON schema: [{ip, port, https: bool, geolocation: {country, city}, ...}]
"""

import structlog
import httpx

from src.services.proxy_sources.base import ProxyEntry

logger = structlog.get_logger()

_URL = "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.json"


class ProxiflyAdapter:
    name = "proxifly"

    def __init__(self, url: str = _URL):
        self._url = url

    async def fetch(self) -> list[ProxyEntry]:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(self._url)
                response.raise_for_status()
                raw: list[dict] = response.json()
        except Exception as exc:
            logger.warning("Proxifly fetch failed", error=str(exc))
            return []

        results: list[ProxyEntry] = []
        for item in raw:
            ip = item.get("ip")
            port = item.get("port")
            geo = item.get("geolocation") or {}
            country = geo.get("country")
            supports_https: bool = bool(item.get("https", False))
            if not ip or not port or not country:
                continue
            results.append(ProxyEntry(
                ip=str(ip),
                port=int(port),
                country=str(country).upper(),
                supports_https=supports_https,
            ))

        logger.debug("Proxifly proxies fetched", total=len(raw), valid=len(results))
        return results

"""iplocate free-proxy-list adapter.

Source: https://github.com/iplocate/free-proxy-list
JSON schema: similar to proxifly — [{ip, port, country, protocols: [str, ...], ...}]
"""

import structlog
import httpx

from src.services.proxy_sources.base import ProxyEntry

logger = structlog.get_logger()

_URL = "https://raw.githubusercontent.com/iplocate/free-proxy-list/main/proxies/all/data.json"


class IplocateAdapter:
    name = "iplocate"

    def __init__(self, url: str = _URL):
        self._url = url

    async def fetch(self) -> list[ProxyEntry]:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(self._url)
                response.raise_for_status()
                raw: list[dict] = response.json()
        except Exception as exc:
            logger.warning("iplocate fetch failed", error=str(exc))
            return []

        results: list[ProxyEntry] = []
        for item in raw:
            ip = item.get("ip")
            port = item.get("port")
            country = item.get("country")
            protocols: list[str] = item.get("protocols") or []
            if not ip or not port or not country:
                continue
            results.append(ProxyEntry(
                ip=str(ip),
                port=int(port),
                country=str(country).upper(),
                supports_https="https" in [p.lower() for p in protocols],
            ))

        logger.debug("iplocate proxies fetched", total=len(raw), valid=len(results))
        return results

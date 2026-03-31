"""Proxy-List-World adapter.

Source: https://github.com/themiralay/Proxy-List-World
The repository publishes a JSON file. Verify the exact path and schema at
implementation / update time — the format may differ from proxifly/iplocate.

Expected schema (verify against actual repo):
  [{
    "ip": "1.2.3.4",
    "port": 8080,
    "code": "US",         # country code field name may vary
    "type": "https",      # or "protocols": [...]
    ...
  }]
"""

import structlog
import httpx

from src.services.proxy_sources.base import ProxyEntry

logger = structlog.get_logger()

# NOTE: verify this path against the actual repository structure
_URL = "https://raw.githubusercontent.com/themiralay/Proxy-List-World/master/data.json"


class ProxyListWorldAdapter:
    name = "proxy_list_world"

    def __init__(self, url: str = _URL):
        self._url = url

    async def fetch(self) -> list[ProxyEntry]:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(self._url)
                response.raise_for_status()
                raw: list[dict] = response.json()
        except Exception as exc:
            logger.warning("Proxy-List-World fetch failed", error=str(exc))
            return []

        results: list[ProxyEntry] = []
        for item in raw:
            ip = item.get("ip")
            port = item.get("port")
            # Accept both "code" and "country" field names
            country = item.get("code") or item.get("country")
            # Accept "type" as a single-string protocol or "protocols" as a list
            proto_type: str = item.get("type", "")
            protocols: list[str] = item.get("protocols") or ([proto_type] if proto_type else [])
            if not ip or not port or not country:
                continue
            results.append(ProxyEntry(
                ip=str(ip),
                port=int(port),
                country=str(country).upper(),
                supports_https="https" in [p.lower() for p in protocols],
            ))

        logger.debug("Proxy-List-World proxies fetched", total=len(raw), valid=len(results))
        return results

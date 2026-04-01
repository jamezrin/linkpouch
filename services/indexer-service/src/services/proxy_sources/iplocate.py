"""iplocate free-proxy-list adapter.

Source: https://github.com/iplocate/free-proxy-list
Format: plain-text files per country and per protocol.
  - countries/{CC}/proxies.txt  — one "protocol://ip:port" per line
  - protocols/https.txt         — one "ip:port" per line (HTTPS-capable proxies)

Strategy: fetch all supported country files + the HTTPS list in parallel, then
keep only entries whose ip:port appears in the HTTPS set.
"""

import asyncio

import httpx
import structlog

from src.services.proxy_sources.base import ProxyEntry

logger = structlog.get_logger()

_BASE = "https://raw.githubusercontent.com/iplocate/free-proxy-list/main"
_HTTPS_URL = f"{_BASE}/protocols/https.txt"
_COUNTRY_URL = _BASE + "/countries/{cc}/proxies.txt"

# Countries we support — must match SUPPORTED_PROXY_COUNTRIES in the frontend
_SUPPORTED_COUNTRIES = ["US", "CA", "GB", "DE", "FR", "NL", "AU", "JP", "SG", "BR", "IN"]


class IplocateAdapter:
    name = "iplocate"

    def __init__(self, url_template: str = _COUNTRY_URL, https_url: str = _HTTPS_URL):
        self._url_template = url_template
        self._https_url = https_url

    async def fetch(self) -> list[ProxyEntry]:
        async with httpx.AsyncClient(timeout=15) as client:
            https_set, country_results = await asyncio.gather(
                self._fetch_https_set(client),
                self._fetch_all_countries(client),
            )

        results: list[ProxyEntry] = []
        for country, ip, port in country_results:
            if f"{ip}:{port}" in https_set:
                results.append(ProxyEntry(ip=ip, port=port, country=country, supports_https=True))

        logger.debug("iplocate proxies fetched", total=len(country_results), valid=len(results))
        return results

    async def _fetch_https_set(self, client: httpx.AsyncClient) -> set[str]:
        try:
            r = await client.get(self._https_url)
            r.raise_for_status()
            return {line.strip() for line in r.text.splitlines() if line.strip()}
        except Exception as exc:
            logger.warning("iplocate https list fetch failed", error=str(exc))
            return set()

    async def _fetch_all_countries(self, client: httpx.AsyncClient) -> list[tuple[str, str, int]]:
        tasks = [self._fetch_country(client, cc) for cc in _SUPPORTED_COUNTRIES]
        results_per_country = await asyncio.gather(*tasks)
        return [entry for entries in results_per_country for entry in entries]

    async def _fetch_country(self, client: httpx.AsyncClient, cc: str) -> list[tuple[str, str, int]]:
        url = self._url_template.format(cc=cc)
        try:
            r = await client.get(url)
            r.raise_for_status()
        except Exception as exc:
            logger.warning("iplocate country fetch failed", country=cc, error=str(exc))
            return []

        entries: list[tuple[str, str, int]] = []
        for line in r.text.splitlines():
            line = line.strip()
            if not line:
                continue
            # Lines are either "ip:port" or "protocol://ip:port"
            if "://" in line:
                line = line.split("://", 1)[1]
            if ":" not in line:
                continue
            ip, _, port_str = line.rpartition(":")
            try:
                entries.append((cc, ip, int(port_str)))
            except ValueError:
                continue
        return entries

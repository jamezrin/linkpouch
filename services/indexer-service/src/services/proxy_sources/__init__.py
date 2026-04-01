"""Proxy source adapter subpackage."""

from src.services.proxy_sources.base import ProxyEntry, ProxySourceAdapter
from src.services.proxy_sources.iplocate import IplocateAdapter
from src.services.proxy_sources.proxifly import ProxiflyAdapter

_ALL_ADAPTERS: dict[str, ProxySourceAdapter] = {
    "proxifly": ProxiflyAdapter(),
    "iplocate": IplocateAdapter(),
}


def build_adapters(enabled_sources: str) -> list[ProxySourceAdapter]:
    """Return adapters for the comma-separated list of source names.

    Unknown names are logged and skipped. If the list is empty or all names are
    unknown, all adapters are returned as a fallback.
    """
    import structlog
    log = structlog.get_logger()

    names = [n.strip() for n in enabled_sources.split(",") if n.strip()]
    if not names:
        return list(_ALL_ADAPTERS.values())

    selected: list[ProxySourceAdapter] = []
    for name in names:
        adapter = _ALL_ADAPTERS.get(name)
        if adapter is None:
            log.warning("Unknown proxy source adapter name — skipping", name=name)
        else:
            selected.append(adapter)

    return selected if selected else list(_ALL_ADAPTERS.values())


__all__ = [
    "ProxyEntry",
    "ProxySourceAdapter",
    "ProxiflyAdapter",
    "IplocateAdapter",
    "build_adapters",
]

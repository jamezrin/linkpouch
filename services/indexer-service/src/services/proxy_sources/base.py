"""Shared types for proxy source adapters."""

from typing import Protocol, TypedDict


class ProxyEntry(TypedDict):
    ip: str
    port: int
    country: str       # ISO 3166-1 alpha-2, upper-cased
    supports_https: bool


class ProxySourceAdapter(Protocol):
    """Interface for proxy source adapters."""

    name: str

    async def fetch(self) -> list[ProxyEntry]:
        """Fetch the full proxy list and return normalised entries.

        Implementations must:
        - Upper-case the country code before returning
        - Return an empty list (not raise) if the source is unavailable
        """
        ...

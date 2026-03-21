"""Web scraping service using Playwright."""

import ipaddress
import socket
from typing import Any
from urllib.parse import urljoin, urlparse

import structlog
import trafilatura
from playwright.async_api import async_playwright
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from src.config.settings import Settings
from src.services.storage_service import ScreenshotStorageService

logger = structlog.get_logger()

# Private/reserved IP networks that must not be reachable from the indexer
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),   # CGNAT
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),        # unique local
    ipaddress.ip_network("fe80::/10"),       # link-local IPv6
]


def validate_url(url: str) -> None:
    """Raise ValueError if the URL scheme is non-HTTP or resolves to a private address."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Only http/https URLs are allowed, got: {parsed.scheme!r}")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL has no hostname")

    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve hostname {hostname!r}: {exc}") from exc

    for addr_info in addr_infos:
        ip = ipaddress.ip_address(addr_info[4][0])
        for net in _BLOCKED_NETWORKS:
            if ip in net:
                raise ValueError(
                    f"URL {url!r} resolves to blocked address {ip} (network {net})"
                )


class LinkScraper:
    """Scraper for extracting link metadata and screenshots."""

    def __init__(self, settings: Settings, storage_service: ScreenshotStorageService):
        self.settings = settings
        self.storage_service = storage_service

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_not_exception_type(ValueError),
    )
    async def scrape_and_screenshot(
        self, url: str, stash_id: str, link_id: str
    ) -> dict[str, Any]:
        """Scrape metadata and take a screenshot in a single browser session."""
        validate_url(url)
        logger.info("Scraping link and taking screenshot", url=url)

        result: dict[str, Any] = {
            "url": url,
            "title": None,
            "description": None,
            "favicon_url": None,
            "page_content": None,
            "final_url": None,
            "screenshot_key": None,
            "screenshot_width": self.settings.screenshot_width,
            "screenshot_height": self.settings.screenshot_height,
        }

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.settings.playwright_headless)

            try:
                context = await browser.new_context(
                    viewport={
                        "width": self.settings.screenshot_width,
                        "height": self.settings.screenshot_height,
                    },
                )

                page = await context.new_page()

                # Single navigation — reused for both metadata and screenshot
                response = await page.goto(
                    url,
                    wait_until="load",
                    timeout=self.settings.playwright_timeout,
                )

                if response:
                    result["final_url"] = response.url

                # Extract metadata
                result["title"] = await page.title()

                description_elem = await page.query_selector('meta[name="description"]')
                if description_elem:
                    result["description"] = await description_elem.get_attribute("content")

                favicon_elem = await page.query_selector('link[rel*="icon"]')
                if favicon_elem:
                    favicon_href = await favicon_elem.get_attribute("href")
                    if favicon_href:
                        base = result["final_url"] or url
                        result["favicon_url"] = urljoin(base, favicon_href)

                html = await page.content()
                extracted = trafilatura.extract(html, include_comments=False, include_tables=True)
                if extracted and len(extracted.strip()) > 200:
                    result["page_content"] = extracted[: self.settings.max_content_length]
                    logger.debug("Page content extracted via trafilatura", url=url, length=len(result["page_content"]))
                else:
                    body_text = await page.evaluate("() => document.body.innerText")
                    result["page_content"] = body_text[: self.settings.max_content_length]
                    logger.debug("Page content extracted via innerText fallback", url=url, length=len(result["page_content"]))

                # Take screenshot on the same already-loaded page
                screenshot_bytes = await page.screenshot(type="png", full_page=False)
                key = f"screenshots/{stash_id}/{link_id}.png"
                await self.storage_service.upload(key, screenshot_bytes)
                result["screenshot_key"] = key

            finally:
                await context.close()
                await browser.close()

        logger.info(
            "Link scraped and screenshot taken",
            url=url,
            title=result["title"],
            screenshot_key=result["screenshot_key"],
        )

        return result

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_not_exception_type(ValueError),
    )
    async def take_screenshot(
        self, url: str, stash_id: str, link_id: str
    ) -> dict[str, Any]:
        """Take a screenshot of a URL (used for refresh-only events)."""
        validate_url(url)
        logger.info("Taking screenshot", url=url)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.settings.playwright_headless)

            try:
                context = await browser.new_context(
                    viewport={
                        "width": self.settings.screenshot_width,
                        "height": self.settings.screenshot_height,
                    },
                )

                page = await context.new_page()

                await page.goto(
                    url,
                    wait_until="load",
                    timeout=self.settings.playwright_timeout,
                )

                screenshot_bytes = await page.screenshot(type="png", full_page=False)

                key = f"screenshots/{stash_id}/{link_id}.png"
                await self.storage_service.upload(key, screenshot_bytes)

                result = {
                    "key": key,
                    "width": self.settings.screenshot_width,
                    "height": self.settings.screenshot_height,
                    "size": len(screenshot_bytes),
                }

                logger.info("Screenshot taken successfully", url=url, key=key)

                return result

            finally:
                await context.close()
                await browser.close()

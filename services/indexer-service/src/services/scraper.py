"""Web scraping service using Playwright."""

import hashlib
from typing import Any
from urllib.parse import urljoin

import structlog
from playwright.async_api import async_playwright
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config.settings import Settings
from src.services.storage_service import ScreenshotStorageService

logger = structlog.get_logger()


class LinkScraper:
    """Scraper for extracting link metadata and screenshots."""

    def __init__(self, settings: Settings, storage_service: ScreenshotStorageService):
        self.settings = settings
        self.storage_service = storage_service

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
    )
    async def scrape_and_screenshot(self, url: str) -> dict[str, Any]:
        """Scrape metadata and take a screenshot in a single browser session."""
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

                body_text = await page.evaluate("""() => {
                    return document.body.innerText.substring(0, 100000);
                }""")
                result["page_content"] = body_text[: self.settings.max_content_length]

                # Take screenshot on the same already-loaded page
                screenshot_bytes = await page.screenshot(type="png", full_page=False)
                url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
                key = f"screenshots/{url_hash}.png"
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
    )
    async def take_screenshot(self, url: str) -> dict[str, Any]:
        """Take a screenshot of a URL (used for refresh-only events)."""
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

                url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
                key = f"screenshots/{url_hash}.png"
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

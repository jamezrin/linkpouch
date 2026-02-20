"""Web scraping service using Playwright."""

import hashlib
from typing import Any

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
    async def scrape_link(self, url: str) -> dict[str, Any]:
        """Scrape metadata from a URL."""
        logger.info("Scraping link", url=url)
        
        result = {
            "url": url,
            "title": None,
            "description": None,
            "favicon_url": None,
            "page_content": None,
            "final_url": None,
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
                
                # Navigate to URL
                response = await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=self.settings.playwright_timeout,
                )
                
                if response:
                    result["final_url"] = response.url
                
                # Extract metadata
                result["title"] = await page.title()
                
                # Try to get meta description
                description_elem = await page.query_selector('meta[name="description"]')
                if description_elem:
                    result["description"] = await description_elem.get_attribute("content")
                
                # Try to get favicon
                favicon_elem = await page.query_selector('link[rel*="icon"]')
                if favicon_elem:
                    favicon_href = await favicon_elem.get_attribute("href")
                    if favicon_href:
                        result["favicon_url"] = favicon_href
                
                # Extract text content (limited)
                body_text = await page.evaluate("""() => {
                    return document.body.innerText.substring(0, 100000);
                }""")
                result["page_content"] = body_text[:self.settings.max_content_length]
                
            finally:
                await browser.close()
        
        logger.info(
            "Link scraped successfully",
            url=url,
            title=result["title"],
        )
        
        return result
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
    )
    async def take_screenshot(self, url: str) -> dict[str, Any]:
        """Take a screenshot of a URL."""
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
                
                # Navigate to URL
                await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=self.settings.playwright_timeout,
                )
                
                # Take screenshot
                screenshot_bytes = await page.screenshot(
                    type="png",
                    full_page=False,
                )

                # Generate key and upload to S3
                url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
                key = f"screenshots/{url_hash}.png"
                await self.storage_service.upload(key, screenshot_bytes)

                result = {
                    "key": key,
                    "width": self.settings.screenshot_width,
                    "height": self.settings.screenshot_height,
                    "size": len(screenshot_bytes),
                }
                
                logger.info(
                    "Screenshot taken successfully",
                    url=url,
                    key=key,
                )
                
                return result
                
            finally:
                await browser.close()

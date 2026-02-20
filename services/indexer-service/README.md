# Linkpouch Indexer Service

## Overview

Async link indexing service that consumes events from Redis Streams, scrapes web pages using Playwright, and generates screenshots.

## Features

- **Redis Streams Consumer**: Processes events asynchronously
- **Web Scraping**: Extracts metadata (title, description, content) using Playwright
- **Screenshots**: Generates page screenshots
- **Scalable**: Supports consumer groups for horizontal scaling

## Setup

### 1. Install Dependencies

```bash
# Using mise to manage Python 3.13
mise install

# Install dependencies
pip install -e ".[dev]"

# Install Playwright browsers
playwright install chromium
```

### 2. Configuration

Create `.env` file:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Playwright
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=linkpouch-screenshots
```

### 3. Run

```bash
# Development
uvicorn src.main:app --reload --port 8081

# Production
uvicorn src.main:app --host 0.0.0.0 --port 8081
```

## Architecture

### Event Processing

1. **Listen**: Consumer listens to Redis Streams
2. **Process**: Scrape metadata and take screenshots
3. **Ack**: Acknowledge message after processing
4. **Store**: Upload screenshots to S3/MinIO

### Streams

- `linkpouch:events:link` - Link indexing events
- `linkpouch:events:screenshot` - Screenshot refresh events

## API Endpoints

- `GET /` - Service info
- `GET /health` - Health check

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black src tests
ruff check src tests
mypy src
```

## Docker

```bash
# Build
docker build -t linkpouch-indexer .

# Run
docker run -p 8081:8081 --env-file .env linkpouch-indexer
```

"""
Suno Music Downloader Telegram Bot (Public, Unlisted & Private Support)
----------------------------------------------------------------------
A self-contained, asynchronous Telegram bot built with `python-telegram-bot` (v20+),
`httpx`, `beautifulsoup4`, and `python-dotenv`.

Features:
1. Listens for messages containing a Suno song URL (https://suno.com/song/... or /s/...).
2. Supports Public, Unlisted, and Private tracks via:
   - Authenticated Suno Studio API (using SUNO_COOKIE or SUNO_TOKEN from .env)
   - OpenGraph HTML metadata extraction (og:audio, og:title, og:image)
   - Direct Suno CDN UUID fallback (cdn1.suno.ai / cdn2.suno.ai)
3. Supports full package download (/full) including MP3, Video MP4, and Lyrics.
4. Supports full Playlist and batch URL downloads.
5. Includes a lightweight health-check server for cloud deployments (e.g., Render).

Requirements:
    pip install python-telegram-bot>=20.0 httpx beautifulsoup4 python-dotenv
"""

import io
import logging
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# Load environment variables from .env file if present
load_dotenv()

# ---------------------------------------------------------------------------
# Configuration & Logging
# ---------------------------------------------------------------------------

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN_HERE").strip()

# Optional credentials for accessing strictly private Suno tracks
SUNO_COOKIE = os.getenv("SUNO_COOKIE", "").strip()
SUNO_TOKEN = os.getenv("SUNO_TOKEN", "").strip()

# Telegram Bot API standard upload limit is 50 MB
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "48"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_BATCH_TRACKS = int(os.getenv("MAX_BATCH_TRACKS", "20"))

# Regex patterns for Suno URLs (songs, short links, and playlists) and UUIDs
SUNO_URL_PATTERN = re.compile(
    r"(https?://(?:www\.)?(?:suno\.com|suno\.ai)/(?:song|s|playlist)/[a-zA-Z0-9_-]+)"
)
SUNO_PLAYLIST_PATTERN = re.compile(
    r"https?://(?:www\.)?(?:suno\.com|suno\.ai)/playlist/([0-9a-f-]{36})",
    re.IGNORECASE,
)
UUID_PATTERN = re.compile(
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    re.IGNORECASE,
)

# Configure structured logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=getattr(logging, LOG_LEVEL, logging.INFO),
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper Functions & Metadata Extraction
# ---------------------------------------------------------------------------


def sanitize_filename(name: str) -> str:
    """Removes characters that are invalid in filenames and limits length."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    return cleaned[:100] if cleaned else "suno_track"


def extract_uuid(text: str) -> Optional[str]:
    """Extracts a standard Suno song UUID from a URL or string if present."""
    match = UUID_PATTERN.search(text)
    return match.group(1) if match else None


def build_suno_headers() -> Dict[str, str]:
    """Builds HTTP request headers, including optional authentication for private tracks."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    if SUNO_COOKIE:
        headers["Cookie"] = SUNO_COOKIE
    if SUNO_TOKEN:
        token = (
            SUNO_TOKEN
            if SUNO_TOKEN.startswith("Bearer ")
            else f"Bearer {SUNO_TOKEN}"
        )
        headers["Authorization"] = token
    return headers


async def fetch_from_suno_api(
    client: httpx.AsyncClient, song_id: str, headers: Dict[str, str]
) -> Optional[Dict[str, Optional[str]]]:
    """
    Attempts to fetch full clip metadata (audio, video, cover, lyrics, tags)
    from Suno's Studio API endpoints (works for public & authenticated private tracks).
    """
    api_endpoints = [
        f"https://studio-api.prod.suno.com/api/clip/{song_id}",
        f"https://studio-api.suno.ai/api/clip/{song_id}",
    ]
    for api_url in api_endpoints:
        try:
            resp = await client.get(api_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                meta = data.get("metadata") or {}
                audio_url = (
                    data.get("audio_url") or f"https://cdn1.suno.ai/{song_id}.mp3"
                )
                video_url = (
                    data.get("video_url") or f"https://cdn1.suno.ai/{song_id}.mp4"
                )
                title = (data.get("title") or "").strip() or f"Suno Track ({song_id[:8]})"
                image_url = data.get("image_large_url") or data.get("image_url")
                lyrics = (meta.get("prompt") or "").strip()
                tags = (meta.get("tags") or "").strip()
                return {
                    "id": song_id,
                    "title": title,
                    "audio_url": audio_url,
                    "video_url": video_url,
                    "image_url": image_url,
                    "lyrics": lyrics,
                    "tags": tags,
                }
        except Exception as exc:
            logger.debug("API lookup failed for %s: %s", api_url, exc)
    return None


async def fetch_playlist_urls(playlist_id: str) -> List[str]:
    """Fetches all song URLs contained inside a public or private Suno playlist."""
    headers = build_suno_headers()
    endpoints = [
        f"https://studio-api.prod.suno.com/api/playlist/{playlist_id}/?page=1",
        f"https://studio-api.suno.ai/api/playlist/{playlist_id}/?page=1",
    ]
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            for endpoint in endpoints:
                resp = await client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    clips = data.get("playlist_clips") or []
                    song_urls: List[str] = []
                    for item in clips:
                        clip = item.get("clip") if isinstance(item, dict) else None
                        clip_id = clip.get("id") if clip else None
                        if clip_id:
                            song_urls.append(f"https://suno.com/song/{clip_id}")
                    if song_urls:
                        return song_urls[:MAX_BATCH_TRACKS]
    except Exception as exc:
        logger.error("Failed to fetch playlist %s: %s", playlist_id, exc)
    return []


async def fetch_suno_metadata(url: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Resolves a Suno URL (public, unlisted, or private) and extracts track metadata
    using:
      1. Authenticated / Public Suno Studio API
      2. OpenGraph HTML tags (og:audio, og:title, og:image)
      3. Direct Suno CDN UUID fallback
    """
    headers = build_suno_headers()
    initial_uuid = extract_uuid(url)

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            # Step 1: Try Suno Studio API directly if UUID is already known
            if initial_uuid:
                api_meta = await fetch_from_suno_api(client, initial_uuid, headers)
                if api_meta:
                    return api_meta

            # Step 2: Fetch the web page (also resolves /s/<short_id> redirects)
            response = await client.get(url, headers=headers)
            resolved_url = str(response.url)
            resolved_uuid = extract_uuid(resolved_url) or initial_uuid

            # Retry Studio API if redirect revealed the full UUID
            if resolved_uuid and resolved_uuid != initial_uuid:
                api_meta = await fetch_from_suno_api(client, resolved_uuid, headers)
                if api_meta:
                    return api_meta

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                og_audio = soup.find("meta", property="og:audio")
                og_title = soup.find("meta", property="og:title")
                og_image = soup.find("meta", property="og:image")

                audio_url = (
                    og_audio["content"].strip()
                    if og_audio and og_audio.get("content")
                    else None
                )

                raw_title = (
                    og_title["content"].strip()
                    if og_title and og_title.get("content")
                    else ""
                )
                clean_title = re.sub(
                    r"\s*\|\s*Suno\s*$", "", raw_title, flags=re.IGNORECASE
                ).strip()

                image_url = (
                    og_image["content"].strip()
                    if og_image and og_image.get("content")
                    else None
                )

                if audio_url:
                    return {
                        "id": resolved_uuid,
                        "title": clean_title or "Suno AI Track",
                        "audio_url": audio_url,
                        "video_url": (
                            f"https://cdn1.suno.ai/{resolved_uuid}.mp4"
                            if resolved_uuid
                            else None
                        ),
                        "image_url": image_url,
                        "lyrics": "",
                        "tags": "",
                    }

            # Step 3: Direct CDN fallback for unlisted/private tracks where HTML hides metadata
            if resolved_uuid:
                logger.info("Using direct CDN fallback for UUID: %s", resolved_uuid)
                return {
                    "id": resolved_uuid,
                    "title": f"Suno Track ({resolved_uuid[:8]})",
                    "audio_url": f"https://cdn1.suno.ai/{resolved_uuid}.mp3",
                    "video_url": f"https://cdn1.suno.ai/{resolved_uuid}.mp4",
                    "image_url": f"https://cdn2.suno.ai/image_{resolved_uuid}.jpeg",
                    "lyrics": "",
                    "tags": "",
                }

    except httpx.RequestError as exc:
        logger.error("Network error while fetching Suno page (%s): %s", url, exc)
        if initial_uuid:
            return {
                "id": initial_uuid,
                "title": f"Suno Track ({initial_uuid[:8]})",
                "audio_url": f"https://cdn1.suno.ai/{initial_uuid}.mp3",
                "video_url": f"https://cdn1.suno.ai/{initial_uuid}.mp4",
                "image_url": f"https://cdn2.suno.ai/image_{initial_uuid}.jpeg",
                "lyrics": "",
                "tags": "",
            }
    except Exception as exc:
        logger.exception("Unexpected error parsing Suno page (%s): %s", url, exc)

    return None


async def download_binary(url: str) -> Optional[io.BytesIO]:
    """
    Streams a binary file (audio or cover image) into an in-memory BytesIO buffer
    while enforcing the maximum allowed file size.
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()

                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > MAX_FILE_SIZE_BYTES:
                    logger.warning("File exceeds size limit: %s bytes", content_length)
                    return None

                buffer = io.BytesIO()
                downloaded = 0

                async for chunk in response.aiter_bytes(chunk_size=65536):
                    downloaded += len(chunk)
                    if downloaded > MAX_FILE_SIZE_BYTES:
                        logger.warning("Stream exceeded size limit during download.")
                        return None
                    buffer.write(chunk)

                buffer.seek(0)
                return buffer

    except Exception as exc:
        logger.error("Failed to download binary from %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Application Entry Point & Render Health Check
# ---------------------------------------------------------------------------


class HealthCheckHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler so Render Web Services detect an open port."""

    def do_GET(self) -> None:
        self.send_response(200)
        self.send_header("Content-type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"Suno Telegram Bot is running.")

    def log_message(self, format: str, *args: object) -> None:
        return  # Suppress noisy health-check access logs


def start_health_server() -> None:
    """Starts a background HTTP server if the PORT environment variable is set."""
    port_str = os.getenv("PORT", "").strip()
    if not port_str.isdigit():
        return
    port = int(port_str)
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("Health check HTTP server listening on port %d", port)


def main() -> None:
    """Initializes and starts the Telegram bot using long polling."""
    if not BOT_TOKEN or BOT_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN_HERE":
        raise ValueError(
            "សូមកំណត់ TELEGRAM_BOT_TOKEN របស់អ្នកនៅក្នុងឯកសារ .env ឬ Render Environment Variables ជាមុនសិន!"
        )

    start_health_server()

    application = Application.builder().token(BOT_TOKEN).build()

    # Register command and message handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("full", full_command))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    logger.info("Bot is running and polling for updates...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()

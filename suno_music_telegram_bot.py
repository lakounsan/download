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
3. Validates file size against Telegram's 50 MB bot upload limit.
4. Sends the MP3 audio file back to the user with title, performer, and cover art thumbnail.

Requirements:
    pip install python-telegram-bot>=20.0 httpx beautifulsoup4 python-dotenv
"""
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
# Telegram Command & Message Handlers
# ---------------------------------------------------------------------------


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the /start command."""
    if not update.message:
        return
    welcome_text = (
        "👋 *សូមស្វាគមន៍មកកាន់ Suno Music Downloader Bot!*\n\n"
        "🎵 *មុខងារទាញយកពេញលេញ (Full Download)៖*\n"
        "• ផ្ញើតំណភ្ជាប់ចម្រៀង (`/song/...` ឬ `/s/...`) ដើម្បីទាញយក MP3 ពេញ\n"
        "• ប្រើ `/full <link>` ដើម្បីទាញយកទាំង *MP3 + Video MP4 + អត្ថបទចម្រៀង (Lyrics)*\n"
        "• ផ្ញើតំណភ្ជាប់ *Playlist* (`/playlist/...`) ឬតំណភ្ជាប់ច្រើនបទព្រមគ្នា\n"
        "• គាំទ្រទាំងចម្រៀង *Public*, *Unlisted* និង *Private*"
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the /help command."""
    if not update.message:
        return
    help_text = (
        "ℹ️ *របៀបប្រើប្រាស់ Bot៖*\n"
        "1. **ទាញយកបទចម្រៀងធម្មតា៖** ផ្ញើតំណភ្ជាប់ `https://suno.com/song/...`\n"
        "2. **ទាញយកពេញឈុត (Full Package)៖** វាយ `/full https://suno.com/song/...` ដើម្បីទទួលបាន MP3, Video MP4 និង Lyrics\n"
        "3. **ទាញយក Playlist ទាំងមូល៖** ផ្ញើតំណភ្ជាប់ `https://suno.com/playlist/...`\n\n"
        "🔐 *សម្រាប់ចម្រៀង Private តឹងរ៉ឹង៖*\n"
        "កំណត់ `SUNO_COOKIE` ឬ `SUNO_TOKEN` នៅក្នុងឯកសារ `.env`។"
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")


async def process_single_track(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    suno_url: str,
    full_package: bool = False,
) -> bool:
    """Downloads and sends a single Suno track (and optionally its video + lyrics)."""
    if not update.message:
        return False

    status_msg = await update.message.reply_text(
        f"🔍 កំពុងស្វែងរកព័ត៌មានចម្រៀង...\n`{suno_url}`",
        parse_mode="Markdown",
    )

    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id, action=ChatAction.UPLOAD_VOICE
    )

    metadata = await fetch_suno_metadata(suno_url)
    if not metadata or not metadata.get("audio_url"):
        await status_msg.edit_text(
            f"❌ មិនអាចទាញយកចម្រៀងពីតំណភ្ជាប់នេះបានទេ៖\n`{suno_url}`",
            parse_mode="Markdown",
        )
        return False

    title = metadata["title"] or "Suno AI Track"
    audio_url = metadata["audio_url"]
    video_url = metadata.get("video_url")
    image_url = metadata.get("image_url")
    lyrics = metadata.get("lyrics") or ""
    tags = metadata.get("tags") or ""

    await status_msg.edit_text(f"⬇️ កំពុងទាញយកបទពេញ *{title}*...", parse_mode="Markdown")

    audio_buffer = await download_binary(audio_url)
    if not audio_buffer:
        await status_msg.edit_text(
            f"❌ បរាជ័យក្នុងការទាញយកសំឡេងបទ *{title}* (ទំហំអាចលើសពី {MAX_FILE_SIZE_MB}MB)។",
            parse_mode="Markdown",
        )
        return False

    thumb_buffer = await download_binary(image_url) if image_url else None
    safe_name = sanitize_filename(title)

    caption_lines = [f"🎵 *{title}*"]
    if tags:
        caption_lines.append(f"🏷 Style: `{tags[:120]}`")
    caption_lines.append(f"🔗 [តំណភ្ជាប់ដើម]({suno_url})")

    try:
        await update.message.reply_audio(
            audio=audio_buffer,
            filename=f"{safe_name}.mp3",
            title=title,
            performer="Suno AI",
            thumbnail=thumb_buffer,
            caption="\n".join(caption_lines),
            parse_mode="Markdown",
        )

        # If /full mode is requested, also download & send Video MP4 and full Lyrics
        if full_package:
            if video_url:
                await status_msg.edit_text(
                    f"🎬 កំពុងទាញយកវីដេអូ MP4 សម្រាប់បទ *{title}*...",
                    parse_mode="Markdown",
                )
                video_buffer = await download_binary(video_url)
                if video_buffer:
                    await update.message.reply_video(
                        video=video_buffer,
                        filename=f"{safe_name}.mp4",
                        caption=f"🎬 *{title}* (Full Video)",
                        parse_mode="Markdown",
                    )

            if lyrics:
                lyrics_text = f"📜 *អត្ថបទចម្រៀង (Lyrics) - {title}:*\n\n{lyrics}"
                # Telegram text message limit is 4096 characters
                for i in range(0, len(lyrics_text), 4000):
                    await update.message.reply_text(lyrics_text[i : i + 4000])

        await status_msg.delete()
        return True
    except Exception as exc:
        logger.error("Error sending media via Telegram: %s", exc)
        await status_msg.edit_text("❌ មានបញ្ហាក្នុងការផ្ញើឯកសារទៅកាន់ Telegram។")
        return False


async def full_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /full <url> command to download MP3 + Video MP4 + Lyrics."""
    if not update.message:
        return

    raw_text = " ".join(context.args) if context.args else ""
    urls = SUNO_URL_PATTERN.findall(raw_text)
    if not urls:
        await update.message.reply_text(
            "⚠️ សូមភ្ជាប់តំណភ្ជាប់ Suno ជាមួយពាក្យបញ្ជា `/full`\n"
            "ឧទាហរណ៍៖ `/full https://suno.com/song/...`",
            parse_mode="Markdown",
        )
        return

    await handle_urls_batch(update, context, urls, full_package=True)


async def handle_urls_batch(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    raw_urls: List[str],
    full_package: bool = False,
) -> None:
    """Expands playlist URLs and processes one or multiple Suno song URLs."""
    if not update.message:
        return

    expanded_urls: List[str] = []
    for url in raw_urls:
        playlist_match = SUNO_PLAYLIST_PATTERN.search(url)
        if playlist_match:
            playlist_id = playlist_match.group(1)
            info_msg = await update.message.reply_text(
                "📂 កំពុងទាញយកបញ្ជីចម្រៀងពី Playlist..."
            )
            playlist_songs = await fetch_playlist_urls(playlist_id)
            await info_msg.delete()
            if playlist_songs:
                expanded_urls.extend(playlist_songs)
            else:
                await update.message.reply_text(
                    "⚠️ មិនអាចទាញយកចម្រៀងពី Playlist នេះបានទេ (សូមពិនិត្យមើលថា Playlist ជា Public ឬបានដាក់ `SUNO_COOKIE`)។",
                    parse_mode="Markdown",
                )
        else:
            expanded_urls.append(url)

    # Deduplicate while preserving order
    unique_urls = list(dict.fromkeys(expanded_urls))[:MAX_BATCH_TRACKS]
    if not unique_urls:
        return

    if len(unique_urls) > 1:
        await update.message.reply_text(
            f"🎶 រកឃើញចម្រៀងចំនួន *{len(unique_urls)}* បទ។ កំពុងចាប់ផ្តើមទាញយកទាំងអស់...",
            parse_mode="Markdown",
        )

    for song_url in unique_urls:
        await process_single_track(update, context, song_url, full_package=full_package)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Scans incoming text messages for one or more Suno URLs (songs or playlists)."""
    if not update.message or not update.message.text:
        return

    urls = SUNO_URL_PATTERN.findall(update.message.text)
    if not urls:
        await update.message.reply_text(
            "⚠️ សូមផ្ញើតំណភ្ជាប់ចម្រៀង ឬ Playlist ពី Suno ដែលត្រឹមត្រូវ "
            "(ឧទាហរណ៍៖ `https://suno.com/song/...`)។",
            parse_mode="Markdown",
        )
        return

    await handle_urls_batch(update, context, urls, full_package=False)


# ---------------------------------------------------------------------------
# Application Entry Point
# ---------------------------------------------------------------------------


def main() -> None:
    """Initializes and starts the Telegram bot using long polling."""
    if not BOT_TOKEN or BOT_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN_HERE":
        raise ValueError(
            "សូមកំណត់ TELEGRAM_BOT_TOKEN របស់អ្នកនៅក្នុងឯកសារ .env ជាមុនសិន!"
        )

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

#!/usr/bin/env python3
# =====================================================
# ថ្នាក់មូលដ្ឋាន — gen_audio.py
# Generates all lesson speech audio (MP3) into
# app/assets/audio/ using edge-tts (Microsoft neural voices).
#
# Input : scripts/audio_list.json  (from gen_audio_list.js)
# Output: app/assets/audio/km/*.mp3, app/assets/audio/en/*.mp3
#
# Usage: python3 scripts/gen_audio.py [--force]
# =====================================================
import asyncio
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIST = os.path.join(HERE, "audio_list.json")
OUT = os.path.join(ROOT, "app", "assets", "audio")

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed — run: pip install edge-tts")
    sys.exit(1)

FORCE = "--force" in sys.argv
CONCURRENCY = 4
RETRIES = 3
MIN_BYTES = 800  # reject empty/error responses


async def gen_one(sem, item, voices, idx, total):
    rel = item["f"]
    text = item["t"]
    voice = voices.get(item["v"], item["v"])
    dest = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)

    if not FORCE and os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES:
        return None  # already done (idempotent resume)

    async with sem:
        for attempt in range(1, RETRIES + 1):
            try:
                # slower rate for children's clarity
                tts = edge_tts.Communicate(text, voice, rate="-10%")
                tmp = dest + ".tmp"
                await tts.save(tmp)
                if os.path.getsize(tmp) < MIN_BYTES:
                    raise RuntimeError("file too small")
                os.replace(tmp, dest)
                return rel
            except Exception as e:
                if os.path.exists(dest + ".tmp"):
                    try:
                        os.remove(dest + ".tmp")
                    except OSError:
                        pass
                if attempt == RETRIES:
                    print(f"FAIL {rel}: {e}")
                    return rel
                await asyncio.sleep(1.5 * attempt)


async def main():
    data = json.load(open(LIST, encoding="utf-8"))
    items = data["items"]

    # verify English voice exists, else fall back
    voices = {data["voiceKm"]: "km-KH-SreymomNeural", data["voiceEn"]: data["voiceEn"]}
    try:
        all_voices = await edge_tts.list_voices()
        names = {v["ShortName"] for v in all_voices}
        if data["voiceEn"] not in names:
            for cand in ("en-US-JennyNeural", "en-US-AriaNeural"):
                if cand in names:
                    voices[data["voiceEn"]] = cand
                    print(f"NOTE: {data['voiceEn']} unavailable, using {cand}")
                    break
        if "km-KH-SreymomNeural" not in names:
            print("ERROR: Khmer voice km-KH-SreymomNeural not available")
            sys.exit(1)
    except Exception as e:
        print(f"WARN: could not list voices ({e}); continuing with defaults")

    # skip already-generated files unless --force
    todo = []
    for it in items:
        dest = os.path.join(OUT, it["f"])
        if FORCE or not (os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES):
            todo.append(it)
    print(f"Total {len(items)} files | to generate: {len(todo)} | skipped: {len(items) - len(todo)}")

    if todo:
        sem = asyncio.Semaphore(CONCURRENCY)
        results = await asyncio.gather(*[gen_one(sem, it, voices, i, len(todo)) for i, it in enumerate(todo)])
        failed = [r for r in results if r]
        # retry failures once more, sequentially (rate-limit friendliness)
        if failed:
            print(f"Retrying {len(failed)} failed files sequentially...")
            for rel in list(failed):
                it = next(x for x in todo if x["f"] == rel)
                r = await gen_one(asyncio.Semaphore(1), it, voices, 0, 1)
                if r:
                    print(f"STILL FAILING: {r}")
                else:
                    failed.remove(rel)

        missing = []
        for it in items:
            dest = os.path.join(OUT, it["f"])
            if not (os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES):
                missing.append(it["f"])
        if missing:
            print(f"MISSING ({len(missing)}): {missing[:10]}...")
            sys.exit(2)

    total_size = sum(os.path.getsize(os.path.join(OUT, it["f"])) for it in items)
    print(f"OK — all {len(items)} audio files present ({total_size / 1024:.0f} KB)")


if __name__ == "__main__":
    asyncio.run(main())

"""
Free, local call-recording transcription using faster-whisper.

No external API, no per-minute cost, no cloud service to provision — this
runs entirely on this machine. faster-whisper (CTranslate2) is the fast
reimplementation of OpenAI's open-weights Whisper model.

Why local instead of inside the app: the Node backend (plot-management-node)
deploys to Vercel as a serverless function, which can't run a persistent
Python process, has no GPU, and has deployment-size/execution-time limits
that rule out loading a Whisper model in-process. This script is the
free/easy alternative: run it yourself, on your own schedule, and it writes
real transcripts straight into the same MongoDB Atlas database the app
already reads from — the existing /CallLogs/getIvrCallLogs endpoint picks
them up automatically, no backend change needed beyond the schema field
already added in models/masterModels/IvrLog.js.

Usage:
    pip install faster-whisper pymongo requests
    python scripts/transcribe_calls.py --limit 10
    python scripts/transcribe_calls.py --limit 50 --model small

Re-running is safe — it only ever picks up calls that don't have a
transcript yet, so you can run this on a schedule (Task Scheduler / cron)
to keep transcribing new calls as they come in.
"""

import argparse
import os
import sys
import tempfile

# Windows terminals often default to a legacy codepage (cp1252) that can't
# print real transcript text — Indian-language calls routinely come back in
# Tamil/Hindi/etc. script. Force UTF-8 for stdout so a print() never crashes
# the run partway through (which, worse, happened *after* a successful
# MongoDB write — the transcript was saved but the run looked like it failed).
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Hugging Face's model cache symlinks files by default, which Windows
# refuses without Developer Mode or admin rights — must be set before
# faster_whisper (which imports huggingface_hub) is imported below, or it
# has no effect. Without this, downloading anything bigger than "base" fails
# outright on a stock Windows account.
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")

from datetime import datetime, timezone
from pathlib import Path

import requests
from pymongo import MongoClient

MONGO_URI = (
    "mongodb+srv://restore_admin:enisdevteam123@enistechteam.owwtldg.mongodb.net/"
    "plot-management?retryWrites=true&w=majority&appName=PlotManagement"
)

# Tested against real Tamil calls in this database: "base" produces
# plausible-looking but incomplete text, and "small" was actually worse
# despite reporting 100% language confidence (it transcribed a real pricing
# conversation as just "Thank you. Thank you. Thank you."). "medium" was the
# first size that reliably captured full sentences and correct numbers
# (prices quoted in the call). Since most calls here are Tamil, "medium" is
# the honest free/easy default — slower per call (~1.5GB one-time download,
# more CPU time) but the smaller models were not usable for this content.
# Override with --model if you want to trade accuracy for speed.
DEFAULT_MODEL = "medium"


def fetch_pending_calls(db, limit):
    # Newest first — recent calls are both the ones you actually care about
    # and the ones most likely to still be reachable (very old recordings
    # can end up on a since-decommissioned storage host).
    return list(
        db.ivrlogs.find(
            {
                # A few records have call_recording set to "" rather than
                # unset — $nin catches both that and missing/null.
                "call_recording": {"$nin": [None, ""]},
                "$or": [{"transcript": None}, {"transcript": {"$exists": False}}],
            }
        )
        .sort("_id", -1)
        .limit(limit)
    )


def download_recording(url, dest_path):
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    dest_path.write_bytes(response.content)


def main():
    parser = argparse.ArgumentParser(description="Transcribe IVR call recordings for free, locally, via faster-whisper.")
    parser.add_argument("--limit", type=int, default=10, help="Max number of untranscribed calls to process this run (default: 10)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Whisper model size: tiny/base/small/medium/large-v3 (default: base)")
    args = parser.parse_args()

    print(f"Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client.get_database("plot-management")

    calls = fetch_pending_calls(db, args.limit)
    if not calls:
        print("No untranscribed calls with a recording found — nothing to do.")
        return

    print(f"Found {len(calls)} call(s) to transcribe. Loading faster-whisper model '{args.model}' (first run downloads it, then it's cached)...")

    # Lazy import so --help doesn't pay the (slow) import cost of loading
    # faster-whisper's dependency chain just to print usage.
    from faster_whisper import WhisperModel

    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    processed, failed = 0, 0
    with tempfile.TemporaryDirectory() as tmp_dir:
        for call in calls:
            call_id = call["_id"]
            url = call.get("call_recording")
            label = call.get("callid", str(call_id))
            print(f"\n[{label}] downloading recording...")
            try:
                audio_path = Path(tmp_dir) / f"{call_id}.mp3"
                download_recording(url, audio_path)

                print(f"[{label}] transcribing...")
                segments, info = model.transcribe(str(audio_path), beam_size=5)
                text = " ".join(segment.text.strip() for segment in segments).strip()

                if not text:
                    print(f"[{label}] no speech detected — skipping write.")
                    continue

                db.ivrlogs.update_one(
                    {"_id": call_id},
                    {
                        "$set": {
                            "transcript": text,
                            "transcriptLanguage": info.language,
                            "transcribedAt": datetime.now(timezone.utc),
                        }
                    },
                )
                preview = text[:120] + ("..." if len(text) > 120 else "")
                print(f"[{label}] done ({info.language}, {info.language_probability:.0%} confidence): \"{preview}\"")
                processed += 1
            except Exception as error:  # noqa: BLE001 - one bad call shouldn't abort the batch
                print(f"[{label}] FAILED: {error}")
                failed += 1

    print(f"\nDone. Transcribed {processed}, failed {failed}, out of {len(calls)} attempted.")
    client.close()


if __name__ == "__main__":
    sys.exit(main())

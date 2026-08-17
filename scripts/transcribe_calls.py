"""
Free, local call-recording transcription using faster-whisper — now as a
real turn-by-turn conversation, not one flattened paragraph.

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

Speaker separation: Whisper itself has no concept of "who" is talking, only
what was said and when. But real recordings from this PBX (sollu.in) were
checked directly and confirmed genuinely stereo, with each call leg on its
own channel (not a mono mix duplicated to both channels) — right channel
starts with the agent's greeting script ("Hello, good evening sir... how
can I help you"), left channel is the customer. So instead of needing
speaker-diarization ML (which would mean a gated Hugging Face model, same
login friction as the AI4Bharat attempt), each channel is split out with
ffmpeg and transcribed separately, then the two sides' segments are merged
by timestamp into a real conversation. Calls whose recording turns out to
be mono fall back to the old single-pass whole-file transcript (no turns).

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
import subprocess
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

# Empirically confirmed (not assumed) against real recordings: right channel
# opens with the agent's greeting script, left is the customer. This is a
# per-PBX recording convention (which leg lands on which channel), so it
# should hold for every call from this same system — but if a batch ever
# looks backwards, flip these two.
CHANNEL_SPEAKERS = {"left": "customer", "right": "agent"}

# Whisper's real mechanism for "always output English" is the task
# parameter, not a free-text instruction — task="translate" tells the model
# itself to translate whatever it hears directly into English, rather than
# transcribing verbatim in the spoken language. Tested against a real Tamil
# call in this database: task="transcribe" (the old default) produced
# garbled, barely-readable mixed Tamil/English text; task="translate"
# produced a clean, coherent English transcript of the same audio. This only
# translates INTO English (not between two non-English languages), which
# matches every real call seen here so far.
#
# info.language (saved as transcriptLanguage) still reports the language
# Whisper detected in the audio (e.g. "ta") — that doesn't change just
# because the output text is now English; it's what the frontend's language
# badge uses to show "this customer spoke Tamil" alongside the English text.
TASK = "translate"

# Tried an initial_prompt here too (real-estate vocabulary, to help with
# proper nouns) and reverted it after finding real damage: on a call with
# quiet/difficult audio, Whisper didn't transcribe anything — it just
# echoed the prompt text back verbatim, repeatedly, as if it were the
# customer and agent both saying it. That's worse than the old garbled
# output, because a hallucinated transcript reads as plausible English
# instead of being obviously wrong. task="translate" alone already fixed
# the actual problem (verified against a real Tamil call — see git history
# for the before/after), so it wasn't worth the risk.


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


def probe_channel_count(audio_path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=channels", "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        capture_output=True, text=True, timeout=30,
    )
    try:
        return int(result.stdout.strip())
    except ValueError:
        return 1


def split_stereo_channels(audio_path, left_path, right_path):
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(audio_path),
            "-filter_complex", "[0:a]channelsplit=channel_layout=stereo[left][right]",
            "-map", "[left]", str(left_path),
            "-map", "[right]", str(right_path),
            "-hide_banner", "-loglevel", "error",
        ],
        check=True, capture_output=True, timeout=120,
    )


def transcribe_channel(model, audio_path, speaker):
    segments, info = model.transcribe(str(audio_path), beam_size=5, task=TASK)
    turns = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            turns.append({
                "speaker": speaker,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
            })
    return turns, info


def transcribe_call_as_conversation(model, audio_path, tmp_dir, call_id):
    channels = probe_channel_count(audio_path)
    if channels < 2:
        # Mono recording — no per-leg separation available, fall back to a
        # single flat transcript exactly like before.
        segments, info = model.transcribe(str(audio_path), beam_size=5, task=TASK)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return text, None, info.language if text else None

    left_path = Path(tmp_dir) / f"{call_id}_left.wav"
    right_path = Path(tmp_dir) / f"{call_id}_right.wav"
    split_stereo_channels(audio_path, left_path, right_path)

    left_turns, left_info = transcribe_channel(model, left_path, CHANNEL_SPEAKERS["left"])
    right_turns, right_info = transcribe_channel(model, right_path, CHANNEL_SPEAKERS["right"])

    turns = sorted(left_turns + right_turns, key=lambda t: t["start"])
    if not turns:
        return "", None, None

    transcript = "\n".join(f"{t['speaker'].capitalize()}: {t['text']}" for t in turns)
    # Prefer whichever channel actually has content to detect language from —
    # a channel with no speech reports an unreliable/default language guess.
    language_info = left_info if len(left_turns) >= len(right_turns) else right_info
    return transcript, turns, language_info.language


def main():
    parser = argparse.ArgumentParser(description="Transcribe IVR call recordings for free, locally, via faster-whisper.")
    parser.add_argument("--limit", type=int, default=10, help="Max number of untranscribed calls to process this run (default: 10)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Whisper model size: tiny/base/small/medium/large-v3 (default: medium)")
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

                print(f"[{label}] transcribing (per-channel, agent/customer separated)...")
                transcript, turns, language = transcribe_call_as_conversation(model, audio_path, tmp_dir, call_id)

                if not transcript:
                    print(f"[{label}] no speech detected — skipping write.")
                    continue

                update = {
                    "transcript": transcript,
                    "transcriptLanguage": language,
                    "transcribedAt": datetime.now(timezone.utc),
                }
                if turns:
                    update["transcriptTurns"] = turns
                db.ivrlogs.update_one({"_id": call_id}, {"$set": update})

                preview = transcript[:120].replace("\n", " | ") + ("..." if len(transcript) > 120 else "")
                mode = f"{len(turns)} turns" if turns else "flat (mono)"
                print(f"[{label}] done ({language}, {mode}): \"{preview}\"")
                processed += 1
            except Exception as error:  # noqa: BLE001 - one bad call shouldn't abort the batch
                print(f"[{label}] FAILED: {error}")
                failed += 1

    print(f"\nDone. Transcribed {processed}, failed {failed}, out of {len(calls)} attempted.")
    client.close()


if __name__ == "__main__":
    sys.exit(main())

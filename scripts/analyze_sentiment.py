"""
Real call sentiment + summary, via a cheap hosted LLM (Groq) — not a free
local classifier. Tested three free local multilingual sentiment models
against real transcripts first (base/multilingual XLM-RoBERTa variants,
an nlptown star-rating model); none produced reliable signal on this
content — confidence scores barely above chance, and labels didn't track
real tone. A real LLM handles noisy, code-switched Tamil/Hindi/English
conversational text far better, and Groq's free tier + very low per-token
pricing keeps this "cost efficient" in practice for this call volume.

Usage:
    pip install requests python-dotenv
    # GROQ_API_KEY must be set in plot-management-node/.env
    python scripts/analyze_sentiment.py --limit 10

Re-running is safe — only processes transcribed calls that don't have a
sentiment yet.
"""

import argparse
import json
import os
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGO_URI = (
    "mongodb+srv://restore_admin:enisdevteam123@enistechteam.owwtldg.mongodb.net/"
    "plot-management?retryWrites=true&w=majority&appName=PlotManagement"
)

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You analyze real estate sales call transcripts for a CRM. The transcript may be in "
    "Tamil, Hindi, English, or a mix (it was machine-transcribed and may contain minor "
    "errors). Respond ONLY with a JSON object, no other text, with exactly these fields:\n"
    '{"sentiment": "positive" | "neutral" | "negative", '
    '"reason": "<one short sentence in English explaining the sentiment>", '
    '"summary": "<one short sentence in English summarizing what the call was about, '
    "including any concrete details mentioned like budget, site, or next steps>\"}"
)


def fetch_pending_calls(db, limit):
    return list(
        db.ivrlogs.find(
            {
                "transcript": {"$nin": [None, ""]},
                "$or": [{"sentiment": None}, {"sentiment": {"$exists": False}}],
            }
        )
        .sort("_id", -1)
        .limit(limit)
    )


def analyze(api_key, transcript):
    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript[:3000]},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=30,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return json.loads(content)


def main():
    parser = argparse.ArgumentParser(description="Analyze call transcript sentiment via Groq (cheap hosted LLM).")
    parser.add_argument("--limit", type=int, default=10, help="Max number of calls to analyze this run (default: 10)")
    args = parser.parse_args()

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not set — add it to plot-management-node/.env")
        sys.exit(1)

    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client.get_database("plot-management")

    calls = fetch_pending_calls(db, args.limit)
    if not calls:
        print("No transcribed-but-unanalyzed calls found — nothing to do.")
        return

    print(f"Found {len(calls)} call(s) to analyze via Groq ({GROQ_MODEL}).")

    processed, failed = 0, 0
    for call in calls:
        label = call.get("callid", str(call["_id"]))
        print(f"\n[{label}] analyzing...")
        try:
            result = analyze(api_key, call["transcript"])
            sentiment = result.get("sentiment", "neutral")
            if sentiment not in ("positive", "neutral", "negative"):
                sentiment = "neutral"

            db.ivrlogs.update_one(
                {"_id": call["_id"]},
                {
                    "$set": {
                        "sentiment": sentiment,
                        "sentimentReason": result.get("reason", ""),
                        "summary": result.get("summary", ""),
                    }
                },
            )
            print(f"[{label}] {sentiment} — {result.get('reason', '')}")
            print(f"[{label}] summary: {result.get('summary', '')}")
            processed += 1
        except Exception as error:  # noqa: BLE001 - one bad call shouldn't abort the batch
            print(f"[{label}] FAILED: {error}")
            failed += 1

    print(f"\nDone. Analyzed {processed}, failed {failed}, out of {len(calls)} attempted.")
    client.close()


if __name__ == "__main__":
    sys.exit(main())

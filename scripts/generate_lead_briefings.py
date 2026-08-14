"""
Real per-lead priority briefing via Groq (cheap hosted LLM) — reads a lead's
actual activity (leadHistory + recent real WhatsApp messages) and writes one
short, actionable note for the assigned rep: why this lead matters right
now, and what to do next. Same provider and "free/cheap hosted LLM, local
script, writes straight into MongoDB" pattern as scripts/analyze_sentiment.py
— originally built on Gemini's free tier, migrated here to consolidate on
one LLM provider (Gemini needed a non-obvious thinkingConfig fix to stop
silently truncating output, plus manual rate-limit throttling; Groq has
needed neither for the same shape of task on this same data).

Usage:
    pip install requests python-dotenv
    # GROQ_API_KEY must be set in plot-management-node/.env
    python scripts/generate_lead_briefings.py --limit 20

Re-running is safe — only regenerates a briefing when the lead has had real
activity (any field change, e.g. a new leadHistory entry) since the last
briefing was generated. See fetch_pending_leads.
"""

import argparse
import os
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGO_URI = (
    "mongodb+srv://restore_admin:enisdevteam123@enistechteam.owwtldg.mongodb.net/"
    "plot-management?retryWrites=true&w=majority&appName=PlotManagement"
)

# The real "Deleted" LeadStatus — see the soft-delete convention used
# throughout this project (Lead/deleteLeads sets this instead of removing
# the document).
DELETED_STATUS_ID = ObjectId("6a6c9d8a830ad4b804ccf7d0")

# Same model already used for real call sentiment/summary (see
# scripts/analyze_sentiment.py) — keeping one provider/model for both
# "read messy real text, produce short structured output" tasks.
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are a sales assistant for a real estate CRM. Given a lead's real activity history below, "
    "write ONE short, actionable note (max 2 sentences) for the assigned sales rep: why this lead "
    "matters right now, and what the single next action should be. Be specific — reference real "
    "details from the history (dates, what was discussed, budget if mentioned). If the lead has gone "
    "quiet, say so plainly rather than inventing urgency. Respond with ONLY the note text — no "
    "preamble, no quotes, no markdown."
)


def fetch_pending_leads(db, limit):
    return list(
        db.leads.find(
            {
                # Deleted leads are soft-deleted (status flipped, doc stays)
                # — no point spending free-tier quota briefing dead records.
                "leadStatusId": {"$ne": DELETED_STATUS_ID},
                "$expr": {
                    "$or": [
                        {"$eq": ["$priorityBriefingGeneratedAt", None]},
                        {"$gt": ["$updatedAt", "$priorityBriefingGeneratedAt"]},
                    ]
                },
            }
        )
        .sort("updatedAt", -1)
        .limit(limit)
    )


def build_context(db, lead):
    lines = [
        f"Lead: {lead.get('leadFirstName', '')} {lead.get('leadLastName', '')}".strip(),
        f"Status: {lookup_name(db, 'leadstatuses', lead.get('leadStatusId'), 'leadStatustName')}",
        f"Source: {lookup_name(db, 'leadsources', lead.get('leadSourceId'), 'leadSourceName')}",
        f"Assigned to: {lookup_name(db, 'employees', lead.get('leadAssignedId'), 'EmployeeName') or 'Unassigned'}",
    ]
    if lead.get("leadPotentialValue"):
        lines.append(f"Potential value: {lead['leadPotentialValue']}")

    history = lead.get("leadHistory") or []
    if history:
        lines.append("\nHistory (most recent last):")
        for entry in history[-10:]:
            details = entry.get("details") or entry.get("eventType") or ""
            lines.append(f"- {entry.get('timestamp')}: {details}")

    interactions = list(
        db.whatsappinteractions.find({"leadId": lead["_id"]}).sort("createdAt", -1).limit(6)
    )
    if interactions:
        lines.append("\nRecent WhatsApp messages (most recent first):")
        for msg in interactions:
            direction = "Lead" if msg.get("direction") == "inbound" else "Us"
            lines.append(f"- {direction}: {msg.get('message_body', '')}")

    return "\n".join(lines)


def lookup_name(db, collection, doc_id, field):
    if not doc_id:
        return ""
    doc = db[collection].find_one({"_id": doc_id})
    return doc.get(field, "") if doc else ""


def generate_briefing(api_key, context):
    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": context},
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    choice = data["choices"][0]
    if choice.get("finish_reason") not in ("stop", None):
        raise RuntimeError(f"Groq response cut short (finish_reason={choice.get('finish_reason')})")
    return choice["message"]["content"].strip()


def main():
    parser = argparse.ArgumentParser(description="Generate real per-lead priority briefings via Groq (cheap hosted LLM).")
    parser.add_argument("--limit", type=int, default=20, help="Max number of leads to brief this run (default: 20)")
    args = parser.parse_args()

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not set — add it to plot-management-node/.env")
        sys.exit(1)

    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client.get_database("plot-management")

    leads = fetch_pending_leads(db, args.limit)
    if not leads:
        print("No leads need a fresh briefing — nothing to do.")
        return

    print(f"Found {len(leads)} lead(s) to brief via Groq ({GROQ_MODEL}).")

    processed, failed = 0, 0
    for lead in leads:
        name = f"{lead.get('leadFirstName', '')} {lead.get('leadLastName', '')}".strip() or str(lead["_id"])
        print(f"\n[{name}] generating briefing...")
        try:
            context = build_context(db, lead)
            briefing = generate_briefing(api_key, context)

            from datetime import datetime, timezone

            db.leads.update_one(
                {"_id": lead["_id"]},
                {"$set": {"priorityBriefing": briefing, "priorityBriefingGeneratedAt": datetime.now(timezone.utc)}},
            )
            print(f"[{name}] {briefing}")
            processed += 1
        except Exception as error:  # noqa: BLE001 - one bad lead shouldn't abort the batch
            print(f"[{name}] FAILED: {error}")
            failed += 1

    print(f"\nDone. Briefed {processed}, failed {failed}, out of {len(leads)} attempted.")
    client.close()


if __name__ == "__main__":
    sys.exit(main())

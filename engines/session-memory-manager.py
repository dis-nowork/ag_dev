#!/usr/bin/env python3
"""
Session Memory Manager — Extract & store session transcripts
AG Dev v3 Engine (migrated from Motor de Soluções)

Monitors large OpenClaw sessions, extracts meaningful content,
embeds via Gemini, and uploads to Supabase pgvector for semantic search.

Usage:
  python3 engines/session-memory-manager.py              # normal run
  python3 engines/session-memory-manager.py --dry-run    # preview only
  python3 engines/session-memory-manager.py --threshold 100000

Environment:
  SUPABASE_URL              — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
  GEMINI_API_KEY            — Google Gemini API key (for embeddings)
"""

import json, os, sys, time, urllib.request, re
from pathlib import Path
from datetime import datetime

SESSIONS_DIR = Path(os.environ.get("OPENCLAW_SESSIONS", os.path.expanduser("~/.openclaw/agents/main/sessions")))
WORKSPACE = Path(os.environ.get("AGDEV_WORKSPACE", os.path.expanduser("~/.openclaw/workspace")))
STATE_FILE = WORKSPACE / "memory" / "memory-manager-state.json"
EXTRACTION_DIR = WORKSPACE / "memory" / "extractions"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yxsvdkfdwigtlqjihbce.supabase.co")
TOKEN_THRESHOLD = 50000
CHUNK_SIZE = 2000


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"extracted_sessions": {}, "last_run": None}


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    state["last_run"] = datetime.utcnow().isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2))


def extract_transcript(jsonl_path):
    entries = []
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except:
                continue
            if entry.get("type") != "message":
                continue
            msg = entry.get("message", {})
            role = msg.get("role")
            if role not in ("user", "assistant"):
                continue
            content = msg.get("content", [])
            texts = []
            if isinstance(content, str):
                texts = [content]
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        t = item.get("text", "").strip()
                        if t and len(t) > 30:
                            texts.append(t)
            full_text = "\n".join(texts).strip()
            if not full_text or len(full_text) < 30:
                continue
            if full_text.startswith("{") and '"type"' in full_text[:100]:
                continue
            if full_text.strip() in ("HEARTBEAT_OK", "NO_REPLY"):
                continue
            entries.append({"role": role, "text": full_text[:3000], "timestamp": msg.get("timestamp", "")})
    return entries


def create_chunks(entries):
    parts = []
    seen = set()
    for e in entries:
        if len(e["text"]) < 50:
            continue
        key = e["text"][:100]
        if key in seen:
            continue
        seen.add(key)
        parts.append(f"[{'USER' if e['role']=='user' else 'ASSISTANT'}] {e['text']}")

    full_text = "\n\n".join(parts)
    paragraphs = full_text.split("\n\n")
    chunks, current = [], ""
    for p in paragraphs:
        if len(current) + len(p) < CHUNK_SIZE:
            current += "\n\n" + p
        else:
            if current.strip():
                chunks.append(current.strip())
            current = p
    if current.strip():
        chunks.append(current.strip())
    return chunks


def get_embedding(text, gemini_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key}"
    body = json.dumps({"model": "models/text-embedding-004", "content": {"parts": [{"text": text[:8000]}]}}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            return json.loads(urllib.request.urlopen(req, timeout=30).read())["embedding"]["values"]
        except Exception as e:
            if "429" in str(e):
                time.sleep((attempt + 1) * 5)
            else:
                return None
    return None


def upload_chunk(content, embedding, source_id, meta, supa_key):
    body = json.dumps({"content": content, "embedding": str(embedding), "type": "session-extraction",
                        "source_id": source_id, "importance": 3, "meta": meta}).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/memories", data=body,
        headers={"apikey": supa_key, "Authorization": f"Bearer {supa_key}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=15)


def main():
    dry_run = "--dry-run" in sys.argv
    threshold = TOKEN_THRESHOLD
    for i, arg in enumerate(sys.argv):
        if arg == "--threshold" and i + 1 < len(sys.argv):
            threshold = int(sys.argv[i + 1])

    gemini_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GEMINI_KEY", ""))
    supa_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not gemini_key or not supa_key:
        print("ERROR: Set GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY env vars")
        sys.exit(1)

    state = load_state()
    print(f"Session Memory Manager — {datetime.utcnow().isoformat()}")
    print(f"Sessions dir: {SESSIONS_DIR}")

    sessions = []
    for jsonl in SESSIONS_DIR.glob("*.jsonl"):
        sessions.append({"path": jsonl, "session_id": jsonl.stem, "size_bytes": jsonl.stat().st_size})
    sessions.sort(key=lambda s: s["size_bytes"], reverse=True)
    print(f"Found {len(sessions)} sessions")

    size_threshold = threshold * 4
    processed = 0
    for sess in sessions:
        sid = sess["session_id"]
        if sid in state["extracted_sessions"] and sess["size_bytes"] < state["extracted_sessions"][sid].get("size_bytes", 0) * 1.2:
            continue
        if sess["size_bytes"] < size_threshold:
            continue

        print(f"\nSession: {sid} ({sess['size_bytes']//1024}KB)")
        if dry_run:
            print("  [DRY RUN]"); continue

        entries = extract_transcript(sess["path"])
        if len(entries) < 5:
            continue
        chunks = create_chunks(entries)
        print(f"  {len(entries)} messages → {len(chunks)} chunks")

        EXTRACTION_DIR.mkdir(parents=True, exist_ok=True)
        with open(EXTRACTION_DIR / f"{sid}.md", 'w') as f:
            f.write(f"# Session: {sid}\n**Chunks:** {len(chunks)}\n\n")
            for i, c in enumerate(chunks):
                f.write(f"## Chunk {i+1}\n{c}\n\n")

        success = 0
        for i, chunk in enumerate(chunks):
            emb = get_embedding(chunk, gemini_key)
            if not emb:
                continue
            try:
                upload_chunk(chunk, emb, f"session-{sid}-chunk-{i}",
                    {"source": f"session-{sid}", "date": datetime.utcnow().strftime("%Y-%m-%d"), "chunk_index": i}, supa_key)
                success += 1
            except Exception as e:
                print(f"    [{i+1}] error: {str(e)[:60]}")
            if i % 5 == 0 and i > 0:
                time.sleep(0.5)

        print(f"  Uploaded: {success}/{len(chunks)}")
        state["extracted_sessions"][sid] = {"size_bytes": sess["size_bytes"], "chunks_uploaded": success,
                                             "extracted_at": datetime.utcnow().isoformat()}
        save_state(state)
        processed += 1

    print(f"\nDone. Processed {processed} sessions.")


if __name__ == "__main__":
    main()

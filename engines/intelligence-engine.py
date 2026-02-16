#!/usr/bin/env python3 -u
"""
Intelligence Engine — Daily automated briefing
AG Dev v3 Engine (migrated from Motor de Soluções)

Fetches Brave Search + Hacker News + Google News Brazil, then uses Gemini
to synthesize an actionable daily briefing.

Usage:
  python3 engines/intelligence-engine.py

Environment:
  BRAVE_KEY    — Brave Search API key
  GEMINI_KEY   — Google Gemini API key

Output: ./briefings/briefing-YYYY-MM-DD.md
"""

import os, json, sys, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

BRAVE_KEY = os.environ.get("BRAVE_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_KEY", os.environ.get("GEMINI_API_KEY", ""))
OUTPUT_DIR = os.environ.get("AGDEV_BRIEFINGS", os.path.join(os.path.expanduser("~/.openclaw/workspace"), "briefings"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

TOPICS = [
    "AI agents tools 2026",
    "marketing digital tendências Brasil",
    "open source self-hosted alternatives",
    "content creation AI tools",
    "funis de vendas automação",
    "WhatsApp Business API automation",
]


def brave_search(query, count=5):
    url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.request.quote(query)}&count={count}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_KEY})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return [{"title": r.get("title",""), "url": r.get("url",""), "description": r.get("description","")}
                    for r in data.get("web",{}).get("results",[])]
    except Exception as e:
        print(f"  Brave error: {e}", flush=True)
        return []


def fetch_hn_top(limit=10):
    try:
        with urllib.request.urlopen("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=10) as resp:
            ids = json.loads(resp.read())[:limit]
        stories = []
        for sid in ids:
            with urllib.request.urlopen(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json", timeout=10) as resp:
                item = json.loads(resp.read())
                if item and item.get("title"):
                    stories.append({"title": item["title"], "url": item.get("url", f"https://news.ycombinator.com/item?id={sid}"),
                                    "score": item.get("score", 0), "comments": item.get("descendants", 0)})
        return stories
    except Exception as e:
        print(f"  HN error: {e}", flush=True)
        return []


def fetch_google_news_br(limit=10):
    try:
        req = urllib.request.Request("https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419",
                                     headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            root = ET.fromstring(resp.read())
        return [{"title": item.find('title').text, "link": item.find('link').text, "pubDate": item.find('pubDate').text}
                for item in root.findall('.//item')[:limit]]
    except Exception as e:
        print(f"  GNews error: {e}", flush=True)
        return []


def gemini_synthesize(all_data):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    prompt = f"""Você é o Intelligence Engine. Dados de hoje ({datetime.now().strftime('%d/%m/%Y')}):

**HN:** {json.dumps(all_data.get('hn',[]), ensure_ascii=False)[:3000]}
**GNews BR:** {json.dumps(all_data.get('gnews',[]), ensure_ascii=False)[:2000]}
**Brave:** {json.dumps(all_data.get('brave',{}), ensure_ascii=False)[:3000]}

Gere BRIEFING DIÁRIO (PT-BR): 1) 🔥 Top 3 Sinais 2) 🛠️ Ferramentas Novas 3) 📈 Tendências 4) 💡 Oportunidades 5) 🤔 Conexão Inesperada. Max 500 palavras."""

    data = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.5, "maxOutputTokens": 2048}}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())["candidates"][0]["content"]["parts"][0]["text"]


def run_briefing():
    print(f"📋 Intelligence Engine — {datetime.now().strftime('%Y-%m-%d %H:%M')}", flush=True)
    all_data = {"brave": {}, "hn": [], "gnews": []}

    print("Fetching HN...", flush=True)
    all_data["hn"] = fetch_hn_top(10)
    print(f"  HN: {len(all_data['hn'])} stories", flush=True)

    print("Fetching Google News BR...", flush=True)
    all_data["gnews"] = fetch_google_news_br(10)
    print(f"  GNews: {len(all_data['gnews'])} stories", flush=True)

    for topic in TOPICS[:3]:
        print(f"Searching: {topic[:40]}...", flush=True)
        all_data["brave"][topic] = brave_search(topic, count=3)
        time.sleep(1)

    print("Synthesizing with Gemini...", flush=True)
    try:
        briefing = gemini_synthesize(all_data)
        timestamp = datetime.now().strftime("%Y-%m-%d")
        outfile = f"{OUTPUT_DIR}/briefing-{timestamp}.md"
        total_brave = sum(len(v) for v in all_data["brave"].values())
        with open(outfile, 'w') as f:
            f.write(f"# 📋 Briefing Diário — {timestamp}\n\n{briefing}\n\n---\n*Intelligence Engine (AG Dev)*\n*Fontes: {len(all_data['hn'])} HN + {len(all_data['gnews'])} GNews + {total_brave} Brave*\n")
        print(f"\n✅ Saved: {outfile}", flush=True)
        print(f"\n{briefing}", flush=True)
    except Exception as e:
        print(f"❌ Error: {e}", flush=True)


if __name__ == "__main__":
    run_briefing()

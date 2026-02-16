#!/usr/bin/env python3 -u
"""
Arsenal Scanner — Discover high-potential GitHub repos
AG Dev v3 Engine (migrated from Motor de Soluções)

Searches GitHub trending repos by topic, analyzes with Gemini Flash,
and produces a ranked report of tools/repos worth investigating.

Usage:
  python3 engines/arsenal-scanner.py

Environment:
  GITHUB_TOKEN  — GitHub personal access token
  GEMINI_KEY    — Google Gemini API key (or GEMINI_API_KEY)

Output: ./arsenal-scans/scan-YYYY-MM-DD.{json,md}
"""

import os, json, sys, time, urllib.request, urllib.error, re
from datetime import datetime, timedelta

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GEMINI_KEY = os.environ.get("GEMINI_KEY", os.environ.get("GEMINI_API_KEY", ""))
OUTPUT_DIR = os.environ.get("AGDEV_ARSENAL", os.path.join(os.path.expanduser("~/.openclaw/workspace"), "arsenal-scans"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

SEARCH_QUERIES = [
    "ai agent framework stars:>500 pushed:>{date}",
    "self-hosted alternative stars:>300 pushed:>{date}",
    "open source saas killer stars:>200 pushed:>{date}",
    "llm tool stars:>500 pushed:>{date}",
    "automation workflow stars:>300 pushed:>{date}",
    "content creation ai stars:>200 pushed:>{date}",
    "mcp server stars:>100 pushed:>{date}",
    "marketing automation open source stars:>200 pushed:>{date}",
]


def github_api(endpoint, params=None):
    url = f"https://api.github.com{endpoint}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AG-Dev-Arsenal-Scanner"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def gemini_analyze(repos_batch):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    repos_text = "\n".join(f"---\nRepo: {r['full_name']} | ⭐ {r['stargazers_count']} | Lang: {r.get('language','?')}\nDesc: {r.get('description','N/A')}\nTopics: {', '.join(r.get('topics',[]))}\nURL: {r['html_url']}" for r in repos_batch)

    prompt = f"""Analise repos GitHub. Para cada, retorne JSON array:
{repos_text}

[{{"repo":"owner/name","stars":N,"relevancia":1-5,"categoria":"ai-agent|infra|creative|marketing|devtools|self-hosted|data|security|productivity|other","uso_potencial":"1 frase","ferramentas_extraiveis":["..."],"conexoes":["..."]}}]
Apenas JSON, sem markdown."""

    data = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096}}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        text = json.loads(resp.read())["candidates"][0]["content"]["parts"][0]["text"]
    text = re.sub(r'^```json\s*', '', text.strip())
    text = re.sub(r'\s*```$', '', text.strip())
    return json.loads(text)


def search_repos(query, per_page=10):
    date_30d = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    q = query.replace("{date}", date_30d)
    try:
        return github_api("/search/repositories", {"q": urllib.request.quote(q), "sort": "stars", "order": "desc", "per_page": str(per_page)}).get("items", [])
    except urllib.error.HTTPError as e:
        print(f"  GitHub API error {e.code}: {q[:50]}", flush=True)
        if e.code == 429:
            time.sleep(60)
        return []


def run_scan():
    print(f"🔭 Arsenal Scanner — {datetime.now().strftime('%Y-%m-%d %H:%M')}", flush=True)
    all_repos = {}
    for query in SEARCH_QUERIES:
        repos = search_repos(query, per_page=5)
        for r in repos:
            all_repos[r['full_name']] = r
        time.sleep(2)
        print(f"  Query done: {len(repos)} repos | Total unique: {len(all_repos)}", flush=True)

    if not all_repos:
        print("No repos found", flush=True); return

    repos_list = list(all_repos.values())
    all_analyses = []
    for i in range(0, len(repos_list), 5):
        batch = repos_list[i:i+5]
        print(f"\n🧠 Analyzing batch {i//5+1}...", flush=True)
        try:
            all_analyses.extend(gemini_analyze(batch))
        except Exception as e:
            print(f"  ❌ {str(e)[:80]}", flush=True)
        time.sleep(1)

    all_analyses.sort(key=lambda x: x.get('relevancia', 0), reverse=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")

    with open(f"{OUTPUT_DIR}/scan-{timestamp}.json", 'w') as f:
        json.dump({"scan_date": timestamp, "total_found": len(all_repos), "repos": all_analyses}, f, indent=2, ensure_ascii=False)

    md = f"# 🔭 Arsenal Scan — {timestamp}\n\n**Found:** {len(all_repos)} | **Analyzed:** {len(all_analyses)}\n\n"
    for a in all_analyses:
        md += f"### [{a['repo']}](https://github.com/{a['repo']}) ⭐ {a.get('stars','?')} | Rel: {a.get('relevancia','?')}/5 | {a.get('categoria','?')}\n"
        md += f"**Uso:** {a.get('uso_potencial','N/A')}\n**Tools:** {', '.join(a.get('ferramentas_extraiveis',[]))}\n\n"
    with open(f"{OUTPUT_DIR}/scan-{timestamp}.md", 'w') as f:
        f.write(md)

    print(f"\n🏆 Top 5:", flush=True)
    for a in all_analyses[:5]:
        print(f"  [{a.get('relevancia','?')}/5] {a['repo']} ⭐{a.get('stars','?')}", flush=True)


if __name__ == "__main__":
    run_scan()

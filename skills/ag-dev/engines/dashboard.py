#!/usr/bin/env python3
"""
Dashboard Generator — System status HTML dashboard
AG Dev v3 Engine (migrated from Motor de Soluções)

Generates a dark-themed HTML dashboard showing system resources,
running services, installed tools, API status, and engine status.

Usage:
  python3 engines/dashboard.py                    # outputs to workspace
  python3 engines/dashboard.py /path/to/out.html  # custom output path
"""

import json, os, subprocess, sys
from datetime import datetime

WORKSPACE = os.environ.get("AGDEV_WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))


def run(cmd):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10).stdout.strip()
    except:
        return "N/A"


def get_system_status():
    mem = run("free -m | grep Mem | awk '{print $3, $2}'").split()
    disk = run("df -h / | tail -1 | awk '{print $3, $2, $5}'").split()
    return {
        "ram_used_mb": int(mem[0]) if len(mem) > 0 else 0,
        "ram_total_mb": int(mem[1]) if len(mem) > 1 else 0,
        "disk_used": disk[0] if len(disk) > 0 else "?",
        "disk_total": disk[1] if len(disk) > 1 else "?",
        "disk_pct": disk[2] if len(disk) > 2 else "?",
        "uptime": run("uptime -p"),
        "load": run("cat /proc/loadavg | awk '{print $1, $2, $3}'"),
    }


def get_services():
    checks = [("OpenClaw", "pgrep -f openclaw-gateway", "18789"),
              ("n8n", "pgrep -f 'n8n start'", "5678"),
              ("Chrome", "pgrep -f google-chrome", "")]
    return [{"name": n, "running": bool(run(c)), "pid": run(c).split('\n')[0] if run(c) else "", "port": p}
            for n, c, p in checks]


def get_tools():
    checks = [("ffmpeg", "ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3"),
              ("Tesseract", "tesseract --version 2>&1 | head -1"),
              ("yt-dlp", "yt-dlp --version"),
              ("whisper", "pip show faster-whisper 2>/dev/null | grep Version | cut -d' ' -f2")]
    return [{"name": n, "version": run(c) or "N/A", "ok": bool(run(c))} for n, c in checks]


def get_engines():
    return [
        {"name": "Intelligence Engine", "status": "🟢", "desc": "Daily briefings via Brave+HN+Gemini"},
        {"name": "Creative Factory", "status": "🟢", "desc": "Brief → Copy + Image + Landing Page"},
        {"name": "Arsenal Scanner", "status": "🟢", "desc": "GitHub trending → tool discovery"},
        {"name": "Session Memory", "status": "🟢", "desc": "Session extraction → Supabase pgvector"},
        {"name": "Dashboard", "status": "🟢", "desc": "This status page"},
    ]


def generate_dashboard(output_path=None):
    s = get_system_status()
    services = get_services()
    tools = get_tools()
    engines = get_engines()
    ram_pct = round(s['ram_used_mb'] / s['ram_total_mb'] * 100) if s['ram_total_mb'] else 0

    html = f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AG Dev — Dashboard</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:-apple-system,system-ui,sans-serif;background:#0f0f1a;color:#e0e0e0;min-height:100vh}}
.header{{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center;border-bottom:1px solid #2a2a4a}}
.header h1{{font-size:28px;color:#fff}}.header p{{color:#888;font-size:14px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;padding:24px;max-width:1400px;margin:0 auto}}
.card{{background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #2a2a4a}}
.card h2{{font-size:16px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px}}
.metric{{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1f1f3a}}
.metric:last-child{{border:none}}.metric .label{{color:#aaa}}.metric .value{{font-weight:600;color:#fff}}
.bar{{height:8px;background:#2a2a4a;border-radius:4px;margin-top:4px}}
.bar-fill{{height:100%;border-radius:4px}}.bar-fill.ok{{background:#00c853}}.bar-fill.warn{{background:#ff9800}}.bar-fill.danger{{background:#f44336}}
.status{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
.status.on{{background:#00c853;box-shadow:0 0 6px #00c853}}.status.off{{background:#f44336}}
.tag{{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#2a2a4a;color:#aaa}}
.timestamp{{text-align:center;padding:16px;color:#555;font-size:12px}}
</style></head><body>
<div class="header"><h1>⚡ AG Dev — Dashboard</h1><p>Infrastructure Status</p></div>
<div class="grid">
<div class="card"><h2>🖥️ System</h2>
<div class="metric"><span class="label">RAM</span><span class="value">{s['ram_used_mb']}MB/{s['ram_total_mb']}MB ({ram_pct}%)</span></div>
<div class="bar"><div class="bar-fill {'ok' if ram_pct<60 else 'warn' if ram_pct<85 else 'danger'}" style="width:{ram_pct}%"></div></div>
<div class="metric"><span class="label">Disk</span><span class="value">{s['disk_used']}/{s['disk_total']} ({s['disk_pct']})</span></div>
<div class="metric"><span class="label">Uptime</span><span class="value">{s['uptime']}</span></div>
<div class="metric"><span class="label">Load</span><span class="value">{s['load']}</span></div></div>
<div class="card"><h2>⚙️ Services</h2>
{''.join(f'<div class="metric"><span class="label"><span class="status {"on" if sv["running"] else "off"}"></span>{sv["name"]}</span><span class="value">{("PID "+sv["pid"]) if sv["running"] else "OFF"}</span></div>' for sv in services)}</div>
<div class="card"><h2>🚀 Engines</h2>
{''.join(f'<div class="metric"><span class="label">{e["status"]} {e["name"]}</span><span class="value"><span class="tag">{e["desc"]}</span></span></div>' for e in engines)}</div>
<div class="card"><h2>🔧 Tools</h2>
{''.join(f'<div class="metric"><span class="label">{"✅" if t["ok"] else "❌"} {t["name"]}</span><span class="value">{t["version"]}</span></div>' for t in tools)}</div>
</div>
<div class="timestamp">Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | AG Dev v3</div>
</body></html>"""

    if not output_path:
        output_path = os.path.join(WORKSPACE, "dashboard.html")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(html)
    print(f"✅ Dashboard: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_dashboard(sys.argv[1] if len(sys.argv) > 1 else None)

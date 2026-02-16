#!/usr/bin/env python3
"""
Creative Factory — Brief → Campaign Assets
AG Dev v3 Engine (migrated from Motor de Soluções)

Generates copy + image + landing page HTML from a product brief.
Uses: Gemini (copy generation), Imagen 4 (visuals), Puppeteer (HTML→PNG)

Usage:
  python3 engines/creative-factory.py                          # uses default GPS brief
  python3 engines/creative-factory.py '{"product":"My SaaS"}'  # custom brief JSON

Environment:
  GEMINI_API_KEY  — Google Gemini API key (required)

Output directory: ./creative-output/<timestamp>/
"""

import json, os, sys, base64, subprocess, urllib.request
from datetime import datetime

WORKSPACE = os.environ.get("AGDEV_WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))
OUTPUT_BASE = os.path.join(WORKSPACE, "creative-output")


def get_gemini_key():
    """Get Gemini API key from env or workspace credentials."""
    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        return key
    # Try reading from workspace credentials
    cred_path = os.path.join(WORKSPACE, "credentials", "gemini-api-key.txt")
    if os.path.exists(cred_path):
        return open(cred_path).read().strip()
    return ""


def gemini_generate(prompt, api_key, model="gemini-2.0-flash"):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
        return resp["candidates"][0]["content"]["parts"][0]["text"]


def imagen_generate(prompt, api_key, output_path):
    from google import genai
    client = genai.Client(api_key=api_key)
    response = client.models.generate_images(
        model='imagen-4.0-generate-001',
        prompt=prompt,
        config=genai.types.GenerateImagesConfig(number_of_images=1)
    )
    if response.generated_images:
        with open(output_path, 'wb') as f:
            f.write(response.generated_images[0].image.image_bytes)
        return True
    return False


def generate_landing_page(copy_data, image_path, output_dir):
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{copy_data.get('headline', 'Landing Page')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: 'Inter', sans-serif; color: #1a1a2e; line-height: 1.6; }}
.hero {{ min-height: 90vh; display: flex; align-items: center; background: linear-gradient(135deg, {copy_data.get('color1', '#667eea')} 0%, {copy_data.get('color2', '#764ba2')} 100%); color: white; padding: 60px 20px; text-align: center; }}
.hero-content {{ max-width: 800px; margin: 0 auto; }}
.hero h1 {{ font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 24px; }}
.hero p {{ font-size: 1.25rem; opacity: 0.9; margin-bottom: 32px; }}
.cta-btn {{ display: inline-block; padding: 16px 48px; font-size: 1.1rem; font-weight: 700; background: white; color: {copy_data.get('color1', '#667eea')}; border-radius: 8px; text-decoration: none; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }}
.cta-btn:hover {{ transform: translateY(-2px); }}
.benefits {{ padding: 80px 20px; max-width: 1000px; margin: 0 auto; }}
.benefits h2 {{ font-size: 2rem; text-align: center; margin-bottom: 48px; }}
.benefit-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; }}
.benefit {{ padding: 32px; border-radius: 12px; background: #f8f9ff; }}
.benefit h3 {{ font-size: 1.2rem; margin-bottom: 8px; color: {copy_data.get('color1', '#667eea')}; }}
.social-proof {{ padding: 60px 20px; background: #f0f0f5; text-align: center; }}
.final-cta {{ padding: 80px 20px; text-align: center; background: linear-gradient(135deg, {copy_data.get('color1', '#667eea')} 0%, {copy_data.get('color2', '#764ba2')} 100%); color: white; }}
.final-cta h2 {{ font-size: 2rem; margin-bottom: 16px; }}
.final-cta p {{ font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px; }}
</style>
</head>
<body>
<section class="hero"><div class="hero-content">
<h1>{copy_data.get('headline', 'Título Principal')}</h1>
<p>{copy_data.get('subheadline', 'Subtítulo')}</p>
<a href="#" class="cta-btn">{copy_data.get('cta', 'QUERO AGORA')}</a>
</div></section>
<section class="benefits"><h2>{copy_data.get('benefits_title', 'Por que escolher?')}</h2>
<div class="benefit-grid">{''.join(f'<div class="benefit"><h3>{b.get("title","")}</h3><p>{b.get("desc","")}</p></div>' for b in copy_data.get('benefits', []))}</div>
</section>
<section class="social-proof"><h2>{copy_data.get('proof_title', 'Resultados')}</h2><p>{copy_data.get('proof_text', '')}</p></section>
<section class="final-cta"><h2>{copy_data.get('final_headline', 'Pronto?')}</h2><p>{copy_data.get('final_text', '')}</p>
<a href="#" class="cta-btn">{copy_data.get('cta', 'QUERO AGORA')}</a></section>
</body></html>"""
    html_path = os.path.join(output_dir, "landing-page.html")
    with open(html_path, 'w') as f:
        f.write(html)
    return html_path


def run_creative_factory(brief):
    api_key = get_gemini_key()
    if not api_key:
        print("❌ No GEMINI_API_KEY found. Set env var or place key in workspace/credentials/gemini-api-key.txt")
        sys.exit(1)

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    output_dir = os.path.join(OUTPUT_BASE, timestamp)
    os.makedirs(output_dir, exist_ok=True)

    print(f"🎨 Creative Factory — {brief.get('product', 'Product')}")
    print(f"   Output: {output_dir}")

    # Step 1: Generate copy
    print("  📝 Generating copy...")
    copy_prompt = f"""Você é um copywriter expert em persuasão.
Crie copy para landing page:
Produto: {brief.get('product', '')}
Público: {brief.get('audience', '')}
Oferta: {brief.get('offer', '')}
Tom: {brief.get('tone', 'profissional')}

Retorne APENAS JSON válido:
{{"headline":"...","subheadline":"...","cta":"...","benefits_title":"...","benefits":[{{"title":"...","desc":"..."}}],"proof_title":"...","proof_text":"...","final_headline":"...","final_text":"...","image_prompt":"...","color1":"{brief.get('colors',['#2563eb'])[0]}","color2":"{brief.get('colors',['#2563eb','#7c3aed'])[1] if len(brief.get('colors',[])) > 1 else '#7c3aed'}"}}"""

    copy_raw = gemini_generate(copy_prompt, api_key).strip()
    if copy_raw.startswith("```"):
        copy_raw = copy_raw.split("\n", 1)[1] if "\n" in copy_raw else copy_raw[3:]
    if copy_raw.endswith("```"):
        copy_raw = copy_raw[:-3]

    try:
        copy_data = json.loads(copy_raw.strip())
    except json.JSONDecodeError:
        copy_data = {"headline": brief.get("product", "Product"), "subheadline": brief.get("offer", ""),
                     "cta": "SAIBA MAIS", "benefits": [], "color1": "#2563eb", "color2": "#7c3aed"}

    with open(os.path.join(output_dir, "copy.json"), 'w') as f:
        json.dump(copy_data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Copy: {copy_data.get('headline', '?')}")

    # Step 2: Hero image
    print("  🖼️ Generating hero image...")
    image_path = os.path.join(output_dir, "hero-image.png")
    try:
        imagen_generate(copy_data.get("image_prompt", f"Professional hero image for {brief.get('product', '')}"), api_key, image_path)
        print(f"  ✅ Hero image: {os.path.getsize(image_path)//1024}KB")
    except Exception as e:
        print(f"  ⚠️ Image failed: {e}")

    # Step 3: Landing page
    print("  🌐 Building landing page...")
    html_path = generate_landing_page(copy_data, image_path, output_dir)
    print(f"  ✅ Landing page: {html_path}")

    print(f"\n🎉 Done! Output: {output_dir}/")
    return output_dir


if __name__ == "__main__":
    brief = {
        "product": "GPS - Gestão Profissional de Saúde",
        "audience": "Profissionais de saúde",
        "offer": "Método de marketing para consultórios - R$297",
        "tone": "profissional, confiante",
        "colors": ["#2563eb", "#7c3aed"]
    }
    if len(sys.argv) > 1:
        brief = json.loads(sys.argv[1])
    run_creative_factory(brief)

"""
Image generation engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 1 - Prompt Engineering Encapsulado
  Pilar 5 - Fallback Chain (Gemini Imagen → DALL-E 3 → Pexels)

Usage:
  from claude_capabilities.image import generate_image, enhance_prompt

  # Dry-run (Pilar 6)
  result = generate_image("foto do meu cafe", "output/cafe.png", dry_run=True)

  # Full execution with all pillars
  result = generate_image("foto do meu cafe", "output/cafe.png")
"""

import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from claude_capabilities.cost import COST_DB, CostTracker
from claude_capabilities.keys import get, get_optional

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# PILAR 1: PROMPT ENGINEERING ENCAPSULADO
# Transforma pedido vago → prompt otimizado de fotografia profissional
# ═══════════════════════════════════════════════════════════════════

STYLE_TEMPLATES = {
    "product": (
        "Professional product photography, {subject}, "
        "centered on white infinity curve backdrop, "
        "soft diffused lighting from 45-degree angle, "
        "slight shadow for depth, 8K resolution, commercial quality, "
        "clean minimalist composition, studio setting"
    ),
    "hero": (
        "Cinematic hero shot, {subject}, "
        "dramatic lighting with rim light, shallow depth of field, "
        "vibrant saturated colors, editorial quality, "
        "magazine cover composition, professional photography"
    ),
    "lifestyle": (
        "Lifestyle photography, {subject}, "
        "natural golden hour lighting, candid authentic feel, "
        "warm color palette, environmental context visible, "
        "social media optimized, high quality DSLR look"
    ),
    "flat_lay": (
        "Professional flat lay photography, {subject}, "
        "top-down bird's eye perspective, carefully organized arrangement, "
        "complementary props and textures, clean muted background, "
        "Instagram aesthetic, commercial quality"
    ),
    "portrait": (
        "Professional portrait photography, {subject}, "
        "Rembrandt lighting setup, subtle catchlights in eyes, "
        "shallow depth of field f/1.8, neutral blurred background, "
        "skin detail preserved, editorial retouching quality"
    ),
    "food": (
        "Professional food photography, {subject}, "
        "45-degree angle, soft directional natural light from window, "
        "shallow depth of field, steam or freshness visible, "
        "rustic props, appetizing colors, editorial quality"
    ),
    "minimal": (
        "Minimalist photography, {subject}, "
        "clean composition with negative space, "
        "single focal point, muted color palette, "
        "geometric balance, modern aesthetic, high resolution"
    ),
    "default": (
        "High quality professional photograph, {subject}, "
        "excellent balanced lighting, sharp focus, "
        "thoughtful composition, commercial quality, 8K resolution"
    ),
}

# Keywords that map to styles (Portuguese + English)
STYLE_KEYWORDS = {
    "product": ["produto", "product", "embalagem", "package", "item", "garrafa", "bottle"],
    "hero": ["hero", "banner", "destaque", "highlight", "impacto", "impact"],
    "lifestyle": ["lifestyle", "estilo de vida", "usando", "using", "pessoa com", "person with"],
    "flat_lay": ["flat lay", "flatlay", "de cima", "top down", "overhead", "mesa"],
    "portrait": ["retrato", "portrait", "rosto", "face", "headshot", "pessoa", "person"],
    "food": ["comida", "food", "prato", "dish", "receita", "recipe", "cafe", "coffee", "drink"],
    "minimal": ["minimal", "minimalista", "clean", "limpo", "simples", "simple"],
}


def detect_style(prompt: str) -> str:
    """Auto-detect the best style based on prompt keywords."""
    lower = prompt.lower()
    for style, keywords in STYLE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return style
    return "default"


def enhance_prompt(raw_prompt: str, style: str = "auto") -> dict:
    """
    Pilar 1: Transform vague request → optimized professional prompt.

    Returns dict with original, enhanced prompt, and detected style.
    """
    if style == "auto":
        style = detect_style(raw_prompt)

    template = STYLE_TEMPLATES.get(style, STYLE_TEMPLATES["default"])
    enhanced = template.format(subject=raw_prompt)

    return {
        "original": raw_prompt,
        "enhanced": enhanced,
        "style": style,
    }


# ═══════════════════════════════════════════════════════════════════
# PILAR 5: FALLBACK CHAIN
# Gemini Imagen → DALL-E 3 → Pexels (transparent to user)
# ═══════════════════════════════════════════════════════════════════

def _generate_gemini(prompt: str, output_path: str) -> dict:
    """Generate image using Google Imagen 4 via Gemini API."""
    api_key = get("GOOGLE_API_KEY_GEMINI")

    # Imagen 4 — uses predict endpoint
    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        "models/imagen-4.0-generate-001:predict"
        f"?key={api_key}"
    )

    payload = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "1:1",
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    response = urllib.request.urlopen(req, timeout=120)
    data = json.loads(response.read())

    predictions = data.get("predictions", [])
    if not predictions:
        raise RuntimeError("Imagen 4 returned no predictions")

    img_b64 = predictions[0].get("bytesBase64Encoded")
    if not img_b64:
        raise RuntimeError("Imagen 4 response missing image data")

    img_bytes = base64.b64decode(img_b64)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(img_bytes)

    cost = COST_DB["gemini_imagen"]
    tracker.add("gemini_imagen", cost, f"prompt: {prompt[:100]}")

    return {"provider": "imagen_4", "path": output_path, "cost": cost}


def _generate_dalle(prompt: str, output_path: str, quality: str = "standard") -> dict:
    """Generate image using OpenAI DALL-E 3."""
    api_key = get("OPENAI_API_KEY")

    url = "https://api.openai.com/v1/images/generations"
    payload = json.dumps({
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": quality,
        "response_format": "b64_json",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    response = urllib.request.urlopen(req, timeout=90)
    data = json.loads(response.read())

    img_b64 = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(img_b64)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(img_bytes)

    cost_key = f"dalle3_{quality}_1024"
    cost = COST_DB.get(cost_key, 0.04)
    tracker.add(cost_key, cost, f"prompt: {prompt[:100]}")

    return {"provider": "dalle3", "path": output_path, "cost": cost}


def _search_pexels(query: str, output_path: str) -> dict:
    """Fallback: download stock image from Pexels (free)."""
    api_key = get("PEXELS_API_KEY")

    query_encoded = urllib.parse.quote(query)
    url = f"https://api.pexels.com/v1/search?query={query_encoded}&per_page=1&orientation=square"

    req = urllib.request.Request(url, headers={"Authorization": api_key})
    response = urllib.request.urlopen(req, timeout=30)
    data = json.loads(response.read())

    photos = data.get("photos", [])
    if not photos:
        raise RuntimeError(f"Pexels: no results for '{query}'")

    img_url = photos[0]["src"]["large2x"]
    req_img = urllib.request.Request(img_url)
    response_img = urllib.request.urlopen(req_img, timeout=30)
    img_bytes = response_img.read()

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(img_bytes)

    tracker.add("pexels", 0.0, f"query: {query}")

    return {
        "provider": "pexels_stock",
        "path": output_path,
        "cost": 0.0,
        "note": "Stock image from Pexels (not AI generated)",
    }


# ═══════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT - All 6 Pillars
# ═══════════════════════════════════════════════════════════════════

def generate_image(
    prompt: str,
    output_path: str,
    style: str = "auto",
    dry_run: bool = False,
    preferred_provider: str = "auto",
    budget_limit: float = 1.0,
) -> dict:
    """
    Generate an image implementing all 6 CLAUDE_CAPABILITIES pillars.

    Args:
        prompt: User's raw description (any language)
        output_path: Where to save the generated image
        style: auto | product | hero | lifestyle | flat_lay | portrait | food | minimal
        dry_run: If True, show what WOULD happen without executing (Pilar 6)
        preferred_provider: auto | gemini | dalle | pexels
        budget_limit: Maximum cost allowed in USD (Pilar 3)

    Returns:
        dict with results, costs, and metadata
    """
    # ── Pilar 1: Prompt Engineering ──
    prompt_data = enhance_prompt(prompt, style)
    enhanced = prompt_data["enhanced"]
    detected_style = prompt_data["style"]

    # ── Build provider chain based on availability ──
    chain = []
    if preferred_provider in ("auto", "gemini"):
        if get_optional("GOOGLE_API_KEY_GEMINI"):
            chain.append(("gemini_imagen", _generate_gemini))
    if preferred_provider in ("auto", "dalle"):
        if get_optional("OPENAI_API_KEY"):
            chain.append(("dalle3", _generate_dalle))
    if preferred_provider in ("auto", "pexels") or not chain:
        if get_optional("PEXELS_API_KEY"):
            chain.append(("pexels", _search_pexels))

    # ── Pilar 3: Cost Guardrails ──
    first_provider = chain[0][0] if chain else "gemini_imagen"
    estimated_cost = COST_DB.get(first_provider, 0.04)

    # ── Pilar 6: Dry-Run (works even without API keys) ──
    if dry_run:
        # Show what providers WOULD be used
        available_chain = [name for name, _ in chain] if chain else ["(none configured)"]
        all_possible = []
        if preferred_provider in ("auto", "gemini"):
            all_possible.append("gemini_imagen" + (" [KEY SET]" if get_optional("GOOGLE_API_KEY_GEMINI") else " [NO KEY]"))
        if preferred_provider in ("auto", "dalle"):
            all_possible.append("dalle3" + (" [KEY SET]" if get_optional("OPENAI_API_KEY") else " [NO KEY]"))
        all_possible.append("pexels" + (" [KEY SET]" if get_optional("PEXELS_API_KEY") else " [NO KEY]"))

        return {
            "mode": "dry_run",
            "original_prompt": prompt,
            "enhanced_prompt": enhanced,
            "style_detected": detected_style,
            "estimated_cost": f"${estimated_cost:.2f}",
            "provider_chain": available_chain,
            "all_providers_status": all_possible,
            "output_path": output_path,
            "message": "Dry-run complete. Run without --dry-run to execute.",
        }

    # ── Check providers available for real execution ──
    if not chain:
        return {
            "error": "no_providers",
            "message": "No API keys configured. Set GOOGLE_API_KEY_GEMINI, OPENAI_API_KEY, or PEXELS_API_KEY in .env",
        }

    if estimated_cost > budget_limit:
        return {
            "error": "budget_exceeded",
            "estimated_cost": f"${estimated_cost:.2f}",
            "budget_limit": f"${budget_limit:.2f}",
            "message": (
                f"Estimated cost (${estimated_cost:.2f}) exceeds budget "
                f"(${budget_limit:.2f}). Increase budget or use pexels (free)."
            ),
        }

    # ── Pilar 5: Fallback Chain ──
    errors = []
    for provider_name, provider_fn in chain:
        try:
            print(f"[image-gen] Trying {provider_name}...")
            if provider_name == "pexels":
                result = provider_fn(prompt, output_path)
            else:
                result = provider_fn(enhanced, output_path)

            result["enhanced_prompt"] = enhanced
            result["original_prompt"] = prompt
            result["style"] = detected_style
            result["cost_summary"] = tracker.summary()

            # Save state for iteration (Pilar 4)
            _save_generation_state(result)

            print(f"[image-gen] Success via {provider_name}")
            return result

        except Exception as e:
            error_msg = f"{provider_name}: {e}"
            errors.append(error_msg)
            print(f"[image-gen] Failed: {error_msg}")

    return {
        "error": "all_providers_failed",
        "errors": errors,
        "message": "All providers failed. Check API keys and network.",
    }


# ═══════════════════════════════════════════════════════════════════
# PILAR 4: ITERATION LOOP
# Save/load state so "fundo mais escuro" adjusts only that parameter
# ═══════════════════════════════════════════════════════════════════

STATE_FILE = Path(__file__).parent.parent / ".state" / "last_image_generation.json"


def _save_generation_state(result: dict):
    """Save the last generation for iteration support."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    state = {
        "original_prompt": result.get("original_prompt", ""),
        "enhanced_prompt": result.get("enhanced_prompt", ""),
        "style": result.get("style", "auto"),
        "provider": result.get("provider", ""),
        "output_path": result.get("path", ""),
        "cost": result.get("cost", 0),
    }
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def load_last_state() -> dict | None:
    """Load the last generation state for iteration."""
    if not STATE_FILE.exists():
        return None
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

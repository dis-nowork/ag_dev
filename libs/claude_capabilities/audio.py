"""
Audio/TTS generation engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 1 - Prompt Engineering Encapsulado (ritmo, pausas, entonação)
  Pilar 5 - Fallback Chain (ElevenLabs → XTTS/RunPod → Edge-TTS)

Usage:
  from claude_capabilities.audio import generate_speech, enhance_script

  # Dry-run
  result = generate_speech("Olá, bem-vindo ao meu canal!", "output/intro.mp3", dry_run=True)

  # Full execution
  result = generate_speech("Olá, bem-vindo ao meu canal!", "output/intro.mp3")
"""

import base64
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

from claude_capabilities.cost import CostTracker
from claude_capabilities.keys import get_optional

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# PILAR 1: CONHECIMENTO DE ESPECIALISTA EM NARRAÇÃO
# Ritmo, pausas, entonação por tipo de conteúdo
# ═══════════════════════════════════════════════════════════════════

VOICE_PROFILES = {
    "narrator": {
        "description": "Narrador profissional, documentário, confiável",
        "elevenlabs_voice": "onwK4e9ZLuTAKqWW03F9",  # Daniel
        "xtts_voice": "Claribel Dervla",
        "edge_voice": "pt-BR-AntonioNeural",
        "settings": {"stability": 0.7, "similarity": 0.8, "style": 0.3},
        "script_rules": [
            "Frases curtas, máximo 15 palavras",
            "Pausas entre ideias (usar ...)",
            "Evitar palavras difíceis de pronunciar",
        ],
    },
    "energetic": {
        "description": "Entusiasta, vendas, YouTube intro",
        "elevenlabs_voice": "EXAVITQu4vr4xnSDxMaL",  # Bella
        "xtts_voice": "Tammie Ema",
        "edge_voice": "pt-BR-FranciscaNeural",
        "settings": {"stability": 0.5, "similarity": 0.75, "style": 0.6},
        "script_rules": [
            "Exclamações estratégicas (!)",
            "Ritmo acelerado",
            "Palavras de impacto",
        ],
    },
    "calm": {
        "description": "Relaxante, meditação, explicativo",
        "elevenlabs_voice": "pNInz6obpgDQGcFmaJgB",  # Adam
        "xtts_voice": "Damien Black",
        "edge_voice": "pt-BR-AntonioNeural",
        "settings": {"stability": 0.9, "similarity": 0.85, "style": 0.1},
        "script_rules": [
            "Frases longas e fluidas",
            "Muitas pausas (...)",
            "Tom baixo e constante",
        ],
    },
    "conversational": {
        "description": "Podcast, conversa natural, storytelling",
        "elevenlabs_voice": "TxGEqnHWrfWFTfGW9XjX",  # Josh
        "xtts_voice": "Claribel Dervla",
        "edge_voice": "pt-BR-AntonioNeural",
        "settings": {"stability": 0.6, "similarity": 0.7, "style": 0.4},
        "script_rules": [
            "Contrações naturais (tá, né, pra)",
            "Hesitações ocasionais (tipo, então)",
            "Perguntas retóricas",
        ],
    },
    "urgent": {
        "description": "Urgência, escassez, call-to-action",
        "elevenlabs_voice": "EXAVITQu4vr4xnSDxMaL",  # Bella
        "xtts_voice": "Tammie Ema",
        "edge_voice": "pt-BR-FranciscaNeural",
        "settings": {"stability": 0.4, "similarity": 0.8, "style": 0.7},
        "script_rules": [
            "Frases curtas e impactantes",
            "Pausas dramáticas antes do CTA",
            "Ênfase em números e prazos",
        ],
    },
}

# Markers para controle de fala
SPEECH_MARKERS = {
    "pause_short": "...",       # 0.3s pause
    "pause_long": "......",     # 0.8s pause
    "emphasis": "*palavra*",    # Emphasis (ElevenLabs SSML)
    "slow": "[slow]texto[/slow]",
    "fast": "[fast]texto[/fast]",
}


def enhance_script(
    text: str,
    voice_style: str = "narrator",
    add_pauses: bool = True,
    duration_target: Optional[int] = None,
) -> dict:
    """
    Pilar 1: Transforma texto cru em script otimizado para TTS.
    
    Args:
        text: Raw text to convert
        voice_style: narrator, energetic, calm, conversational, urgent
        add_pauses: Add natural pauses between sentences
        duration_target: Target duration in seconds (will adjust pacing)
    
    Returns:
        dict with: enhanced_script, voice_settings, estimated_duration
    """
    profile = VOICE_PROFILES.get(voice_style, VOICE_PROFILES["narrator"])
    
    # Count words for duration estimate (avg 150 words/min in Portuguese)
    word_count = len(text.split())
    estimated_duration = (word_count / 150) * 60  # seconds
    
    # Basic script enhancement
    enhanced = text
    
    # Add pauses after periods and commas
    if add_pauses:
        enhanced = enhanced.replace(". ", "... ")
        enhanced = enhanced.replace("! ", "!... ")
        enhanced = enhanced.replace("? ", "?... ")
    
    # Adjust for target duration if specified
    pacing_note = ""
    if duration_target:
        if estimated_duration > duration_target * 1.2:
            pacing_note = "FALAR MAIS RÁPIDO - texto longo para o tempo"
        elif estimated_duration < duration_target * 0.8:
            pacing_note = "FALAR MAIS DEVAGAR - tempo sobrando"
    
    return {
        "enhanced_script": enhanced,
        "original_script": text,
        "voice_style": voice_style,
        "voice_settings": profile["settings"],
        "voice_id": {
            "elevenlabs": profile["elevenlabs_voice"],
            "xtts": profile["xtts_voice"],
            "edge": profile["edge_voice"],
        },
        "word_count": word_count,
        "estimated_duration_seconds": round(estimated_duration, 1),
        "pacing_note": pacing_note,
        "script_rules": profile["script_rules"],
    }


def _call_elevenlabs(text: str, voice_id: str, settings: dict, output_path: str) -> Optional[str]:
    """Call ElevenLabs API for premium TTS."""
    api_key = get_optional("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": settings.get("stability", 0.7),
            "similarity_boost": settings.get("similarity", 0.8),
            "style": settings.get("style", 0.3),
        },
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "xi-api-key": api_key,
            },
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            audio_data = resp.read()
            
            # Save to file
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(audio_data)
            
            # Track cost (~$0.30 per 1000 characters)
            char_count = len(text)
            cost = (char_count / 1000) * 0.30
            tracker.add_custom("elevenlabs", cost)
            
            return output_path
    except Exception as e:
        print(f"[audio.py] ElevenLabs error: {e}")
        return None


def _call_xtts_runpod(text: str, voice: str, output_path: str) -> Optional[str]:
    """Call XTTS on RunPod for cheaper TTS."""
    api_key = get_optional("RUNPOD_API_KEY")
    if not api_key:
        return None
    
    # RunPod XTTS endpoint (proxy URL)
    # This would need to be configured with your specific RunPod instance
    proxy_url = "https://api.runpod.ai/v2/xtts/runsync"  # Example
    
    payload = {
        "input": {
            "text": text,
            "voice": voice,
            "language": "pt",
        },
    }
    
    try:
        req = urllib.request.Request(
            proxy_url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            
            # Decode base64 audio
            audio_b64 = data.get("output", {}).get("audio")
            if audio_b64:
                audio_data = base64.b64decode(audio_b64)
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as f:
                    f.write(audio_data)
                
                # Track cost (~$0.02 per generation)
                tracker.add_custom("xtts_runpod", 0.02)
                
                return output_path
    except Exception as e:
        print(f"[audio.py] XTTS/RunPod error: {e}")
        return None
    
    return None


def _call_edge_tts(text: str, voice: str, output_path: str) -> Optional[str]:
    """Call Edge TTS (free, local)."""
    import subprocess
    
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        result = subprocess.run(
            ["edge-tts", "--voice", voice, "--text", text, "--write-media", output_path],
            capture_output=True,
            timeout=60,
        )
        
        if result.returncode == 0 and Path(output_path).exists():
            # Free!
            tracker.add_custom("edge_tts", 0.0)
            return output_path
    except Exception as e:
        print(f"[audio.py] Edge-TTS error: {e}")
    
    return None


def generate_speech(
    text: str,
    output_path: str,
    voice_style: str = "narrator",
    dry_run: bool = False,
    provider: Optional[str] = None,  # Force specific provider
) -> dict:
    """
    Generate speech from text.
    
    Args:
        text: Text to convert to speech
        output_path: Where to save the audio file
        voice_style: narrator, energetic, calm, conversational, urgent
        dry_run: If True, only returns preview and cost estimate
        provider: Force specific provider (elevenlabs, xtts, edge)
    
    Returns:
        dict with: path, duration, cost, provider, enhanced_script
    """
    # Enhance script
    script_info = enhance_script(text, voice_style)
    enhanced_text = script_info["enhanced_script"]
    voices = script_info["voice_id"]
    settings = script_info["voice_settings"]
    
    if dry_run:
        # Estimate costs
        char_count = len(text)
        costs = {
            "elevenlabs": round((char_count / 1000) * 0.30, 3),
            "xtts": 0.02,
            "edge": 0.00,
        }
        
        return {
            "dry_run": True,
            "enhanced_script": enhanced_text[:200] + "..." if len(enhanced_text) > 200 else enhanced_text,
            "voice_style": voice_style,
            "estimated_duration": script_info["estimated_duration_seconds"],
            "word_count": script_info["word_count"],
            "cost_by_provider": costs,
            "recommended": "edge" if char_count < 500 else "xtts",  # Free for short, cheap for long
            "script_rules": script_info["script_rules"],
        }
    
    # Pilar 5: Fallback chain
    providers_to_try = []
    
    if provider:
        providers_to_try = [provider]
    else:
        # Default order: Edge (free) → XTTS (cheap) → ElevenLabs (premium)
        providers_to_try = ["edge", "xtts", "elevenlabs"]
    
    for p in providers_to_try:
        result = None
        
        if p == "elevenlabs":
            result = _call_elevenlabs(enhanced_text, voices["elevenlabs"], settings, output_path)
        elif p == "xtts":
            result = _call_xtts_runpod(enhanced_text, voices["xtts"], output_path)
        elif p == "edge":
            result = _call_edge_tts(enhanced_text, voices["edge"], output_path)
        
        if result:
            return {
                "path": result,
                "provider": p,
                "voice_style": voice_style,
                "duration_seconds": script_info["estimated_duration_seconds"],
                "cost": tracker.get_session_cost(),
            }
    
    return {"error": "All TTS providers failed", "path": None}


# Available voice styles
VOICE_STYLES = list(VOICE_PROFILES.keys())

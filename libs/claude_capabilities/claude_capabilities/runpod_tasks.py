"""
RunPod GPU Tasks Library.

Capabilities available on RunPod:
- TTS (XTTS)
- Image Generation (Stable Diffusion)
- Video Generation (SVD)
- Transcription (Whisper)
- Upscaling (Real-ESRGAN)
- Background Removal (RMBG)
- Face Tasks (InsightFace)
- LLM Inference (Local models)
"""

import base64
import json
import time
import urllib.request
from pathlib import Path
from typing import Optional

from claude_capabilities.keys import get, get_optional
from claude_capabilities.cost import CostTracker

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# RUNPOD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

RUNPOD_ENDPOINTS = {
    "xtts": {
        "endpoint_id": None,  # Set via env or config
        "cost_per_run": 0.02,
        "timeout": 120,
    },
    "stable_diffusion": {
        "endpoint_id": None,
        "cost_per_run": 0.01,
        "timeout": 60,
    },
    "whisper": {
        "endpoint_id": None,
        "cost_per_run": 0.01,  # Per minute
        "timeout": 300,
    },
    "upscale": {
        "endpoint_id": None,
        "cost_per_run": 0.01,
        "timeout": 60,
    },
    "remove_bg": {
        "endpoint_id": None,
        "cost_per_run": 0.01,
        "timeout": 30,
    },
}


def _call_runpod_sync(endpoint_id: str, payload: dict, timeout: int = 120) -> Optional[dict]:
    """Make synchronous call to RunPod endpoint."""
    api_key = get_optional("RUNPOD_API_KEY")
    if not api_key or not endpoint_id:
        return None
    
    url = f"https://api.runpod.ai/v2/{endpoint_id}/runsync"
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps({"input": payload}).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"[runpod] Error: {e}")
        return None


def _call_runpod_async(endpoint_id: str, payload: dict) -> Optional[str]:
    """Start async job on RunPod, return job ID."""
    api_key = get_optional("RUNPOD_API_KEY")
    if not api_key or not endpoint_id:
        return None
    
    url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps({"input": payload}).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data.get("id")
    except Exception as e:
        print(f"[runpod] Error: {e}")
        return None


def _poll_runpod_job(endpoint_id: str, job_id: str, timeout: int = 300) -> Optional[dict]:
    """Poll for async job completion."""
    api_key = get_optional("RUNPOD_API_KEY")
    if not api_key:
        return None
    
    url = f"https://api.runpod.ai/v2/{endpoint_id}/status/{job_id}"
    
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                
            status = data.get("status")
            
            if status == "COMPLETED":
                return data.get("output")
            elif status in ["FAILED", "CANCELLED"]:
                print(f"[runpod] Job {status}: {data}")
                return None
            
            time.sleep(2)
        except Exception as e:
            print(f"[runpod] Poll error: {e}")
            time.sleep(5)
    
    return None


# ═══════════════════════════════════════════════════════════════════
# TASK FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def xtts_generate(
    text: str,
    voice: str = "Claribel Dervla",
    language: str = "pt",
    output_path: str = "output/audio.wav",
) -> Optional[str]:
    """Generate speech using XTTS on RunPod."""
    endpoint_id = get_optional("RUNPOD_XTTS_ENDPOINT")
    if not endpoint_id:
        print("[runpod] RUNPOD_XTTS_ENDPOINT not set")
        return None
    
    result = _call_runpod_sync(
        endpoint_id,
        {"text": text, "voice": voice, "language": language},
        timeout=120,
    )
    
    if result and result.get("output", {}).get("audio"):
        audio_b64 = result["output"]["audio"]
        audio_data = base64.b64decode(audio_b64)
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(audio_data)
        
        tracker.add_custom("runpod_xtts", 0.02)
        return output_path
    
    return None


def stable_diffusion_generate(
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    output_path: str = "output/image.png",
) -> Optional[str]:
    """Generate image using Stable Diffusion on RunPod."""
    endpoint_id = get_optional("RUNPOD_SD_ENDPOINT")
    if not endpoint_id:
        print("[runpod] RUNPOD_SD_ENDPOINT not set")
        return None
    
    result = _call_runpod_sync(
        endpoint_id,
        {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
        },
        timeout=60,
    )
    
    if result and result.get("output", {}).get("image"):
        image_b64 = result["output"]["image"]
        image_data = base64.b64decode(image_b64)
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(image_data)
        
        tracker.add_custom("runpod_sd", 0.01)
        return output_path
    
    return None


def whisper_transcribe(
    audio_path: str,
    language: str = "pt",
) -> Optional[dict]:
    """Transcribe audio using Whisper on RunPod."""
    endpoint_id = get_optional("RUNPOD_WHISPER_ENDPOINT")
    if not endpoint_id:
        print("[runpod] RUNPOD_WHISPER_ENDPOINT not set")
        return None
    
    # Read and encode audio
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode()
    
    result = _call_runpod_sync(
        endpoint_id,
        {"audio": audio_b64, "language": language},
        timeout=300,
    )
    
    if result and result.get("output"):
        tracker.add_custom("runpod_whisper", 0.01)
        return result["output"]
    
    return None


def upscale_image(
    image_path: str,
    scale: int = 4,
    output_path: str = "output/upscaled.png",
) -> Optional[str]:
    """Upscale image using Real-ESRGAN on RunPod."""
    endpoint_id = get_optional("RUNPOD_UPSCALE_ENDPOINT")
    if not endpoint_id:
        print("[runpod] RUNPOD_UPSCALE_ENDPOINT not set")
        return None
    
    # Read and encode image
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()
    
    result = _call_runpod_sync(
        endpoint_id,
        {"image": image_b64, "scale": scale},
        timeout=60,
    )
    
    if result and result.get("output", {}).get("image"):
        upscaled_b64 = result["output"]["image"]
        upscaled_data = base64.b64decode(upscaled_b64)
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(upscaled_data)
        
        tracker.add_custom("runpod_upscale", 0.01)
        return output_path
    
    return None


def remove_background(
    image_path: str,
    output_path: str = "output/no_bg.png",
) -> Optional[str]:
    """Remove background from image on RunPod."""
    endpoint_id = get_optional("RUNPOD_RMBG_ENDPOINT")
    if not endpoint_id:
        print("[runpod] RUNPOD_RMBG_ENDPOINT not set")
        return None
    
    # Read and encode image
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()
    
    result = _call_runpod_sync(
        endpoint_id,
        {"image": image_b64},
        timeout=30,
    )
    
    if result and result.get("output", {}).get("image"):
        nobg_b64 = result["output"]["image"]
        nobg_data = base64.b64decode(nobg_b64)
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(nobg_data)
        
        tracker.add_custom("runpod_rmbg", 0.01)
        return output_path
    
    return None


# ═══════════════════════════════════════════════════════════════════
# CAPABILITY LIST (for documentation)
# ═══════════════════════════════════════════════════════════════════

RUNPOD_CAPABILITIES = {
    "xtts": {
        "description": "Text-to-speech with multiple voices",
        "languages": ["pt", "en", "es", "fr", "de", "it", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"],
        "voices": 58,
        "cost": "$0.02/generation",
    },
    "stable_diffusion": {
        "description": "Image generation with SDXL",
        "models": ["SDXL 1.0", "SD 1.5", "Custom LoRAs"],
        "max_size": "2048x2048",
        "cost": "$0.01/image",
    },
    "whisper": {
        "description": "Speech-to-text transcription",
        "model": "Whisper Large V3",
        "languages": "99+ languages",
        "cost": "$0.01/minute",
    },
    "upscale": {
        "description": "Image upscaling with Real-ESRGAN",
        "scales": [2, 4],
        "cost": "$0.01/image",
    },
    "remove_bg": {
        "description": "Background removal",
        "model": "RMBG-2.0",
        "cost": "$0.01/image",
    },
    "svd": {
        "description": "Image to video generation",
        "model": "Stable Video Diffusion",
        "duration": "4 seconds",
        "cost": "$0.05/video",
    },
    "llm": {
        "description": "Local LLM inference",
        "models": ["Llama 3", "Mistral", "Qwen"],
        "cost": "$0.10/hour",
    },
}

"""
Video generation engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 1 - Prompt Engineering Encapsulado (cinematic directions)
  Pilar 5 - Fallback Chain (Kling/Fal.ai → Veo → Pexels stock)

Usage:
  from claude_capabilities.video import generate_video, enhance_video_prompt

  # Image-to-video (primary use case for UGC)
  result = generate_video(
      source_image="portrait.png",
      motion_prompt="pessoa falando naturalmente, expressiva",
      output_path="output/clip.mp4",
  )

  # Text-to-video
  result = generate_video(
      text_prompt="cafe sendo servido em camera lenta",
      output_path="output/clip.mp4",
  )
"""

import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

from claude_capabilities.cost import CostTracker
from claude_capabilities.keys import get_optional

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# PILAR 1: CONHECIMENTO DE DIRETOR DE CINEMA
# Movimentos de câmera, ritmo, composição por tipo de vídeo
# ═══════════════════════════════════════════════════════════════════

VIDEO_STYLES = {
    "ugc_talking": {
        "description": "Pessoa falando para câmera, UGC natural",
        "motion_keywords": [
            "subtle head movements",
            "natural eye contact with camera",
            "slight body sway",
            "authentic micro-expressions",
            "occasional hand gestures",
        ],
        "camera": "static medium shot, eye level",
        "avoid": ["robotic", "frozen", "exaggerated movements"],
        "duration_range": (3, 10),  # seconds
    },
    "product_hero": {
        "description": "Produto em destaque, glamour shot",
        "motion_keywords": [
            "slow rotation",
            "subtle light reflection",
            "floating in space",
            "elegant reveal",
        ],
        "camera": "slow orbit, shallow DOF",
        "avoid": ["fast motion", "busy background"],
        "duration_range": (3, 8),
    },
    "lifestyle": {
        "description": "Cena de uso real do produto",
        "motion_keywords": [
            "natural interaction",
            "environmental context",
            "authentic moment",
            "soft movement",
        ],
        "camera": "handheld feel, natural lighting",
        "avoid": ["posed", "artificial"],
        "duration_range": (3, 10),
    },
    "cinematic": {
        "description": "Cinematográfico, dramático",
        "motion_keywords": [
            "epic scale",
            "dramatic lighting",
            "slow motion elements",
            "atmospheric depth",
        ],
        "camera": "sweeping dolly, crane movement",
        "avoid": ["flat", "amateur"],
        "duration_range": (5, 15),
    },
    "dynamic": {
        "description": "Movimento rápido, energia",
        "motion_keywords": [
            "quick cuts feel",
            "energetic motion",
            "action-oriented",
            "punchy rhythm",
        ],
        "camera": "tracking, following action",
        "avoid": ["slow", "static"],
        "duration_range": (2, 5),
    },
}

# Kling-specific parameters via Fal.ai
KLING_CONFIG = {
    "standard": {
        "duration": "5",  # 5 or 10 seconds
        "aspect_ratio": "16:9",
        "cost_per_second": 0.09,  # via Fal.ai
    },
    "pro": {
        "duration": "10",
        "aspect_ratio": "16:9",
        "cost_per_second": 0.12,
    },
}


def enhance_video_prompt(
    base_prompt: str,
    style: str = "ugc_talking",
    source_type: str = "image",  # "image" or "text"
) -> dict:
    """
    Pilar 1: Transforma descrição simples em prompt cinematográfico.
    
    Args:
        base_prompt: User's description ("pessoa falando sobre café")
        style: ugc_talking, product_hero, lifestyle, cinematic, dynamic
        source_type: "image" for image-to-video, "text" for text-to-video
    
    Returns:
        dict with: enhanced_prompt, style_info, duration_recommendation
    """
    style_info = VIDEO_STYLES.get(style, VIDEO_STYLES["ugc_talking"])
    
    motion_description = ", ".join(style_info["motion_keywords"][:3])
    
    if source_type == "image":
        enhanced = f"""
Animate this image with: {base_prompt}

MOTION DIRECTION:
- {motion_description}
- Camera: {style_info['camera']}

IMPORTANT:
- Preserve exact appearance from source image
- Natural, realistic movement
- Avoid: {', '.join(style_info['avoid'])}
"""
    else:
        enhanced = f"""
Create video: {base_prompt}

VISUAL STYLE:
- {style_info['description']}
- Motion: {motion_description}
- Camera: {style_info['camera']}

QUALITY:
- Cinematic color grading
- High production value
- Avoid: {', '.join(style_info['avoid'])}
"""
    
    return {
        "enhanced_prompt": enhanced.strip(),
        "style": style,
        "source_type": source_type,
        "recommended_duration": style_info["duration_range"],
        "camera_direction": style_info["camera"],
        "motion_keywords": style_info["motion_keywords"],
    }


def _call_kling_fal(
    prompt: str,
    image_path: Optional[str] = None,
    duration: int = 5,
    output_path: str = "output/video.mp4",
) -> Optional[str]:
    """
    Call Kling via Fal.ai for video generation.
    
    Kling is best for:
    - Image-to-video (first frame reference)
    - Realistic human motion
    - UGC-style content
    """
    api_key = get_optional("FAL_KEY")
    if not api_key:
        return None
    
    # Fal.ai endpoint for Kling
    url = "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video"
    
    # Read image if provided
    image_data = None
    if image_path and Path(image_path).exists():
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()
    
    payload = {
        "prompt": prompt,
        "duration": str(duration),
        "aspect_ratio": "16:9",
    }
    
    if image_data:
        payload["image_url"] = f"data:image/png;base64,{image_data}"
    
    try:
        # Submit job
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Key {api_key}",
            },
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            request_id = data.get("request_id")
        
        if not request_id:
            return None
        
        # Poll for result
        status_url = f"https://queue.fal.run/fal-ai/kling-video/requests/{request_id}/status"
        
        for _ in range(60):  # Max 5 minutes
            time.sleep(5)
            
            req = urllib.request.Request(
                status_url,
                headers={"Authorization": f"Key {api_key}"},
            )
            
            with urllib.request.urlopen(req, timeout=30) as resp:
                status_data = json.loads(resp.read())
                
            if status_data.get("status") == "COMPLETED":
                video_url = status_data.get("response", {}).get("video", {}).get("url")
                
                if video_url:
                    # Download video
                    with urllib.request.urlopen(video_url) as video_resp:
                        video_data = video_resp.read()
                    
                    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, "wb") as f:
                        f.write(video_data)
                    
                    # Track cost
                    cost = duration * 0.09
                    tracker.add_custom("kling_fal", cost)
                    
                    return output_path
                    
            elif status_data.get("status") == "FAILED":
                print(f"[video.py] Kling failed: {status_data}")
                return None
                
    except Exception as e:
        print(f"[video.py] Kling/Fal.ai error: {e}")
        return None
    
    return None


def _get_pexels_video(query: str, output_path: str) -> Optional[str]:
    """Fallback: Get stock video from Pexels (free)."""
    api_key = get_optional("PEXELS_API_KEY")
    if not api_key:
        return None
    
    url = f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&per_page=1"
    
    try:
        req = urllib.request.Request(
            url,
            headers={"Authorization": api_key},
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        
        videos = data.get("videos", [])
        if not videos:
            return None
        
        # Get HD video file
        video_files = videos[0].get("video_files", [])
        hd_file = next(
            (f for f in video_files if f.get("quality") == "hd"),
            video_files[0] if video_files else None
        )
        
        if not hd_file:
            return None
        
        video_url = hd_file.get("link")
        
        # Download video
        with urllib.request.urlopen(video_url) as video_resp:
            video_data = video_resp.read()
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(video_data)
        
        # Free!
        tracker.add_custom("pexels_video", 0.0)
        
        return output_path
        
    except Exception as e:
        print(f"[video.py] Pexels error: {e}")
        return None


def generate_video(
    text_prompt: Optional[str] = None,
    source_image: Optional[str] = None,
    motion_prompt: Optional[str] = None,
    output_path: str = "output/video.mp4",
    style: str = "ugc_talking",
    duration: int = 5,
    dry_run: bool = False,
    provider: Optional[str] = None,  # Force specific provider
) -> dict:
    """
    Generate video from text or image.
    
    Args:
        text_prompt: For text-to-video generation
        source_image: Path to source image for image-to-video
        motion_prompt: Motion description for image-to-video
        output_path: Where to save the video
        style: ugc_talking, product_hero, lifestyle, cinematic, dynamic
        duration: Video duration in seconds (5 or 10 for Kling)
        dry_run: If True, only returns preview and cost estimate
        provider: Force specific provider (kling, pexels)
    
    Returns:
        dict with: path, duration, cost, provider, enhanced_prompt
    """
    # Determine source type and prompt
    if source_image and Path(source_image).exists():
        source_type = "image"
        base_prompt = motion_prompt or "natural subtle movement"
    elif text_prompt:
        source_type = "text"
        base_prompt = text_prompt
    else:
        return {"error": "Provide either text_prompt or source_image", "path": None}
    
    # Enhance prompt
    enhanced = enhance_video_prompt(base_prompt, style, source_type)
    
    if dry_run:
        costs = {
            "kling": round(duration * 0.09, 2),
            "pexels": 0.00,
        }
        
        return {
            "dry_run": True,
            "enhanced_prompt": enhanced["enhanced_prompt"],
            "style": style,
            "source_type": source_type,
            "duration": duration,
            "cost_by_provider": costs,
            "recommended": "kling" if source_image else "pexels",
            "note": "Kling recommended for image-to-video (UGC). Pexels for stock B-roll.",
        }
    
    # Pilar 5: Fallback chain
    providers_to_try = []
    
    if provider:
        providers_to_try = [provider]
    elif source_image:
        # For image-to-video, Kling is the only real option
        providers_to_try = ["kling"]
    else:
        # For text prompts, try Pexels stock first (free)
        providers_to_try = ["pexels", "kling"]
    
    for p in providers_to_try:
        result = None
        
        if p == "kling":
            result = _call_kling_fal(
                enhanced["enhanced_prompt"],
                source_image,
                duration,
                output_path,
            )
        elif p == "pexels":
            # Extract key search term from prompt
            search_query = base_prompt.split(",")[0].strip()
            result = _get_pexels_video(search_query, output_path)
        
        if result:
            return {
                "path": result,
                "provider": p,
                "style": style,
                "duration": duration,
                "source_type": source_type,
                "cost": tracker.get_session_cost(),
            }
    
    return {"error": "All video providers failed", "path": None}


# Available styles
VIDEO_STYLE_OPTIONS = list(VIDEO_STYLES.keys())

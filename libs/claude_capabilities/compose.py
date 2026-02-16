"""
Composition engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 2 - Composição Automática
  Orchestrates atomic skills into composite workflows

Usage:
  from claude_capabilities.compose import run_pipeline, detect_pipeline

  # Auto-detect what's needed
  pipeline = detect_pipeline("cria um post pro meu café")
  # Returns: ["image-gen", "copywriter"] + suggested order

  # Run a pipeline
  result = run_pipeline(
      pipeline=["image-gen", "copywriter"],
      context={"product": "café artesanal", "platform": "instagram"},
  )
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from claude_capabilities.cost import CostTracker

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# PIPELINE DEFINITIONS
# Each composite skill = sequence of atomic skills
# ═══════════════════════════════════════════════════════════════════

PIPELINES = {
    "content-pack": {
        "description": "Imagem + Copy + Hashtags para social media",
        "steps": [
            {
                "skill": "image-gen",
                "input_from": "context.product",
                "output_key": "image_path",
                "config": {"style": "lifestyle"},
            },
            {
                "skill": "copywriter",
                "input_from": "context.product",
                "output_key": "copy",
                "config": {"copy_type": "social_post", "platform": "context.platform"},
            },
        ],
        "final_output": ["image_path", "copy"],
        "estimated_cost": 0.06,
        "estimated_time": "30-60 seconds",
    },
    "landing-page": {
        "description": "Copy + Imagem + HTML + Deploy (entrega URL viva)",
        "steps": [
            {
                "skill": "copywriter",
                "input_from": "context.product",
                "output_key": "headline",
                "config": {"copy_type": "headline"},
            },
            {
                "skill": "copywriter",
                "input_from": "context.product",
                "output_key": "description",
                "config": {"copy_type": "description"},
            },
            {
                "skill": "copywriter",
                "input_from": "context.product",
                "output_key": "cta",
                "config": {"copy_type": "cta"},
            },
            {
                "skill": "image-gen",
                "input_from": "context.product",
                "output_key": "hero_image",
                "config": {"style": "hero"},
            },
            {
                "skill": "deploy-page",
                "input_from": "generated.html",
                "output_key": "url",
                "config": {},
            },
        ],
        "template": "landing",
        "final_output": ["url", "headline", "description", "hero_image"],
        "estimated_cost": 0.10,
        "estimated_time": "2-3 minutes",
    },
    "ugc-video": {
        "description": "Personagem + Cenas + Vídeo + TTS + Montagem",
        "steps": [
            {
                "skill": "image-gen",
                "input_from": "context.character_description",
                "output_key": "character_portrait",
                "config": {"style": "portrait"},
            },
            {
                "skill": "image-gen",
                "input_from": "context.scene_descriptions",
                "output_key": "scene_images",
                "config": {"style": "lifestyle", "multiple": True},
            },
            {
                "skill": "video-gen",
                "input_from": "generated.scene_images",
                "output_key": "video_clips",
                "config": {"style": "ugc_talking"},
            },
            {
                "skill": "tts",
                "input_from": "context.script",
                "output_key": "voiceover",
                "config": {"voice_style": "conversational"},
            },
            {
                "skill": "montage",
                "input_from": ["generated.video_clips", "generated.voiceover"],
                "output_key": "final_video",
                "config": {},
            },
        ],
        "final_output": ["final_video", "character_portrait"],
        "estimated_cost": 5.00,
        "estimated_time": "5-10 minutes",
    },
    "stories-pack": {
        "description": "Sequência de 3-5 stories com texto + imagem",
        "steps": [
            {
                "skill": "copywriter",
                "input_from": "context.topic",
                "output_key": "story_texts",
                "config": {"copy_type": "social_post", "count": 5},
            },
            {
                "skill": "image-gen",
                "input_from": "generated.story_texts",
                "output_key": "story_images",
                "config": {"style": "minimal", "aspect_ratio": "9:16"},
            },
        ],
        "final_output": ["story_images", "story_texts"],
        "estimated_cost": 0.20,
        "estimated_time": "2-3 minutes",
    },
}

# Keywords that map to pipelines
PIPELINE_TRIGGERS = {
    "content-pack": [
        "post", "conteúdo", "social", "instagram", "feed",
        "publicação", "content", "mídia social",
    ],
    "landing-page": [
        "landing", "página", "site", "lp", "captura",
        "lead", "página de vendas", "hotsite",
    ],
    "ugc-video": [
        "vídeo ugc", "vídeo", "ugc", "testemunho",
        "depoimento", "reels", "tiktok", "video ad",
    ],
    "stories-pack": [
        "stories", "story", "carrossel", "sequência",
        "carousel", "série de posts",
    ],
}


def detect_pipeline(user_input: str) -> dict:
    """
    Auto-detect which pipeline best fits the user's request.
    
    Args:
        user_input: User's natural language request
    
    Returns:
        dict with: pipeline_name, confidence, description, steps, cost
    """
    lower_input = user_input.lower()
    
    matches = []
    
    for pipeline_name, triggers in PIPELINE_TRIGGERS.items():
        score = 0
        matched_keywords = []
        
        for trigger in triggers:
            if trigger in lower_input:
                score += 1
                matched_keywords.append(trigger)
        
        if score > 0:
            matches.append({
                "pipeline": pipeline_name,
                "score": score,
                "matched_keywords": matched_keywords,
            })
    
    # Sort by score
    matches.sort(key=lambda x: x["score"], reverse=True)
    
    if matches:
        best = matches[0]
        pipeline_info = PIPELINES[best["pipeline"]]
        
        return {
            "detected": True,
            "pipeline_name": best["pipeline"],
            "confidence": min(best["score"] / 3, 1.0),  # Normalize
            "matched_keywords": best["matched_keywords"],
            "description": pipeline_info["description"],
            "steps": [s["skill"] for s in pipeline_info["steps"]],
            "estimated_cost": pipeline_info["estimated_cost"],
            "estimated_time": pipeline_info["estimated_time"],
            "alternatives": [m["pipeline"] for m in matches[1:3]],
        }
    
    return {
        "detected": False,
        "suggestion": "Use atomic skills directly: image-gen, copywriter, tts, video-gen",
        "available_pipelines": list(PIPELINES.keys()),
    }


def _run_skill(
    skill_name: str,
    input_data: Any,
    config: dict,
    output_dir: str,
) -> dict:
    """
    Run a single atomic skill.
    
    This calls the skill's script with appropriate arguments.
    """
    skills_dir = Path(__file__).parent / "skills"
    script_path = skills_dir / skill_name / "scripts" / "generate.py"
    
    if not script_path.exists():
        # Try orchestrate.py for composite skills
        script_path = skills_dir / skill_name / "scripts" / "orchestrate.py"
    
    if not script_path.exists():
        return {"error": f"Skill script not found: {skill_name}"}
    
    # Build command (use sys.executable to find the correct Python on any OS)
    cmd = [sys.executable, str(script_path)]
    
    # Add input
    if isinstance(input_data, str):
        cmd.extend(["--prompt", input_data])
    elif isinstance(input_data, dict):
        cmd.extend(["--input", json.dumps(input_data)])
    
    # Add config
    for key, value in config.items():
        if value and not key.startswith("context."):
            cmd.extend([f"--{key.replace('_', '-')}", str(value)])
    
    # Add output
    output_file = os.path.join(output_dir, f"{skill_name}_output")
    cmd.extend(["--output", output_file])
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min max per skill
        )
        
        if result.returncode == 0:
            # Try to parse JSON output
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"output": result.stdout.strip(), "path": output_file}
        else:
            return {"error": result.stderr}
    except Exception as e:
        return {"error": str(e)}


def run_pipeline(
    pipeline: str,
    context: dict,
    output_dir: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """
    Run a complete pipeline.
    
    Args:
        pipeline: Pipeline name from PIPELINES
        context: Input context (product, platform, etc.)
        output_dir: Where to save outputs (default: output/{pipeline}_{timestamp})
        dry_run: If True, only returns plan without executing
    
    Returns:
        dict with: outputs (per step), final_output, total_cost, total_time
    """
    if pipeline not in PIPELINES:
        return {
            "error": f"Unknown pipeline: {pipeline}",
            "available": list(PIPELINES.keys()),
        }
    
    pipeline_def = PIPELINES[pipeline]
    
    # Create output directory
    if not output_dir:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"output/{pipeline}_{timestamp}"
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    if dry_run:
        return {
            "dry_run": True,
            "pipeline": pipeline,
            "description": pipeline_def["description"],
            "steps": [
                {
                    "skill": step["skill"],
                    "input": step["input_from"],
                    "output": step["output_key"],
                }
                for step in pipeline_def["steps"]
            ],
            "estimated_cost": pipeline_def["estimated_cost"],
            "estimated_time": pipeline_def["estimated_time"],
            "output_dir": output_dir,
            "context_required": list(context.keys()) if context else ["product"],
        }
    
    # Execute steps
    generated = {}
    step_results = []
    
    for i, step in enumerate(pipeline_def["steps"]):
        print(f"[compose.py] Step {i+1}/{len(pipeline_def['steps'])}: {step['skill']}")
        
        # Resolve input
        input_from = step["input_from"]
        if input_from.startswith("context."):
            input_data = context.get(input_from.replace("context.", ""))
        elif input_from.startswith("generated."):
            input_data = generated.get(input_from.replace("generated.", ""))
        elif isinstance(input_from, list):
            input_data = {k.replace("generated.", ""): generated.get(k.replace("generated.", "")) for k in input_from}
        else:
            input_data = input_from
        
        # Resolve config
        config = {}
        for k, v in step.get("config", {}).items():
            if isinstance(v, str) and v.startswith("context."):
                config[k] = context.get(v.replace("context.", ""))
            else:
                config[k] = v
        
        # Run skill
        result = _run_skill(
            step["skill"],
            input_data,
            config,
            output_dir,
        )
        
        # Store output
        generated[step["output_key"]] = result.get("output") or result.get("path") or result
        
        step_results.append({
            "skill": step["skill"],
            "success": "error" not in result,
            "output_key": step["output_key"],
            "result": result,
        })
        
        # Stop on error
        if "error" in result:
            return {
                "error": f"Pipeline failed at step {i+1}: {step['skill']}",
                "step_results": step_results,
                "partial_outputs": generated,
            }
    
    return {
        "success": True,
        "pipeline": pipeline,
        "step_results": step_results,
        "outputs": generated,
        "final_output": {k: generated.get(k) for k in pipeline_def["final_output"]},
        "output_dir": output_dir,
        "total_cost": tracker.get_session_cost(),
    }


# Available pipelines
AVAILABLE_PIPELINES = list(PIPELINES.keys())

#!/usr/bin/env python3
"""
TTS skill CLI.

Usage:
  python generate.py --text "Olá mundo" --style narrator --dry-run
  python generate.py --text "Olá mundo" --style narrator --output output/audio.mp3
  python generate.py --file script.txt --style conversational --output output/audio.mp3
"""

import argparse
import json
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from claude_capabilities.audio import generate_speech, VOICE_STYLES


def main():
    parser = argparse.ArgumentParser(description="Generate speech from text")
    
    # Input options (mutually exclusive)
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--text", "-t", help="Text to convert to speech")
    input_group.add_argument("--file", "-f", help="File containing text")
    
    # Voice options
    parser.add_argument("--style", "-s", default="narrator", choices=VOICE_STYLES,
                        help=f"Voice style: {', '.join(VOICE_STYLES)}")
    parser.add_argument("--provider", "-p", choices=["elevenlabs", "xtts", "edge"],
                        help="Force specific provider")
    
    # Output options
    parser.add_argument("--output", "-o", default="output/audio.mp3",
                        help="Output file path")
    parser.add_argument("--dry-run", action="store_true", help="Preview without generating")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    # Get text
    if args.file:
        with open(args.file, "r") as f:
            text = f.read()
    else:
        text = args.text
    
    # Generate
    result = generate_speech(
        text=text,
        output_path=args.output,
        voice_style=args.style,
        dry_run=args.dry_run,
        provider=args.provider,
    )
    
    # Handle dry-run
    if args.dry_run:
        print("\n" + "="*60)
        print("🔍 DRY-RUN: Preview do que será gerado")
        print("="*60)
        print(f"\n🎭 Estilo: {args.style}")
        print(f"📝 Palavras: {result.get('word_count', 0)}")
        print(f"⏱️  Duração estimada: {result.get('estimated_duration', 0)}s")
        
        print(f"\n💰 Custo por provider:")
        for provider, cost in result.get("cost_by_provider", {}).items():
            emoji = "🆓" if cost == 0 else "💵"
            print(f"   {emoji} {provider}: ${cost:.3f}")
        
        print(f"\n💡 Recomendado: {result.get('recommended', 'edge')}")
        
        if result.get("script_rules"):
            print(f"\n📋 Regras do estilo:")
            for rule in result["script_rules"]:
                print(f"   • {rule}")
        
        print(f"\n📄 Preview do script otimizado:")
        print(f"   \"{result.get('enhanced_script', '')}\"")
        
        print("\n" + "="*60)
        print("Execute sem --dry-run para gerar o áudio")
        print("="*60 + "\n")
        return
    
    # Handle error
    if result.get("error"):
        print(f"❌ Erro: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    # Output
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("\n" + "="*60)
        print("🔊 ÁUDIO GERADO")
        print("="*60)
        print(f"\n📁 Arquivo: {result.get('path', args.output)}")
        print(f"🎭 Estilo: {result.get('voice_style', args.style)}")
        print(f"⏱️  Duração: ~{result.get('duration_seconds', 0)}s")
        print(f"🤖 Provider: {result.get('provider', 'unknown')}")
        print(f"💰 Custo: ${result.get('cost', 0):.4f}")
        print("="*60 + "\n")


if __name__ == "__main__":
    main()

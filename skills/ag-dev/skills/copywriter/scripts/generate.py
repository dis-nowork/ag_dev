#!/usr/bin/env python3
"""
Copywriter skill CLI.

Usage:
  python generate.py --prompt "headline pro meu café" --type headline --dry-run
  python generate.py --prompt "headline pro meu café" --type headline --output output/headline.txt
  python generate.py --iterate-from "Café Premium" --iterate-instruction "mais urgente"
"""

import argparse
import json
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from claude_capabilities.text import generate_copy, COPY_TYPES, TONES


def main():
    parser = argparse.ArgumentParser(description="Generate professional copy")
    
    # Input options
    parser.add_argument("--prompt", "-p", help="What to write copy for")
    parser.add_argument("--type", "-t", default="description", choices=COPY_TYPES,
                        help=f"Type of copy: {', '.join(COPY_TYPES)}")
    parser.add_argument("--tone", default="autoridade", choices=TONES,
                        help=f"Tone of voice: {', '.join(TONES)}")
    parser.add_argument("--platform", help="Target platform (instagram, linkedin, twitter, facebook)")
    parser.add_argument("--brand-context", help="Brand voice/context info")
    
    # Iteration options (Pilar 4)
    parser.add_argument("--iterate-from", help="Previous copy to iterate on")
    parser.add_argument("--iterate-instruction", help="How to change it")
    
    # Output options
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--dry-run", action="store_true", help="Preview without generating")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    # Validate input
    if not args.prompt and not args.iterate_from:
        parser.error("Either --prompt or --iterate-from is required")
    
    # Generate
    result = generate_copy(
        user_input=args.prompt or "",
        copy_type=args.type,
        tone=args.tone,
        platform=args.platform,
        brand_context=args.brand_context,
        dry_run=args.dry_run,
        iterate_from=args.iterate_from,
        iterate_instruction=args.iterate_instruction,
    )
    
    # Handle dry-run
    if args.dry_run:
        print("\n" + "="*60)
        print("🔍 DRY-RUN: Preview do que será gerado")
        print("="*60)
        print(f"\n📝 Tipo: {args.type}")
        print(f"🎭 Tom: {args.tone}")
        if args.platform:
            print(f"📱 Plataforma: {args.platform}")
        print(f"\n💰 Custo estimado: ${result.get('estimated_cost', 0):.4f}")
        print(f"\n📋 Preview: {result.get('preview', '')}")
        
        if result.get("framework"):
            print(f"\n📐 Estrutura: {result['framework'].get('structure', '')}")
            print(f"🎯 Técnicas: {', '.join(result['framework'].get('techniques', []))}")
        
        print("\n" + "="*60)
        print("Execute sem --dry-run para gerar o copy")
        print("="*60 + "\n")
        return
    
    # Handle error
    if result.get("error"):
        print(f"❌ Erro: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    # Get copy
    copy = result.get("copy", "")
    
    # Output
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w") as f:
            f.write(copy)
        print(f"✅ Copy salvo em: {args.output}")
        print(f"💰 Custo: ${result.get('cost', 0):.4f}")
        print(f"🤖 Provider: {result.get('provider', 'unknown')}")
    else:
        print("\n" + "="*60)
        print("📝 COPY GERADO")
        print("="*60)
        print(f"\n{copy}\n")
        print("="*60)
        print(f"💰 Custo: ${result.get('cost', 0):.4f}")
        print(f"🤖 Provider: {result.get('provider', 'unknown')}")
        if result.get("iteration"):
            print("🔄 Modo: Iteração")
        print("="*60 + "\n")


if __name__ == "__main__":
    main()

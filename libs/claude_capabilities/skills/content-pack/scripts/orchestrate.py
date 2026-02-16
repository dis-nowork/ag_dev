#!/usr/bin/env python3
"""
Content Pack orchestrator - combines image-gen + copywriter.

Usage:
  python orchestrate.py --product "café artesanal" --platform instagram --dry-run
  python orchestrate.py --product "café artesanal" --platform instagram --output-dir output/post
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent))

from claude_capabilities.image import generate_image
from claude_capabilities.text import generate_copy


# Platform-specific configurations
PLATFORM_CONFIG = {
    "instagram": {
        "image_style": "lifestyle",
        "image_aspect": "1:1",  # Square for feed
        "copy_type": "social_post",
        "copy_tone": "casual",
        "max_hashtags": 20,
    },
    "linkedin": {
        "image_style": "minimal",
        "image_aspect": "1.91:1",  # LinkedIn recommended
        "copy_type": "social_post",
        "copy_tone": "autoridade",
        "max_hashtags": 5,
    },
    "twitter": {
        "image_style": "hero",
        "image_aspect": "16:9",
        "copy_type": "social_post",
        "copy_tone": "provocativo",
        "max_hashtags": 3,
    },
    "facebook": {
        "image_style": "lifestyle",
        "image_aspect": "1.91:1",
        "copy_type": "social_post",
        "copy_tone": "conversational",
        "max_hashtags": 5,
    },
}


def generate_hashtags(product: str, platform: str, max_tags: int = 20) -> list:
    """Generate relevant hashtags for the product and platform."""
    # This would ideally call an LLM, but for now we generate based on product keywords
    words = product.lower().replace(",", " ").split()
    
    base_tags = []
    for word in words:
        if len(word) > 3:
            base_tags.append(f"#{word}")
    
    # Platform-specific popular tags
    platform_tags = {
        "instagram": ["#instagood", "#photooftheday", "#love", "#beautiful"],
        "linkedin": ["#business", "#innovation", "#leadership", "#success"],
        "twitter": ["#trending", "#viral"],
        "facebook": ["#share", "#follow"],
    }
    
    all_tags = base_tags + platform_tags.get(platform, [])
    return all_tags[:max_tags]


def main():
    parser = argparse.ArgumentParser(description="Generate content pack (image + copy)")
    
    # Required
    parser.add_argument("--product", "-p", required=True,
                        help="Product/service to create content for")
    parser.add_argument("--platform", required=True,
                        choices=list(PLATFORM_CONFIG.keys()),
                        help="Target platform")
    
    # Optional
    parser.add_argument("--brand-voice", help="Brand voice description")
    parser.add_argument("--no-hashtags", action="store_true", help="Skip hashtag generation")
    parser.add_argument("--variations", type=int, default=1, help="Number of variations")
    
    # Output
    parser.add_argument("--output-dir", "-o", default="output/content_pack",
                        help="Output directory")
    parser.add_argument("--dry-run", action="store_true", help="Preview without generating")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    config = PLATFORM_CONFIG[args.platform]
    
    # Dry-run
    if args.dry_run:
        print("\n" + "="*60)
        print("🔍 DRY-RUN: Content Pack Preview")
        print("="*60)
        print(f"\n📦 Produto: {args.product}")
        print(f"📱 Plataforma: {args.platform}")
        
        print(f"\n📋 Pipeline de execução:")
        print(f"   1️⃣  image-gen ({config['image_style']}, {config['image_aspect']})")
        print(f"   2️⃣  copywriter ({config['copy_type']}, tom {config['copy_tone']})")
        if not args.no_hashtags:
            print(f"   3️⃣  hashtags (até {config['max_hashtags']} tags)")
        
        print(f"\n💰 Custo estimado:")
        print(f"   • Imagem: ~$0.04")
        print(f"   • Copy: ~$0.002")
        print(f"   • Total: ~$0.05" + (f" x {args.variations} = ~${0.05 * args.variations:.2f}" if args.variations > 1 else ""))
        
        print(f"\n📁 Output: {args.output_dir}/")
        print(f"   ├── image.png")
        print(f"   ├── copy.txt")
        if not args.no_hashtags:
            print(f"   ├── hashtags.txt")
        print(f"   └── pack.json")
        
        print("\n" + "="*60)
        print("Execute sem --dry-run para gerar o pack")
        print("="*60 + "\n")
        return
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    total_cost = 0
    results = []
    
    for i in range(args.variations):
        variation_dir = output_dir if args.variations == 1 else output_dir / f"v{i+1}"
        variation_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n{'='*60}")
        print(f"📦 Gerando {'variação ' + str(i+1) + '/' + str(args.variations) if args.variations > 1 else 'content pack'}...")
        print("="*60)
        
        # Step 1: Generate image
        print("\n1️⃣  Gerando imagem...")
        image_result = generate_image(
            prompt=f"foto {config['image_style']} de {args.product}",
            output_path=str(variation_dir / "image.png"),
        )
        
        if image_result.get("error"):
            print(f"❌ Erro na imagem: {image_result['error']}")
            continue
        
        print(f"   ✅ {image_result.get('path', 'image.png')}")
        total_cost += image_result.get("cost", 0)
        
        # Step 2: Generate copy
        print("\n2️⃣  Gerando copy...")
        copy_result = generate_copy(
            user_input=args.product,
            copy_type=config["copy_type"],
            tone=config["copy_tone"],
            platform=args.platform,
            brand_context=args.brand_voice,
        )
        
        if copy_result.get("error"):
            print(f"❌ Erro no copy: {copy_result['error']}")
            continue
        
        copy_text = copy_result.get("copy", "")
        with open(variation_dir / "copy.txt", "w") as f:
            f.write(copy_text)
        print(f"   ✅ copy.txt")
        total_cost += copy_result.get("cost", 0)
        
        # Step 3: Generate hashtags
        hashtags = []
        if not args.no_hashtags:
            print("\n3️⃣  Gerando hashtags...")
            hashtags = generate_hashtags(args.product, args.platform, config["max_hashtags"])
            with open(variation_dir / "hashtags.txt", "w") as f:
                f.write(" ".join(hashtags))
            print(f"   ✅ hashtags.txt ({len(hashtags)} tags)")
        
        # Save pack metadata
        pack_data = {
            "product": args.product,
            "platform": args.platform,
            "created_at": datetime.now().isoformat(),
            "image": str(variation_dir / "image.png"),
            "copy": copy_text,
            "hashtags": hashtags,
            "cost": total_cost,
            "providers": {
                "image": image_result.get("provider"),
                "copy": copy_result.get("provider"),
            },
        }
        
        with open(variation_dir / "pack.json", "w") as f:
            json.dump(pack_data, f, indent=2, ensure_ascii=False)
        
        results.append(pack_data)
    
    # Final output
    if args.json:
        print(json.dumps(results if args.variations > 1 else results[0], indent=2, ensure_ascii=False))
    else:
        print("\n" + "="*60)
        print("✅ CONTENT PACK GERADO")
        print("="*60)
        print(f"\n📁 Output: {args.output_dir}/")
        print(f"📱 Plataforma: {args.platform}")
        print(f"💰 Custo total: ${total_cost:.4f}")
        
        if args.variations > 1:
            print(f"📦 Variações: {args.variations}")
        
        print("\n📋 Arquivos gerados:")
        for result in results:
            print(f"   • {result['image']}")
        
        print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()

"""
Design System Library for CLAUDE_CAPABILITIES.

Implements senior-level design knowledge:
- Style systems for different contexts
- Platform-specific dimensions
- Color theory and palettes
- Typography rules
- Composition principles
"""

# ═══════════════════════════════════════════════════════════════════
# PLATFORM DIMENSIONS
# ═══════════════════════════════════════════════════════════════════

PLATFORM_SIZES = {
    "instagram": {
        "feed_square": (1080, 1080),
        "feed_portrait": (1080, 1350),
        "feed_landscape": (1080, 566),
        "story": (1080, 1920),
        "reels": (1080, 1920),
        "profile": (320, 320),
    },
    "facebook": {
        "feed": (1200, 630),
        "story": (1080, 1920),
        "cover": (820, 312),
        "profile": (180, 180),
        "event": (1920, 1080),
        "ad_square": (1080, 1080),
        "ad_landscape": (1200, 628),
    },
    "twitter": {
        "post": (1200, 675),
        "header": (1500, 500),
        "profile": (400, 400),
        "card": (800, 418),
    },
    "linkedin": {
        "post": (1200, 627),
        "story": (1080, 1920),
        "cover": (1584, 396),
        "profile": (400, 400),
        "company_cover": (1128, 191),
    },
    "youtube": {
        "thumbnail": (1280, 720),
        "channel_art": (2560, 1440),
        "profile": (800, 800),
        "end_screen": (1920, 1080),
    },
    "pinterest": {
        "pin": (1000, 1500),
        "pin_square": (1000, 1000),
        "story_pin": (1080, 1920),
    },
    "tiktok": {
        "video": (1080, 1920),
        "profile": (200, 200),
    },
    "web": {
        "og_image": (1200, 630),
        "twitter_card": (800, 418),
        "hero": (1920, 1080),
        "favicon": (512, 512),
        "favicon_small": (32, 32),
    },
    "email": {
        "header": (600, 200),
        "hero": (600, 400),
        "full_width": (600, None),  # Height varies
    },
    "ads": {
        "facebook_feed": (1200, 628),
        "facebook_square": (1080, 1080),
        "instagram_feed": (1080, 1080),
        "instagram_story": (1080, 1920),
        "google_landscape": (1200, 628),
        "google_square": (1200, 1200),
        "google_vertical": (300, 600),
        "google_leaderboard": (728, 90),
        "google_medium": (300, 250),
    },
}

# ═══════════════════════════════════════════════════════════════════
# DESIGN STYLES
# ═══════════════════════════════════════════════════════════════════

DESIGN_STYLES = {
    "minimal": {
        "description": "Clean, lots of whitespace, focus on typography",
        "colors": "Monochromatic or limited palette (2-3 colors)",
        "fonts": "Sans-serif, geometric (Helvetica, Futura, Inter)",
        "elements": "Simple shapes, thin lines, subtle shadows",
        "photography": "High key, isolated subjects, neutral backgrounds",
        "prompt_modifiers": [
            "clean minimal design",
            "lots of negative space",
            "simple geometric shapes",
            "modern typography",
            "subtle shadows",
        ],
    },
    "bold": {
        "description": "High contrast, vibrant colors, impactful",
        "colors": "Bold primaries, high saturation, complementary",
        "fonts": "Heavy weights, display fonts, all caps for headlines",
        "elements": "Strong shapes, thick borders, overlapping",
        "photography": "High contrast, saturated, dynamic angles",
        "prompt_modifiers": [
            "bold vibrant colors",
            "high contrast",
            "dynamic composition",
            "impactful visual",
            "strong typography",
        ],
    },
    "luxury": {
        "description": "Elegant, premium feel, sophisticated",
        "colors": "Black, gold, deep jewel tones, muted",
        "fonts": "Serif, elegant scripts (Didot, Bodoni, Playfair)",
        "elements": "Gold accents, fine lines, ornate details",
        "photography": "Dark, moody, selective lighting, close-ups",
        "prompt_modifiers": [
            "luxury premium aesthetic",
            "elegant sophisticated design",
            "gold accents",
            "dark moody lighting",
            "refined details",
        ],
    },
    "tech": {
        "description": "Futuristic, digital, innovative",
        "colors": "Electric blue, purple gradients, dark backgrounds",
        "fonts": "Geometric sans, monospace accents (Space Grotesk, JetBrains)",
        "elements": "Gradients, glass effects, neon glows, grids",
        "photography": "Tech products, screens, abstract 3D",
        "prompt_modifiers": [
            "futuristic tech design",
            "digital gradient",
            "glass morphism",
            "neon accents",
            "dark mode aesthetic",
        ],
    },
    "organic": {
        "description": "Natural, earthy, sustainable feel",
        "colors": "Earth tones, greens, browns, cream",
        "fonts": "Rounded sans, handwritten accents (Circular, Brandon)",
        "elements": "Organic shapes, textures, natural materials",
        "photography": "Natural light, plants, textures, outdoor",
        "prompt_modifiers": [
            "organic natural aesthetic",
            "earth tones",
            "natural textures",
            "sustainable look",
            "warm lighting",
        ],
    },
    "playful": {
        "description": "Fun, youthful, energetic",
        "colors": "Bright, pastels, unexpected combinations",
        "fonts": "Rounded, bouncy, hand-drawn (Nunito, Fredoka)",
        "elements": "Illustrations, icons, rounded corners, patterns",
        "photography": "Candid, happy people, bright lighting",
        "prompt_modifiers": [
            "playful fun design",
            "bright colors",
            "rounded shapes",
            "friendly aesthetic",
            "youthful energy",
        ],
    },
    "corporate": {
        "description": "Professional, trustworthy, established",
        "colors": "Blue, gray, white, conservative",
        "fonts": "Professional sans (Arial, Open Sans, Lato)",
        "elements": "Clean grids, icons, charts, structured",
        "photography": "Business, teams, office, professional headshots",
        "prompt_modifiers": [
            "corporate professional design",
            "business aesthetic",
            "clean structured layout",
            "trustworthy look",
            "conservative colors",
        ],
    },
    "vintage": {
        "description": "Retro, nostalgic, classic",
        "colors": "Muted, sepia, faded, warm",
        "fonts": "Retro serifs, scripts, slab serifs",
        "elements": "Textures, badges, frames, aged effects",
        "photography": "Film grain, vintage filters, classic compositions",
        "prompt_modifiers": [
            "vintage retro aesthetic",
            "nostalgic feel",
            "aged texture",
            "classic typography",
            "film grain effect",
        ],
    },
    "brutalist": {
        "description": "Raw, experimental, breaking conventions",
        "colors": "Black, white, single accent color",
        "fonts": "System fonts, monospace, unconventional",
        "elements": "Raw HTML feel, broken grids, asymmetry",
        "photography": "High contrast, glitches, experimental",
        "prompt_modifiers": [
            "brutalist design",
            "raw experimental aesthetic",
            "asymmetric layout",
            "anti-design",
            "unconventional composition",
        ],
    },
    "editorial": {
        "description": "Magazine-style, editorial, typographic",
        "colors": "Black, white, single accent",
        "fonts": "Strong serif headlines, clean body (NYT, Vogue style)",
        "elements": "Large headlines, pull quotes, columns",
        "photography": "Editorial shoots, artistic, curated",
        "prompt_modifiers": [
            "editorial magazine design",
            "strong typography",
            "curated photography",
            "sophisticated layout",
            "fashion editorial style",
        ],
    },
    "native": {
        "description": "Looks like regular content, not ad",
        "colors": "Platform-native, muted",
        "fonts": "Platform-default or common",
        "elements": "Minimal branding, organic feel",
        "photography": "UGC-style, authentic, unpolished",
        "prompt_modifiers": [
            "authentic natural photo",
            "not promotional",
            "user generated content style",
            "organic candid",
            "real life moment",
        ],
    },
    "ugc": {
        "description": "User-generated content style, authentic",
        "colors": "Natural, phone camera quality",
        "fonts": "None or platform native (stories)",
        "elements": "Minimal, text overlays if any",
        "photography": "Phone quality, selfies, real settings",
        "prompt_modifiers": [
            "authentic ugc photo",
            "phone camera quality",
            "natural selfie style",
            "real person in real setting",
            "not professional photography",
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════
# COLOR PALETTES
# ═══════════════════════════════════════════════════════════════════

COLOR_PALETTES = {
    "trust_blue": {
        "primary": "#2563EB",
        "secondary": "#1E40AF",
        "accent": "#60A5FA",
        "neutral": "#F1F5F9",
        "use_case": "Finance, tech, corporate",
    },
    "nature_green": {
        "primary": "#059669",
        "secondary": "#047857",
        "accent": "#34D399",
        "neutral": "#ECFDF5",
        "use_case": "Sustainability, health, organic",
    },
    "luxury_gold": {
        "primary": "#0F0F0F",
        "secondary": "#1C1C1C",
        "accent": "#D4AF37",
        "neutral": "#F5F5F5",
        "use_case": "Luxury, premium, exclusive",
    },
    "energy_orange": {
        "primary": "#EA580C",
        "secondary": "#C2410C",
        "accent": "#FB923C",
        "neutral": "#FFF7ED",
        "use_case": "Food, sports, energy",
    },
    "creative_purple": {
        "primary": "#7C3AED",
        "secondary": "#5B21B6",
        "accent": "#A78BFA",
        "neutral": "#F5F3FF",
        "use_case": "Creative, tech, modern",
    },
    "warmth_coral": {
        "primary": "#F43F5E",
        "secondary": "#E11D48",
        "accent": "#FB7185",
        "neutral": "#FFF1F2",
        "use_case": "Beauty, lifestyle, feminine",
    },
    "calm_teal": {
        "primary": "#0D9488",
        "secondary": "#0F766E",
        "accent": "#2DD4BF",
        "neutral": "#F0FDFA",
        "use_case": "Wellness, spa, meditation",
    },
    "modern_dark": {
        "primary": "#18181B",
        "secondary": "#27272A",
        "accent": "#FAFAFA",
        "neutral": "#3F3F46",
        "use_case": "Tech, premium, modern",
    },
}

# ═══════════════════════════════════════════════════════════════════
# COMPOSITION RULES
# ═══════════════════════════════════════════════════════════════════

COMPOSITION_RULES = {
    "rule_of_thirds": {
        "description": "Subject on 1/3 intersections",
        "prompt_modifier": "rule of thirds composition",
    },
    "centered": {
        "description": "Subject perfectly centered",
        "prompt_modifier": "centered symmetrical composition",
    },
    "golden_ratio": {
        "description": "1.618 spiral composition",
        "prompt_modifier": "golden ratio composition",
    },
    "leading_lines": {
        "description": "Lines lead eye to subject",
        "prompt_modifier": "leading lines composition",
    },
    "framing": {
        "description": "Subject framed by elements",
        "prompt_modifier": "natural framing composition",
    },
    "negative_space": {
        "description": "Lots of empty space around subject",
        "prompt_modifier": "negative space composition, minimalist",
    },
    "diagonal": {
        "description": "Dynamic diagonal flow",
        "prompt_modifier": "dynamic diagonal composition",
    },
    "symmetry": {
        "description": "Perfect mirror balance",
        "prompt_modifier": "symmetrical balanced composition",
    },
}

# ═══════════════════════════════════════════════════════════════════
# PHOTOGRAPHY STYLES
# ═══════════════════════════════════════════════════════════════════

PHOTOGRAPHY_STYLES = {
    "product": {
        "lighting": "Soft diffused, 45-degree key light",
        "background": "White infinity curve or gradient",
        "lens": "85mm f/2.8, sharp focus",
        "mood": "Clean, commercial, precise",
        "prompt": "professional product photography, soft studio lighting, white background, commercial quality",
    },
    "lifestyle": {
        "lighting": "Natural or golden hour",
        "background": "Environmental, contextual",
        "lens": "35-50mm, environmental",
        "mood": "Authentic, aspirational",
        "prompt": "lifestyle photography, natural lighting, authentic moment, environmental context",
    },
    "portrait": {
        "lighting": "Rembrandt or butterfly",
        "background": "Blurred, neutral",
        "lens": "85mm f/1.8, shallow DOF",
        "mood": "Personal, connected",
        "prompt": "professional portrait, Rembrandt lighting, shallow depth of field, blurred background",
    },
    "food": {
        "lighting": "Side natural window light",
        "background": "Rustic, textured surface",
        "lens": "50-100mm, shallow DOF",
        "mood": "Appetizing, fresh",
        "prompt": "professional food photography, natural window light, shallow depth of field, appetizing",
    },
    "flat_lay": {
        "lighting": "Top-down even lighting",
        "background": "Clean surface, complementary props",
        "lens": "Top-down, 35-50mm",
        "mood": "Organized, curated",
        "prompt": "flat lay photography, top down perspective, organized arrangement, clean surface",
    },
    "hero": {
        "lighting": "Dramatic, rim light",
        "background": "Epic, contextual",
        "lens": "Wide or telephoto for drama",
        "mood": "Impactful, aspirational",
        "prompt": "cinematic hero shot, dramatic lighting, epic composition, rim light",
    },
    "ugc": {
        "lighting": "Phone flash or natural",
        "background": "Real, messy, authentic",
        "lens": "Phone camera look",
        "mood": "Real, unpolished, trustworthy",
        "prompt": "authentic ugc photo, phone camera quality, real person, natural setting, not professional",
    },
}

# ═══════════════════════════════════════════════════════════════════
# TEXT OVERLAY RULES
# ═══════════════════════════════════════════════════════════════════

TEXT_OVERLAY_RULES = {
    "contrast": "Always ensure text contrasts with background (light on dark or dark on light)",
    "hierarchy": "Maximum 3 levels: Headline > Subhead > Body/CTA",
    "placement": {
        "top": "Headlines, hooks (first thing seen)",
        "middle": "Main message, key benefit",
        "bottom": "CTA, attribution, logo",
    },
    "safe_zones": {
        "instagram": "Keep text in center 80%, avoid edges",
        "stories": "Top 15% and bottom 20% reserved for UI",
        "youtube": "Avoid corners where timestamps appear",
    },
    "max_words": {
        "story": 10,
        "post": 20,
        "ad": 15,
        "thumbnail": 5,
    },
}

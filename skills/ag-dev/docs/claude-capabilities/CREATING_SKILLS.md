# Creating New Skills

A guide to extending CLAUDE_CAPABILITIES with new production skills.

## Skill Anatomy

Every skill follows this structure:

```
skills/
└── your-skill/
    ├── SKILL.md           # Required: Instructions for Claude
    ├── scripts/           # Optional: Executable scripts
    │   ├── main.py
    │   └── helpers.py
    ├── templates/         # Optional: Reusable templates
    │   └── default.yaml
    └── examples/          # Optional: Usage examples
        └── example_output.png
```

## The SKILL.md Format

```markdown
# Skill Name

> One-line description of what this skill does.

## Triggers

Keywords and phrases that activate this skill:
- keyword1
- keyword2
- "exact phrase"
- pattern: /regex/

## Requirements

### API Keys
- `KEY_NAME`: Description (provider)

### Dependencies
- python package
- system tool

## Workflow

### Step 1: Name
Description of what happens.

```bash
python scripts/step1.py --arg value
```

Expected output: description

### Step 2: Name
...

## Output

What the skill produces:
- File: `/output/result.ext`
- Format: PNG/MP4/HTML
- Typical size: ~X MB

## Cost Estimate

| Component | Cost |
|-----------|------|
| API call  | $X.XX |
| Total     | ~$X.XX |

## Error Handling

Common issues and solutions:
- Issue: Description
  Solution: How to fix

## Examples

### Basic Usage
```
User: "do X with Y"
Output: result.ext
```

### Advanced Usage
```
User: "do X with Y and Z options"
Output: customized_result.ext
```
```

---

## Minimal Skill Example

The simplest possible skill (no scripts):

```markdown
# Echo Skill

> Echoes user input in a formatted way.

## Triggers
- echo
- repeat
- "say back"

## Requirements
None.

## Workflow

### Step 1: Format
Take user input and format it.

### Step 2: Output
Return formatted response.

## Output
Formatted text in the chat.
```

---

## Script-Based Skill Example

A skill with Python scripts:

### SKILL.md

```markdown
# Image Resize Skill

> Resizes images to specified dimensions.

## Triggers
- resize image
- scale image
- make image smaller/larger

## Requirements

### Dependencies
- Pillow (pip install Pillow)

## Workflow

### Step 1: Analyze Input
Identify source image and target dimensions.

### Step 2: Resize
```bash
python scripts/resize.py --input SOURCE --width W --height H --output OUTPUT
```

### Step 3: Deliver
Return path to resized image.

## Output
- File: `/output/resized_IMAGE.png`
- Format: Same as input
```

### scripts/resize.py

```python
#!/usr/bin/env python3
"""Resize an image to specified dimensions."""

import argparse
from PIL import Image

def resize_image(input_path: str, width: int, height: int, output_path: str):
    """Resize image maintaining aspect ratio if only one dimension given."""
    img = Image.open(input_path)
    
    if width and not height:
        ratio = width / img.width
        height = int(img.height * ratio)
    elif height and not width:
        ratio = height / img.height
        width = int(img.width * ratio)
    
    resized = img.resize((width, height), Image.LANCZOS)
    resized.save(output_path)
    print(f"Saved: {output_path} ({width}x{height})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--width", type=int)
    parser.add_argument("--height", type=int)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    resize_image(args.input, args.width, args.height, args.output)
```

---

## API-Based Skill Example

A skill that calls external APIs:

### SKILL.md

```markdown
# Weather Background Skill

> Generates background images based on current weather.

## Triggers
- weather background
- weather wallpaper
- "background for today's weather"

## Requirements

### API Keys
- `WEATHER_API_KEY`: OpenWeatherMap API
- `GOOGLE_API_KEY`: For Imagen 3

## Workflow

### Step 1: Get Weather
```bash
python scripts/get_weather.py --city "CITY" --output weather.json
```

### Step 2: Generate Prompt
Based on weather data, construct image prompt.

### Step 3: Generate Image
```bash
python scripts/generate_background.py --weather weather.json --output background.png
```

## Output
- File: `/output/weather_background.png`
- Size: 1920x1080
```

---

## Using Shared Libraries

Skills can use shared code from `lib/`:

```python
#!/usr/bin/env python3
"""Script using shared libraries."""

import sys
sys.path.insert(0, '/path/to/CLAUDE_CAPABILITIES')

from lib.keys import get as get_key
from lib.image import generate_image
from lib.video import create_video

# Use shared functionality
api_key = get_key("GOOGLE_API_KEY")
image = generate_image("a sunset", api_key)
```

---

## Skill Categories

### 1. Generative Skills
Create new content:
- image-gen
- video-gen
- audio-gen
- text-gen

### 2. Transformation Skills
Modify existing content:
- image-resize
- video-cut
- audio-normalize
- text-translate

### 3. Composite Skills
Combine multiple operations:
- ugc-video (images + video + audio)
- landing-page (text + images + HTML)
- presentation (text + images + slides)

### 4. Deployment Skills
Publish outputs:
- deploy-cloudflare
- deploy-vercel
- upload-s3

---

## Best Practices

### 1. Single Responsibility

```
# ❌ Bad: One skill does everything
skills/
└── do-everything/
    └── SKILL.md  # 500 lines, handles images, videos, text, deploy...

# ✅ Good: Focused skills
skills/
├── image-gen/
├── video-gen/
├── text-gen/
└── deploy/
```

### 2. Clear Triggers

```markdown
## Triggers

# ❌ Bad: Vague
- image
- make
- create

# ✅ Good: Specific
- "generate product image"
- "create hero image"
- "make banner for"
```

### 3. Explicit Dependencies

```markdown
## Requirements

# ❌ Bad: Assumes availability
Uses FFmpeg for video processing.

# ✅ Good: Clear requirements
### System Dependencies
- FFmpeg >= 5.0: `apt install ffmpeg`

### Python Packages
- moviepy >= 1.0: `pip install moviepy`
```

### 4. Error Messages

```python
# ❌ Bad: Generic error
raise Exception("Failed")

# ✅ Good: Actionable error
raise Exception(
    "Imagen API returned 429 (rate limit). "
    "Wait 60 seconds and retry, or use DALL-E fallback."
)
```

### 5. Progress Feedback

```python
# ❌ Bad: Silent execution
for i in range(100):
    process(i)

# ✅ Good: Progress updates
for i in range(100):
    process(i)
    if i % 10 == 0:
        print(f"Progress: {i}%")
```

---

## Testing Your Skill

### 1. Dry Run

Test without API calls:

```markdown
## Workflow

### Step 1: Generate (or mock)
```bash
# Dry run mode
python scripts/generate.py --dry-run --prompt "test"
```
```

### 2. Cost Check

Before expensive operations:

```python
estimated_cost = calculate_cost(params)
print(f"Estimated cost: ${estimated_cost:.2f}")
if estimated_cost > 1.00:
    confirm = input("Proceed? (y/n): ")
```

### 3. Output Validation

```python
def validate_output(path):
    """Ensure output meets requirements."""
    if not os.path.exists(path):
        raise ValueError(f"Output not created: {path}")
    
    size = os.path.getsize(path)
    if size < 1000:
        raise ValueError(f"Output too small: {size} bytes")
    
    print(f"✅ Valid output: {path} ({size} bytes)")
```

---

## Publishing Your Skill

### 1. Documentation

Ensure SKILL.md is complete:
- [ ] Clear description
- [ ] All triggers listed
- [ ] Requirements documented
- [ ] Workflow steps detailed
- [ ] Output format specified
- [ ] Cost estimate included
- [ ] Examples provided

### 2. Test Coverage

- [ ] Works with minimal input
- [ ] Handles edge cases
- [ ] Fails gracefully
- [ ] Provides useful errors

### 3. Submit

Add to the skills directory and submit a PR:

```bash
git add skills/your-skill/
git commit -m "Add your-skill capability"
git push
```

---

*Skills are the building blocks of CLAUDE_CAPABILITIES. Each new skill extends what Claude can produce.*

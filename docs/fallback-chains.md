# Fallback Chain Pattern — AG Dev

> Architecture pattern extracted from CLAUDE_CAPABILITIES for resilient multi-provider operations.

## Pattern

Every capability that depends on external services implements a **fallback chain**: an ordered list of providers tried sequentially until one succeeds.

```
try provider_1 (best quality, may cost)
  → on failure → try provider_2 (cheaper/different)
    → on failure → try provider_3 (free/stock)
      → on failure → return error with all failures
```

## Implementation

```python
def execute_with_fallback(prompt, chain, output_path):
    errors = []
    for provider_name, provider_fn in chain:
        try:
            result = provider_fn(prompt, output_path)
            return result  # Success — stop trying
        except Exception as e:
            errors.append(f"{provider_name}: {e}")
    return {"error": "all_providers_failed", "errors": errors}
```

## Current Chains

### Image Generation
| Priority | Provider | Cost | Quality |
|----------|----------|------|---------|
| 1 | Gemini Imagen 4 | $0.04 | AI-generated, high quality |
| 2 | DALL-E 3 | $0.04-0.12 | AI-generated, creative |
| 3 | Pexels | Free | Stock photos |

### Audio/TTS
| Priority | Provider | Cost | Quality |
|----------|----------|------|---------|
| 1 | Edge-TTS | Free | Good quality, limited voices |
| 2 | XTTS/RunPod | $0.02 | Voice cloning, custom |
| 3 | ElevenLabs | $0.30/1k chars | Premium, best quality |

### Text/Copy Generation
| Priority | Provider | Cost | Quality |
|----------|----------|------|---------|
| 1 | Gemini Flash | ~$0.002 | Fast, cheap |
| 2 | Gemini Pro | ~$0.005 | Better reasoning |
| 3 | GPT-4o-mini | ~$0.002 | OpenAI fallback |

### Video Generation
| Priority | Provider | Cost | Quality |
|----------|----------|------|---------|
| 1 | Kling via Fal.ai | ~$0.45/5s | AI video, image-to-video |
| 2 | Pexels Video | Free | Stock video |

### Deployment
| Priority | Provider | Cost |
|----------|----------|------|
| 1 | Cloudflare Pages | Free |

## Key Principles

1. **Transparency** — User doesn't need to know which provider was used, but the result includes provider info
2. **Cost-aware ordering** — Default chain goes cheap→expensive OR best→fallback depending on use case
3. **Dynamic chain building** — Only include providers whose API keys are configured
4. **Budget check before execution** — Estimate cost and check against budget limit
5. **Dry-run support** — Every function supports `dry_run=True` to preview the chain without executing

## Workflow Integration

In AG Dev workflows, the fallback pattern applies to:
- **DevOps agent (Gage):** Deploy chain (Cloudflare → Vercel → manual)
- **Content-writer agent (Sage):** Text generation chain
- **UX agent (Uma):** Image generation chain
- **Any pipeline step** in compose.py

## Adding a New Provider

1. Create provider function: `def _call_new_provider(prompt, output_path) -> dict`
2. Add cost to `COST_DB` in `cost.py`
3. Insert into chain at appropriate priority position
4. Handle the specific error types the provider throws
5. Test with `dry_run=True` first

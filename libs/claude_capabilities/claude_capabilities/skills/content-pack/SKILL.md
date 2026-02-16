# Content Pack

> **Skill Composta**: Imagem + Copy + Hashtags prontos para social media.

## Descrição

Esta é uma **skill composta** que orquestra skills atômicas para entregar um pack completo de conteúdo. Com um único comando, você recebe:
- ✅ Imagem profissional otimizada para a plataforma
- ✅ Copy com hook, desenvolvimento e CTA
- ✅ Hashtags relevantes
- ✅ Tudo pronto para postar

## Triggers

Palavras que ativam esta skill:
- "post para instagram", "conteúdo pro feed"
- "pack de conteúdo", "content pack"
- "post completo", "imagem + texto"
- "publicação para", "mídia social"

## Requirements

### API Keys
- Tudo que `image-gen` precisa (Gemini/DALL-E/Pexels)
- Tudo que `copywriter` precisa (Gemini)

### Dependencies
- skills/image-gen
- skills/copywriter
- lib/compose.py

## Workflow

### 1. Dry-Run (OBRIGATÓRIO)
```bash
python skills/content-pack/scripts/orchestrate.py \
  --product "café artesanal de Minas" \
  --platform instagram \
  --dry-run
```

Output mostra:
- Skills que serão executadas
- Ordem de execução
- Custo total estimado

### 2. Gerar Pack
```bash
python skills/content-pack/scripts/orchestrate.py \
  --product "café artesanal de Minas" \
  --platform instagram \
  --output-dir output/cafe_post
```

### 3. Resultado
```
output/cafe_post/
├── image.png        # Imagem profissional
├── copy.txt         # Texto do post
├── hashtags.txt     # Hashtags relevantes
└── pack.json        # Metadados completos
```

## Pipeline de Execução

```
┌─────────────────────────────────────────────────────────┐
│                    CONTENT-PACK                          │
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  image-gen   │      │  copywriter  │                │
│  │              │      │              │                │
│  │ Gera imagem  │      │ Gera copy +  │                │
│  │ lifestyle    │      │ hashtags     │                │
│  └──────┬───────┘      └──────┬───────┘                │
│         │                     │                         │
│         └──────────┬──────────┘                         │
│                    │                                     │
│                    ▼                                     │
│         ┌──────────────────┐                            │
│         │   Pack Final     │                            │
│         │  image + copy    │                            │
│         └──────────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

## Inteligência da Composição

O Content Pack não apenas junta imagem + texto — ele **harmoniza** os elementos:

### Matching de Estilo
| Plataforma | Estilo Imagem | Tom Copy |
|------------|---------------|----------|
| Instagram | lifestyle, vibrante | casual, emojis OK |
| LinkedIn | profissional, clean | autoridade, formal |
| Twitter | impactante, simples | provocativo, curto |
| Facebook | lifestyle, humano | conversacional |

### Coerência Visual-Textual
- Se a imagem é "minimalista" → copy é "clean", sem excesso
- Se a imagem é "vibrante" → copy pode ter mais energia
- Cores da imagem influenciam emojis sugeridos

## Custo

| Componente | Custo |
|------------|-------|
| image-gen | ~$0.04 |
| copywriter | ~$0.002 |
| **Total** | **~$0.05** |

## Opções Avançadas

### Múltiplas Variações
```bash
python scripts/orchestrate.py \
  --product "café artesanal" \
  --platform instagram \
  --variations 3 \
  --output-dir output/cafe_variations
```

Gera 3 versões diferentes para A/B testing.

### Brand Voice
```bash
python scripts/orchestrate.py \
  --product "café artesanal" \
  --platform instagram \
  --brand-voice "jovem, sustentável, cores vibrantes" \
  --output-dir output/cafe_post
```

### Sem Hashtags
```bash
python scripts/orchestrate.py \
  --product "café artesanal" \
  --platform linkedin \
  --no-hashtags \
  --output-dir output/cafe_linkedin
```

## Exemplos

### Básico: Post para Instagram
```bash
python scripts/orchestrate.py \
  --product "loja de roupas plus size" \
  --platform instagram \
  --output-dir output/moda_post

# Resultado:
# - Imagem: Foto lifestyle de pessoa usando roupa
# - Copy: Hook + benefícios + CTA com emojis
# - Hashtags: 15-20 relevantes para moda plus size
```

### LinkedIn Profissional
```bash
python scripts/orchestrate.py \
  --product "consultoria de marketing B2B" \
  --platform linkedin \
  --output-dir output/consultoria_post

# Resultado:
# - Imagem: Clean, profissional, sem emojis
# - Copy: Autoridade, dados, insights
# - Hashtags: 3-5 profissionais (#marketing #b2b #consultoria)
```

### Carrossel (Futuro)
```bash
python scripts/orchestrate.py \
  --product "7 dicas de produtividade" \
  --platform instagram \
  --format carousel \
  --slides 7 \
  --output-dir output/carrossel
```

## Composição com Outros Pipelines

O content-pack pode ser parte de pipelines maiores:

```bash
# Pipeline: Trend → Research → Content Pack
python lib/compose.py run \
  --pipeline trend-to-content \
  --topic "cafés especiais" \
  --platform instagram
```

Primeiro detecta tendência, depois gera conteúdo sobre ela.

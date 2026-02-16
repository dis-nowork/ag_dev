# image-gen

> Camada de inteligencia para geracao de imagens. Transforma intencao em imagem profissional.

## O Que Esta Skill Faz (Diferente de Skills Normais)

Esta NAO e uma skill comum que apenas chama uma API. E uma camada de inteligencia que:

1. **Entende intencao** — "faz foto do produto" se torna prompt de fotografia profissional
2. **Escolhe o estilo** — detecta automaticamente product/hero/lifestyle/food/portrait/minimal
3. **Controla custos** — estima antes, pergunta ao usuario, tracked em tempo real
4. **Itera sem recomecar** — "fundo mais escuro" ajusta so o parametro, nao recria tudo
5. **Nunca falha** — Gemini Imagen → DALL-E 3 → Pexels stock (transparente)
6. **Preview primeiro** — dry-run mostra o prompt otimizado antes de gastar

## Triggers

- gerar imagem / generate image
- foto do produto / product photo
- criar imagem / create image
- hero image / banner
- foto profissional / professional photo
- imagem para landing page
- thumbnail / capa / cover

## Requirements

### API Keys (pelo menos uma)
- `GOOGLE_API_KEY_GEMINI` — Google Gemini Imagen (preferencial, ~$0.04/imagem)
- `OPENAI_API_KEY` — DALL-E 3 fallback (~$0.04/imagem standard)
- `PEXELS_API_KEY` — Stock images gratis (fallback final)

### Dependencies
- Python 3.10+
- Nenhum pip install necessario (usa apenas stdlib: urllib, json, base64)

## Workflow

### Passo 1: Entender o Pedido

Quando o usuario pede uma imagem, ANTES de executar qualquer coisa:

1. Leia o pedido e identifique:
   - **Sujeito**: O que deve aparecer na imagem
   - **Estilo provavel**: produto? lifestyle? retrato? food? hero?
   - **Contexto de uso**: landing page? social media? anuncio?

2. Se o pedido for vago (ex: "faz uma imagem do cafe"), PERGUNTE:
   - "Que tipo de imagem? Foto do produto em fundo branco, ou lifestyle com alguem tomando cafe?"
   - So prossiga quando tiver clareza

### Passo 2: Dry-Run (Pilar 6 - Preview)

SEMPRE faca dry-run primeiro para operacoes que custam dinheiro:

```bash
python skills/image-gen/scripts/generate.py --prompt "DESCRICAO" --style auto --output output/imagem.png --dry-run
```

Mostre ao usuario:
- O prompt otimizado que seria enviado a API
- O estilo detectado
- O custo estimado
- A cadeia de providers que sera usada

Pergunte: "Esse e o prompt que vou usar. Confirma?"

### Passo 3: Executar Geracao

Apos confirmacao do usuario:

```bash
python skills/image-gen/scripts/generate.py --prompt "DESCRICAO" --style auto --output output/nome_descritivo.png --budget 1.00
```

Opcoes de estilo:
- `auto` — detecta automaticamente (recomendado)
- `product` — foto de produto em fundo branco
- `hero` — shot cinematico para banners
- `lifestyle` — foto lifestyle natural
- `flat_lay` — vista de cima organizada
- `portrait` — retrato profissional
- `food` — fotografia de comida
- `minimal` — composicao minimalista

### Passo 4: Iteracao (Pilar 4 - Ajuste Sem Recomecar)

Se o usuario pedir ajuste (ex: "fundo mais escuro", "mais zoom", "cores mais quentes"):

1. Leia o estado anterior:
```bash
python skills/image-gen/scripts/generate.py --iterate "AJUSTE PEDIDO" --output output/imagem_v2.png
```

2. O script carrega o prompt anterior e aplica APENAS o ajuste pedido
3. Nao recria do zero — modifica o parametro especifico

Mapeamento de ajustes comuns:
- "fundo mais escuro" → adiciona "dark background" ao prompt
- "mais zoom" → adiciona "close-up, tight crop"
- "cores mais quentes" → adiciona "warm color temperature, golden tones"
- "mais profissional" → adiciona "ultra professional, commercial grade"
- "remover fundo" → adiciona "isolated on pure white background, no shadows"
- "mais natural" → muda estilo para lifestyle
- "mais dramatico" → muda estilo para hero

### Passo 5: Entregar Resultado

Apos geracao bem-sucedida, informe:
- Caminho do arquivo gerado
- Provider usado (Gemini/DALL-E/Pexels)
- Custo real da operacao
- Custo acumulado da sessao

## Composicao com Outras Skills

Se o contexto indica necessidade de mais do que uma imagem:

- "imagem para landing page" → gerar imagem, DEPOIS sugerir skill landing-page
- "imagem com texto" → gerar imagem, DEPOIS sugerir adicionar overlay
- "varias imagens do produto" → executar em batch com confirmacao de custo total

## Output

- Arquivo: `output/[nome_descritivo].png`
- Formato: PNG (AI gen) ou JPG (Pexels stock)
- Resolucao: 1024x1024 (padrao)
- Metadata: `.state/last_image_generation.json`

## Cost Estimate

| Provider | Custo/imagem | Qualidade |
|----------|-------------|-----------|
| Gemini Imagen | ~$0.04 | Alta |
| DALL-E 3 standard | ~$0.04 | Alta |
| DALL-E 3 HD | ~$0.08 | Muito Alta |
| Pexels stock | $0.00 | Variavel (nao e AI) |

## Error Handling

| Erro | Causa | Acao |
|------|-------|------|
| `no_providers` | Nenhuma API key configurada | Informar quais keys sao necessarias |
| `budget_exceeded` | Custo > limite | Sugerir aumentar budget ou usar Pexels |
| `all_providers_failed` | Todas APIs falharam | Mostrar erros detalhados de cada provider |
| Rate limit (429) | Muitas requests | Aguardar 60s e tentar proximo provider |

## Exemplos

### Basico
```
Usuario: "gera uma foto do meu cafe"
→ Dry-run: mostra prompt otimizado (food style detected)
→ Confirma? Sim
→ Gemini Imagen gera: output/cafe_product.png
→ "Imagem gerada! Custo: $0.04 | Provider: Gemini Imagen"
```

### Com Estilo Especifico
```
Usuario: "cria hero image dramatica do meu app de fitness"
→ Dry-run: prompt hero com lighting dramatico
→ Confirma? Sim
→ output/fitness_hero.png
```

### Iteracao
```
Usuario: "gostei mas quero o fundo mais escuro"
→ Carrega estado anterior
→ Adiciona "dark moody background" ao prompt
→ Re-gera: output/cafe_product_v2.png
→ "Ajustado! Mesmo custo: $0.04"
```

### Batch
```
Usuario: "gera 5 fotos do produto em angulos diferentes"
→ Custo estimado: ~$0.20. Confirma?
→ Gera 5 variacoes
→ output/product_angle_1.png ... product_angle_5.png
```

# TTS (Text-to-Speech)

> Converte texto em áudio com vozes naturais e ritmo otimizado.

## Descrição

Esta skill transforma texto em fala usando múltiplos providers. Não é apenas síntese de voz — é **direção de áudio** que otimiza ritmo, pausas e entonação por tipo de conteúdo.

## Triggers

Palavras que ativam esta skill:
- "narração", "voz", "áudio"
- "text to speech", "tts"
- "locução", "podcast"
- "voiceover", "voice over"

## Requirements

### API Keys (em ordem de fallback)
- `ELEVENLABS_API_KEY`: TTS premium (melhor qualidade)
- `RUNPOD_API_KEY`: XTTS (barato, bom)
- Nenhuma: Edge-TTS (grátis, local)

### Dependencies
- Python 3.8+
- edge-tts (pip install edge-tts) — para fallback grátis
- lib/audio.py, lib/keys.py, lib/cost.py

## Estilos de Voz

| Estilo | Uso | Características |
|--------|-----|-----------------|
| `narrator` | Documentário, explainer | Calmo, confiável, pausas claras |
| `energetic` | YouTube intro, vendas | Entusiasta, rápido, impactante |
| `calm` | Meditação, instrucional | Relaxante, lento, suave |
| `conversational` | Podcast, storytelling | Natural, casual, próximo |
| `urgent` | CTA, escassez | Rápido, pausas dramáticas |

## Workflow

### 1. Dry-Run (OBRIGATÓRIO)
```bash
python skills/tts/scripts/generate.py \
  --text "Olá, bem-vindo ao meu canal!" \
  --style narrator \
  --dry-run
```

Output mostra:
- Script otimizado com pausas
- Duração estimada
- Custo por provider

### 2. Gerar Áudio
```bash
python skills/tts/scripts/generate.py \
  --text "Olá, bem-vindo ao meu canal!" \
  --style narrator \
  --output output/intro.mp3
```

### 3. Forçar Provider
```bash
# ElevenLabs (premium)
python scripts/generate.py --text "..." --provider elevenlabs

# XTTS via RunPod (barato)
python scripts/generate.py --text "..." --provider xtts

# Edge-TTS (grátis)
python scripts/generate.py --text "..." --provider edge
```

## Inteligência do Script (O Diferencial)

A skill não apenas converte texto — ela **otimiza o script** para fala natural:

### Pausas Automáticas
```
Entrada: "Este é o resultado. Você não vai acreditar."
Saída:   "Este é o resultado... Você não vai acreditar."
                            ^^^
                       Pausa adicionada
```

### Regras por Estilo

| Estilo | Regras |
|--------|--------|
| narrator | Frases curtas (máx 15 palavras), pausas entre ideias |
| energetic | Exclamações!, ritmo acelerado, palavras de impacto |
| calm | Frases longas e fluidas, muitas pausas (...) |
| conversational | Contrações (tá, né, pra), hesitações naturais |
| urgent | Frases curtas, pausas dramáticas antes do CTA |

## Fallback Chain (Pilar 5)

Ordem de tentativa:
1. **Edge-TTS** (grátis) — para textos curtos < 500 chars
2. **XTTS/RunPod** (~$0.02) — para textos médios
3. **ElevenLabs** (~$0.30/1000 chars) — premium, último recurso

Você pode forçar um provider específico com `--provider`.

## Custo

| Provider | Custo | Qualidade | Velocidade |
|----------|-------|-----------|------------|
| Edge-TTS | Grátis | ⭐⭐⭐ | Rápido |
| XTTS/RunPod | ~$0.02/gen | ⭐⭐⭐⭐ | Médio |
| ElevenLabs | $0.30/1000 chars | ⭐⭐⭐⭐⭐ | Rápido |

Para um texto de 500 caracteres:
- Edge-TTS: **$0.00**
- XTTS: **~$0.02**
- ElevenLabs: **~$0.15**

## Composição

Quando parte de um pipeline:
- `ugc-video`: Gera voiceover para o vídeo final
- `content-pack`: Pode adicionar versão em áudio do copy

## Exemplos

### Básico: Narração
```bash
python scripts/generate.py \
  --text "Descubra como triplicar suas vendas em apenas 7 dias." \
  --style narrator \
  --output output/narration.mp3

# Resultado: MP3 de ~3 segundos, voz calma e confiável
```

### YouTube Intro
```bash
python scripts/generate.py \
  --text "E aí pessoal! Hoje eu vou mostrar algo que vai mudar sua vida!" \
  --style energetic \
  --output output/intro.mp3

# Resultado: MP3 energético, com entusiasmo
```

### Urgência para Ad
```bash
python scripts/generate.py \
  --text "Últimas 24 horas! Clique agora e garanta 50% de desconto!" \
  --style urgent \
  --provider elevenlabs \
  --output output/ad_voice.mp3

# Resultado: Premium, pausas dramáticas, urgência na voz
```

### Com Script Longo
```bash
python scripts/generate.py \
  --file script.txt \
  --style conversational \
  --output output/podcast_segment.mp3
```

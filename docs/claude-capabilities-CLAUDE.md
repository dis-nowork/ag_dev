# CLAUDE_CAPABILITIES

Este projeto é uma **camada de inteligência** entre o usuário e APIs de produção.
NÃO são skills comuns — é inteligência que transforma intenção em execução otimizada.

## 6 Pilares

1. **Prompt Engineering Encapsulado** — "foto do produto" vira prompt profissional
2. **Composição Automática** — detecta que "landing page" precisa imagem + copy + deploy
3. **Guardrails de Custo** — estima custo, pergunta antes, tracking em tempo real
4. **Iteration Loop** — "fundo mais escuro" ajusta só o parâmetro, não recria
5. **Fallback Chain** — Gemini → DALL-E → Pexels (transparente pro usuário)
6. **Dry-Run** — SEMPRE mostra preview antes de executar operações que custam dinheiro

---

## Skills Disponíveis

### ATÔMICAS (fazem UMA coisa bem)

#### image-gen ✅
- **O que faz**: Gera imagens profissionais a partir de descrições vagas
- **Instruções**: `claude_capabilities/skills/image-gen/SKILL.md`
- **CLI**: `capabilities image --prompt "..." --dry-run`
- **Custo**: ~$0.04/imagem

#### copywriter ✅
- **O que faz**: Gera textos de alta conversão (headlines, CTAs, posts, ads)
- **Instruções**: `claude_capabilities/skills/copywriter/SKILL.md`
- **CLI**: `capabilities copy --prompt "..." --type headline --dry-run`
- **Custo**: ~$0.002/geração

#### tts ✅
- **O que faz**: Text-to-speech com vozes naturais e ritmo otimizado
- **Instruções**: `claude_capabilities/skills/tts/SKILL.md`
- **CLI**: `capabilities tts --text "..." --dry-run`
- **Custo**: Grátis (Edge) a $0.30/1000 chars (ElevenLabs)

#### video-gen 📝
- **O que faz**: Gera vídeo a partir de imagem (Kling) ou texto (Pexels stock)
- **Instruções**: `claude_capabilities/skills/video-gen/SKILL.md`
- **Custo**: ~$0.09/segundo (Kling) ou grátis (Pexels)

#### deploy-page 📝
- **O que faz**: Deploy de HTML para Cloudflare Pages
- **Instruções**: `claude_capabilities/skills/deploy-page/SKILL.md`
- **Custo**: Grátis

---

### COMPOSTAS (orquestram atômicas)

#### content-pack ✅
- **O que faz**: Imagem + Copy + Hashtags para social media
- **Orquestra**: image-gen → copywriter
- **Instruções**: `skills/content-pack/SKILL.md`
- **Instruções**: `claude_capabilities/skills/content-pack/SKILL.md`
- **Custo**: ~$0.05/pack

#### landing-page 📝
- **O que faz**: Copy + Imagem + HTML + Deploy (entrega URL viva)
- **Orquestra**: copywriter → image-gen → deploy-page
- **Custo**: ~$0.10

#### ugc-video 📝
- **O que faz**: Personagem + Cenas + Vídeo + TTS + Montagem
- **Orquestra**: image-gen → video-gen → tts → montage
- **Custo**: ~$3-5 (30 segundos)

#### stories-pack 📝
- **O que faz**: Sequência de 3-5 stories com texto + imagem
- **Orquestra**: copywriter → image-gen (x5)
- **Custo**: ~$0.20

---

### UTILITY (apoio)

#### doc-analyzer 📝
- **O que faz**: Analisa documento e extrai insights (Docling + Supabase)

#### trend-scout 📝
- **O que faz**: Busca tendências para gerar conteúdo (Brave + Gemini)

---

## Como Usar

### Regra de Ouro: SEMPRE dry-run primeiro

```bash
# 1. Ver o que vai acontecer
capabilities image --prompt "café" --dry-run

# 2. Se ok, executar
capabilities image --prompt "café" --output output/cafe.png
```

### Fluxo Padrão

1. **Identifique a skill** baseado no pedido do usuário
2. **Leia o SKILL.md** para entender opções e inteligência
3. **Execute dry-run** e mostre preview ao usuário
4. **Peça confirmação** antes de gastar dinheiro
5. **Execute** e informe custo real

### Iteração (Pilar 4)

Quando o usuário pedir ajustes, use `--iterate`:

```bash
# Original gerou "Café Artesanal Premium"
# Usuário quer "mais urgente"

capabilities copy --prompt "Café Artesanal Premium" \
  --type headline --tone urgente
```

---

## Instalação

```bash
pip install claude-capabilities
```

Ou em modo desenvolvimento:
```bash
pip install -e .
```

### CLI

```bash
capabilities status                          # Ver o que está disponível
capabilities init                            # Inicializar no projeto atual
capabilities image --prompt "café" --dry-run # Gerar imagem
capabilities copy --prompt "headline" --dry-run # Gerar copy
capabilities tts --text "Olá" --dry-run      # Gerar áudio
capabilities cost                            # Ver custos
```

---

## Estrutura do Projeto

```
CLAUDE_CAPABILITIES/
├── pyproject.toml         ← Configuração pip install
├── CLAUDE.md              ← Este arquivo (router)
├── claude_capabilities/   ← Pacote Python instalável
│   ├── cli.py             ← Entry point CLI (capabilities command)
│   ├── keys.py            ← Gerenciamento de API keys
│   ├── cost.py            ← Tracking de custos (Pilar 3)
│   ├── image.py           ← Engine de imagens (Pilares 1, 4, 5)
│   ├── text.py            ← Engine de texto/copy
│   ├── audio.py           ← Engine de TTS
│   ├── video.py           ← Engine de vídeo
│   ├── deploy.py          ← Engine de deploy
│   ├── compose.py         ← Orquestrador de pipelines (Pilar 2)
│   └── skills/            ← Capabilities (SKILL.md + scripts)
│       ├── image-gen/
│       ├── copywriter/
│       ├── tts/
│       └── content-pack/
├── output/                ← Arquivos gerados (gitignored)
├── .state/                ← Estado e custos (gitignored)
└── docs/                  ← Documentação
```

---

## APIs Disponíveis

| API | Variável | Uso |
|-----|----------|-----|
| Gemini | `GOOGLE_API_KEY_GEMINI` | Imagens (Imagen), Texto, Embeddings |
| OpenAI | `OPENAI_API_KEY` | DALL-E 3, GPT fallback |
| ElevenLabs | `ELEVENLABS_API_KEY` | TTS premium |
| RunPod | `RUNPOD_API_KEY` | XTTS, GPU tasks |
| Fal.ai | `FAL_KEY` | Kling (vídeo) |
| Pexels | `PEXELS_API_KEY` | Stock media grátis |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | Deploy Pages |

Todas acessíveis via `claude_capabilities/keys.py`.

---

## Regras Obrigatórias

1. **NUNCA** execute operação que custa dinheiro sem dry-run + confirmação
2. **SEMPRE** use os scripts via CLI (não importe libs diretamente)
3. **SEMPRE** informe custos ao usuário
4. Para iteração, use `--iterate` em vez de prompt novo
5. Se a skill não existe ainda (📝), informe e sugira alternativa

---

## Legenda

- ✅ Implementado e testado
- 📝 Planejado, ainda não implementado

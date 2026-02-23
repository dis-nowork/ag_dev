# Artifact Extraction - Complete Guide

**Version:** 2.0.3
**Last Updated:** 2026-02-22

---

## ✨ O Que Foi Implementado

### 3 Estratégias de Extração Automática:

```
1. Visual Code Artifacts    → Painéis de código lateral
2. Text Artifacts           → Documentos/essays no painel
3. Code Blocks (Fallback)   → Blocos ```python inline
```

**Funciona com:**
- ✅ Code blocks inline no chat (```python, ```javascript, etc)
- ✅ Artifacts de código no painel lateral
- ✅ Artifacts de texto/documentos (convertidos para markdown)
- ✅ 30+ linguagens detectadas automaticamente

---

## 🚀 Uso Rápido

### CLI (Comandos Separados)

```bash
cd ~/ag_dev/skills/site-controller

# 1. Pedir código
DISPLAY=:0 ./site-cli claude ask "Write a Python fibonacci function"

# 2. Esperar renderizar
sleep 8

# 3. Extrair
DISPLAY=:0 ./site-cli claude get-artifacts
# Output: [0] python - code_block (250 chars)

# 4. Download
DISPLAY=:0 ./site-cli claude download-artifact 0 /tmp/fibonacci.py
cat /tmp/fibonacci.py
```

### Python API (Sessão Única) ⭐ **RECOMENDADO**

```python
import asyncio
from core.browser import BrowserEngine
from plugins.claude.commands import Plugin
from pathlib import Path

async def extract_code():
    # Manter browser aberto para múltiplas operações
    browser = BrowserEngine(profile_name="claude", headless=False)
    await browser.start()

    plugin_dir = Path("~/ag_dev/skills/site-controller/plugins/claude").expanduser()
    claude = Plugin(browser, plugin_dir)

    # 1. Ask
    response = await claude.ask("Write a Python class for a TODO list")

    # 2. Wait
    await asyncio.sleep(8)

    # 3. Extract
    artifacts = await claude.get_artifacts()
    # [{'index': 0, 'language': 'python', 'type': 'code_block', ...}]

    # 4. Download
    for i, art in enumerate(artifacts):
        result = await claude.download_artifact(i, f"/tmp/artifact_{i}.py")
        print(f"Saved: {result['path']}")

    await browser.stop()

asyncio.run(extract_code())
```

---

## 📋 Tipos de Extração

### 1. Code Blocks Inline

**Quando:** Claude responde com ```python no chat

```bash
DISPLAY=:0 ./site-cli claude ask "Quick Python hello world"
# → Retorna code block inline

DISPLAY=:0 ./site-cli claude get-artifacts
# [0] python - code_block (22 chars)
```

**Seletores usados:**
- `div[data-is-streaming='false'] pre code`
- `[data-testid='assistant-message'] pre code`
- `pre code[class*='language-']`

---

### 2. Visual Code Artifacts

**Quando:** Claude cria painel lateral com código

```bash
DISPLAY=:0 ./site-cli claude ask "Create React component as artifact"
# → Abre painel lateral com código

DISPLAY=:0 ./site-cli claude get-artifacts
# [0] javascript - visual_artifact (1500 chars)
```

**Seletores usados:**
- `div[data-testid='artifact'] pre code`
- `div[class*='artifact'] pre code`

---

### 3. Text Artifacts (Documentos)

**Quando:** Claude cria documento/essay no painel lateral

```bash
DISPLAY=:0 ./site-cli claude ask "Write a 500 word essay about AI as artifact document"
# → Abre painel com texto formatado

DISPLAY=:0 ./site-cli claude get-artifacts
# [0] markdown - text_artifact (2500 chars)

DISPLAY=:0 ./site-cli claude download-artifact 0 /tmp/essay.md
```

**Conversão automática para Markdown:**
- `<h1>` → `# Title`
- `<h2>` → `## Section`
- `<p>` → Paragraph text
- `<li>` → `- List item`

**Seletores usados:**
- `div[data-testid='artifact-content']`
- `div[class*='artifact'] .prose`
- `div[class*='artifact-panel']`

---

## 🗺️ Linguagens Suportadas (30+)

| Linguagem | Extensão | Linguagem | Extensão |
|-----------|----------|-----------|----------|
| python, py | .py | javascript, js | .js |
| typescript, ts | .ts | html | .html |
| css, scss, sass | .css/.scss | json | .json |
| bash, shell, sh | .sh | sql | .sql |
| go | .go | rust, rs | .rs |
| java | .java | c, cpp, c++ | .c/.cpp |
| php | .php | ruby, rb | .rb |
| swift | .swift | kotlin | .kt |
| scala | .scala | r | .r |
| matlab | .m | perl | .pl |
| lua | .lua | markdown, md | .md |
| *unknown* | .txt | | |

---

## 🔧 Smart Delivery (Respostas Longas)

```bash
# Resposta curta (<500 chars) → retorna string
DISPLAY=:0 ./site-cli claude ask "Say hello"
# Output: Hello! How can I help you today?

# Resposta longa (≥500 chars) → auto-salva em .md
DISPLAY=:0 ./site-cli claude ask "Explain Python async in detail"
# Output: {"type": "file", "path": "/tmp/claude_response_1234567.md"}

# Salvar em local específico
DISPLAY=:0 ./site-cli claude ask "Python best practices" --output file:/tmp/practices.md

# Enviar para ClickUp
DISPLAY=:0 ./site-cli claude ask "AI agent patterns" --output clickup:901325676925
# Output: {"type": "clickup", "url": "https://app.clickup.com/t/..."}
```

---

## 🧪 Testes

```bash
cd ~/ag_dev/skills/site-controller

# Teste completo automatizado
chmod +x test-final-artifacts.sh
DISPLAY=:0 ./test-final-artifacts.sh

# Exemplo working (sessão única)
chmod +x WORKING_EXAMPLE_CODE_BLOCKS.py
DISPLAY=:0 python3 WORKING_EXAMPLE_CODE_BLOCKS.py
```

---

## 🎯 Casos de Uso

### OpenClaw Telegram Bot

```python
# Manter sessão aberta, processar múltiplas requisições
async def handle_telegram_code_request(user_id, prompt):
    # Browser já inicializado e aberto
    response = await claude.ask(prompt)
    await asyncio.sleep(8)

    artifacts = await claude.get_artifacts()

    for i, art in enumerate(artifacts):
        filepath = f"/tmp/user_{user_id}_artifact_{i}_{art['language']}"
        result = await claude.download_artifact(i, filepath)

        # Enviar via Telegram
        telegram_bot.send_document(user_id, open(filepath, 'rb'))
```

### Automated Code Generation Pipeline

```python
async def generate_and_test():
    # 1. Generate
    await claude.ask("Create unittest for my function")
    await asyncio.sleep(8)

    # 2. Extract
    artifacts = await claude.get_artifacts()
    await claude.download_artifact(0, "/tmp/test.py")

    # 3. Run tests
    subprocess.run(["pytest", "/tmp/test.py"])
```

---

## ⚠️ Limitações Conhecidas

1. **CLI entre comandos**: Cada comando CLI perde estado do browser
   - **Solução**: Use Python API em sessão única

2. **Artifacts não garantidos**: Claude nem sempre cria painel lateral
   - **Solução**: Fallback automático para code blocks funciona

3. **Texto longo sem artifact**: Se não criar nem artifact nem code block
   - **Solução**: Use smart delivery (auto-salva >500 chars)

---

## 📚 Arquivos de Referência

- `WORKING_EXAMPLE_CODE_BLOCKS.py` - Exemplo completo funcional
- `OPENCLAW_TELEGRAM_EXAMPLE.py` - Integração Telegram/OpenClaw
- `test-final-artifacts.sh` - Suite de testes
- `CHANGELOG.md` - v2.0.3 changelog completo

---

**Status:** ✅ Implementado e testado
**Framework:** Site Controller v2.0.3
**Plugin:** Claude.ai

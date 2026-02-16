> *Migrated from claudio-motor (v1) — reference document*

# 🔄 REPLICATION_GUIDE.md — Guia Completo de Replicação do Claudio OS

*Gerado pelo Academicista em 2026-02-05*

Este guia permite que **qualquer pessoa** replique o Claudio OS em sua própria infraestrutura, do zero até um sistema funcional.

---

## 📋 Índice

1. [Requisitos](#-requisitos)
2. [Passo 1: Infraestrutura Base](#-passo-1-infraestrutura-base)
3. [Passo 2: Instalação do OpenClaw](#-passo-2-instalação-do-openclaw)
4. [Passo 3: Configuração de APIs](#-passo-3-configuração-de-apis)
5. [Passo 4: Clone do Repositório](#-passo-4-clone-do-repositório)
6. [Passo 5: Configuração de Memória](#-passo-5-configuração-de-memória)
7. [Passo 6: Instalação de Dependências](#-passo-6-instalação-de-dependências)
8. [Passo 7: Configuração de Crons](#-passo-7-configuração-de-crons)
9. [Passo 8: Verificação de Funcionamento](#-passo-8-verificação-de-funcionamento)
10. [Troubleshooting](#-troubleshooting)

---

## 📦 Requisitos

### Hardware Mínimo
| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| RAM | 4GB | 8GB |
| CPU | 2 cores | 4 cores |
| Disco | 20GB | 50GB SSD |
| Rede | 100 Mbps | 1 Gbps |

### Software Base
- **OS:** Ubuntu 22.04+ ou Debian 12+
- **Node.js:** v22.x (LTS)
- **Python:** 3.11+
- **Git:** 2.x

### Contas Necessárias
| Serviço | Obrigatório | Custo | Propósito |
|---------|-------------|-------|-----------|
| Anthropic | ✅ | ~$20-50/mês | Claude (modelo principal) |
| Google Cloud | ✅ | Free tier + pay-per-use | Gemini, Vision, Embeddings |
| Supabase | ✅ | Free tier | Memória vetorial |
| Telegram | ✅ | Grátis | Canal de comunicação |
| Brave Search | ⭐ | 2k/mês grátis | Pesquisa web |
| ElevenLabs | ⚪ | $5/mês | TTS premium (opcional) |
| GitHub | ⭐ | Grátis | Armazenamento e CI |

**Legenda:** ✅ Obrigatório | ⭐ Altamente recomendado | ⚪ Opcional

### Custo Mensal Estimado
| Cenário | Custo |
|---------|-------|
| Mínimo (só Claude) | ~$20/mês |
| Recomendado (completo) | ~$25-30/mês |
| Intensivo | ~$50-100/mês |

---

## 🖥️ Passo 1: Infraestrutura Base

### 1.1 Provisionar VPS

**Opção recomendada: Hetzner Cloud**
```bash
# Servidor CX22 (2 vCPU, 4GB RAM, 40GB SSD)
# Custo: ~€4,50/mês
# Localização: Nuremberg (nbg1) ou Falkenstein (fsn1)
```

**Alternativas:**
- DigitalOcean: $24/mês (4GB)
- Vultr: $24/mês (4GB)
- Oracle Cloud: Free tier (4 cores, 24GB) — se disponível

### 1.2 Configurar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências base
sudo apt install -y curl git build-essential python3-pip python3-venv

# Configurar timezone
sudo timedatectl set-timezone America/Sao_Paulo

# Criar usuário (opcional, pode usar root)
# adduser claudio && usermod -aG sudo claudio
```

### 1.3 Instalar Node.js 22

```bash
# Via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version  # v22.x.x
npm --version   # 10.x.x
```

### 1.4 Instalar Python 3.11+

```bash
# Ubuntu 22.04 já tem 3.10, instalar 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Criar alias (opcional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Verificar
python3 --version  # Python 3.11.x
```

---

## 🦎 Passo 2: Instalação do OpenClaw

### 2.1 Instalar OpenClaw

```bash
# Via npm global
sudo npm install -g openclaw

# Verificar instalação
openclaw --version
```

### 2.2 Inicializar Workspace

```bash
# Criar diretório de trabalho
mkdir -p ~/clawd
cd ~/clawd

# Inicializar OpenClaw (siga o wizard)
openclaw init
```

### 2.3 Configurar Gateway

```bash
# Iniciar gateway
openclaw gateway start

# Verificar status
openclaw gateway status
```

### 2.4 Conectar Telegram

```bash
# Criar bot no @BotFather e obter token
# Adicionar ao config
openclaw gateway config.patch --raw '{
  "channels": {
    "telegram": {
      "botToken": "SEU_BOT_TOKEN_AQUI"
    }
  }
}'

# Reiniciar gateway
openclaw gateway restart
```

---

## 🔑 Passo 3: Configuração de APIs

### 3.1 Criar Arquivo de Keys

```bash
# Criar arquivo de chaves (não commitar!)
cat > /tmp/.radar_keys << 'EOF'
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY_GEMINI_CEREBRO=AIza...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BRAVE_API_KEY=BSA...
ELEVENLABS_API_KEY=...
GITHUB_TOKEN=ghp_...
EOF

chmod 600 /tmp/.radar_keys
```

### 3.2 Obter Keys

#### Anthropic (Claude)
1. Acesse: https://console.anthropic.com/
2. Crie conta e adicione créditos
3. Gere API key em Settings → API Keys

#### Google Cloud (Gemini + Vision)
1. Acesse: https://console.cloud.google.com/
2. Crie projeto novo
3. Ative APIs:
   - Generative Language API
   - Cloud Vision API
4. Crie credencial → API Key
5. (Opcional) Configure Secret Manager para produção

#### Supabase (Memória Vetorial)
1. Acesse: https://supabase.com/
2. Crie projeto novo
3. Copie URL e Keys de Settings → API
4. Execute SQL para criar tabela:

```sql
-- Habilitar extensão vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela de memórias
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para busca vetorial
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Criar função de busca
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.metadata
  FROM memories m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### Brave Search
1. Acesse: https://brave.com/search/api/
2. Crie conta
3. Gere API key (2.000 queries/mês grátis)

#### Telegram Bot
1. Abra @BotFather no Telegram
2. `/newbot` → siga instruções
3. Copie o token gerado
4. Configure comandos:
   ```
   /setcommands
   status - Ver status do sistema
   help - Ajuda
   ```

---

## 📥 Passo 4: Clone do Repositório

### 4.1 Clonar Repositório

```bash
cd ~/clawd

# Clone público (se disponível)
git clone https://github.com/kml-einerd/claudio-motor.git motor

# Ou criar do zero
mkdir -p claudio-os/{toolbox,engines,briefings,arsenal-scans,references}
mkdir -p memory docs/architecture docs/capabilities
```

### 4.2 Copiar Arquivos Base

```bash
# Copiar arquivos de configuração
cp motor/exports/AGENTS.md ~/clawd/
cp motor/exports/SOUL.md ~/clawd/
cp motor/exports/USER.md ~/clawd/
cp motor/exports/MEMORY.md ~/clawd/
cp motor/exports/TOOLS.md ~/clawd/
cp motor/exports/IDENTITY.md ~/clawd/
cp motor/exports/HEARTBEAT.md ~/clawd/

# Copiar toolbox
cp -r motor/claudio-os/toolbox/* ~/clawd/claudio-os/toolbox/
```

### 4.3 Personalizar Arquivos

Edite `USER.md` com suas informações:
```markdown
# USER.md - Sobre o Usuário

- **Nome:** Seu Nome
- **Fuso horário:** America/Sao_Paulo
- **Idioma preferido:** Português brasileiro

## Preferências
- [Suas preferências aqui]
```

Edite `SOUL.md` se quiser personalizar a personalidade.

---

## 🧠 Passo 5: Configuração de Memória

### 5.1 Verificar Conexão Supabase

```bash
python3 << 'EOF'
import urllib.request, json

keys = dict(l.strip().split('=',1) for l in open('/tmp/.radar_keys') if '=' in l)

# Testar conexão
url = f"{keys['SUPABASE_URL']}/rest/v1/memories?select=count"
req = urllib.request.Request(url, headers={
    'apikey': keys['SUPABASE_ANON_KEY'],
    'Authorization': f"Bearer {keys['SUPABASE_ANON_KEY']}"
})
try:
    resp = urllib.request.urlopen(req)
    print("✅ Conexão Supabase OK")
except Exception as e:
    print(f"❌ Erro: {e}")
EOF
```

### 5.2 Testar Embedding

```bash
python3 << 'EOF'
import urllib.request, json

keys = dict(l.strip().split('=',1) for l in open('/tmp/.radar_keys') if '=' in l)

url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={keys['GOOGLE_API_KEY_GEMINI_CEREBRO']}"
body = json.dumps({
    'model': 'models/text-embedding-004',
    'content': {'parts': [{'text': 'Teste de embedding'}]}
}).encode()

req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())

if 'embedding' in data:
    print(f"✅ Embedding OK - {len(data['embedding']['values'])} dimensões")
else:
    print(f"❌ Erro: {data}")
EOF
```

### 5.3 Configurar State do Memory Manager

```bash
# Criar state inicial
cat > ~/clawd/claudio-os/memory-manager-state.json << 'EOF'
{
  "extracted_sessions": {},
  "last_run": null
}
EOF
```

---

## 📦 Passo 6: Instalação de Dependências

### 6.1 Dependências Python

```bash
# Criar venv (opcional mas recomendado)
python3 -m venv ~/clawd/.venv
source ~/clawd/.venv/bin/activate

# Instalar dependências principais
pip install --upgrade pip
pip install crawl4ai docling fastmcp

# Dependências adicionais
pip install aiohttp beautifulsoup4 pillow reportlab
```

### 6.2 Testar Crawl4ai

```bash
python3 << 'EOF'
from crawl4ai import WebCrawler
crawler = WebCrawler()
crawler.warmup()
result = crawler.run("https://news.ycombinator.com")
print(f"✅ Crawl4ai OK - {len(result.markdown)} chars extraídos")
EOF
```

### 6.3 Testar Docling

```bash
python3 << 'EOF'
from docling.document_converter import DocumentConverter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import tempfile

# Criar PDF de teste
with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
    c = canvas.Canvas(f.name, pagesize=letter)
    c.drawString(100, 750, "Teste Docling")
    c.save()
    
    converter = DocumentConverter()
    result = converter.convert(f.name)
    print(f"✅ Docling OK - {len(result.document.export_to_markdown())} chars")
EOF
```

### 6.4 Instalar Ferramentas CLI (Opcionais)

```bash
# yt-dlp (download de vídeos)
pip install yt-dlp

# ffmpeg (processamento de mídia)
sudo apt install -y ffmpeg

# ImageMagick (processamento de imagens)
sudo apt install -y imagemagick

# Tesseract (OCR local)
sudo apt install -y tesseract-ocr tesseract-ocr-por
```

---

## ⏰ Passo 7: Configuração de Crons

### 7.1 Intelligence Briefing (Diário)

Via OpenClaw:
```javascript
cron action=add job={
  "name": "Intelligence Briefing Diário",
  "schedule": { 
    "kind": "cron", 
    "expr": "0 11 * * *",
    "tz": "UTC"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Execute o Intelligence Engine. Rode: BRAVE_KEY=$(grep BRAVE_API_KEY /tmp/.radar_keys | cut -d= -f2) GEMINI_KEY=$(grep GOOGLE_API_KEY_GEMINI_CEREBRO /tmp/.radar_keys | cut -d= -f2) python3 -u ~/clawd/claudio-os/toolbox/intelligence-engine.py",
    "model": "google/gemini-3-flash-preview",
    "timeoutSeconds": 180,
    "deliver": true,
    "bestEffortDeliver": true
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

### 7.2 Session Memory Manager (A cada 3h)

```javascript
cron action=add job={
  "name": "Session Memory Manager",
  "schedule": { 
    "kind": "cron", 
    "expr": "0 */3 * * *",
    "tz": "UTC"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Execute o Session Memory Manager: python3 ~/clawd/claudio-os/toolbox/session-memory-manager.py. Reporte quantas sessões foram processadas e chunks extraídos.",
    "model": "google/gemini-3-pro-preview",
    "timeoutSeconds": 300
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

### 7.3 Arsenal Scanner (Semanal)

```javascript
cron action=add job={
  "name": "GitHub Arsenal Scan Semanal",
  "schedule": { 
    "kind": "cron", 
    "expr": "0 14 * * 1",
    "tz": "UTC"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Execute o GitHub Arsenal Scanner: python3 ~/clawd/claudio-os/toolbox/arsenal-scanner.py. Envie resumo dos top 5 repos encontrados.",
    "model": "google/gemini-3-flash-preview",
    "timeoutSeconds": 120,
    "deliver": true
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

### 7.4 Verificar Crons

```bash
# Listar todos os crons
openclaw cron list

# Verificar último status
openclaw cron runs --job-id <ID>
```

---

## ✅ Passo 8: Verificação de Funcionamento

### 8.1 Checklist de Verificação

```bash
# 1. OpenClaw Gateway
openclaw gateway status
# ✅ Deve mostrar "running"

# 2. Telegram
# Envie /status no bot
# ✅ Deve responder com status do sistema

# 3. Supabase
python3 -c "
import urllib.request, json
keys = dict(l.strip().split('=',1) for l in open('/tmp/.radar_keys') if '=' in l)
url = f\"{keys['SUPABASE_URL']}/rest/v1/memories?select=count\"
req = urllib.request.Request(url, headers={'apikey': keys['SUPABASE_ANON_KEY']})
print('✅ Supabase OK' if urllib.request.urlopen(req) else '❌ Erro')
"

# 4. Intelligence Engine
BRAVE_KEY=$(grep BRAVE_API_KEY /tmp/.radar_keys | cut -d= -f2) \
GEMINI_KEY=$(grep GOOGLE_API_KEY_GEMINI_CEREBRO /tmp/.radar_keys | cut -d= -f2) \
python3 ~/clawd/claudio-os/toolbox/intelligence-engine.py
# ✅ Deve gerar briefing em ~/clawd/claudio-os/briefings/

# 5. Memory Manager
python3 ~/clawd/claudio-os/toolbox/session-memory-manager.py --dry-run
# ✅ Deve listar sessões sem erros

# 6. Skills
ls ~/clawd/skills/ | wc -l
# ✅ Deve mostrar número de skills instaladas
```

### 8.2 Teste End-to-End

1. **Envie mensagem no Telegram:** "Olá, quem é você?"
2. **Resposta esperada:** Claudio se apresenta conforme SOUL.md
3. **Teste comando:** "/status"
4. **Resposta esperada:** Status do sistema com métricas

### 8.3 Monitoramento Inicial

```bash
# Logs do gateway
journalctl -u openclaw-gateway -f

# Ou se rodando manualmente
openclaw gateway logs
```

---

## 🔧 Troubleshooting

### Gateway não inicia
```bash
# Verificar porta em uso
lsof -i :3000

# Verificar logs
openclaw gateway logs --lines 50

# Reiniciar
openclaw gateway stop && openclaw gateway start
```

### Telegram não responde
1. Verifique se o bot token está correto
2. Confirme que o bot foi iniciado (/start no chat)
3. Verifique se há erros no log do gateway

### Supabase erro de conexão
1. Verifique se as keys estão corretas
2. Confirme que a tabela `memories` existe
3. Teste conexão manualmente via curl

### Memory Manager falha
1. Verifique se há sessões para processar
2. Confirme que as keys Gemini estão válidas
3. Rode com `--dry-run` para debug

### Cron não executa
1. Verifique se o job está habilitado (`enabled: true`)
2. Confirme expressão cron está correta
3. Rode manualmente: `openclaw cron run --job-id <ID>`

---

## 📊 Métricas de Sucesso

Após setup completo, você deve ter:

| Componente | Verificação |
|------------|-------------|
| Gateway | `openclaw gateway status` → running |
| Telegram | Bot responde mensagens |
| Supabase | Tabela `memories` acessível |
| Intelligence Engine | Briefing gerado |
| Memory Manager | State file atualizado |
| Crons | 3+ jobs listados |

---

## 🚀 Próximos Passos

1. **Personalizar SOUL.md** com sua personalidade preferida
2. **Adicionar mais skills** conforme necessidade
3. **Configurar alertas** para erros críticos
4. **Documentar customizações** no TOOLS.md
5. **Contribuir melhorias** de volta ao repositório

---

## 📚 Recursos Adicionais

- [OpenClaw Docs](https://docs.openclaw.ai)
- [Supabase Docs](https://supabase.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Anthropic Docs](https://docs.anthropic.com)

---

*Guia criado pelo Academicista — 2026-02-05*
*Testado em: Ubuntu 22.04, Hetzner CX22, OpenClaw v1.x*

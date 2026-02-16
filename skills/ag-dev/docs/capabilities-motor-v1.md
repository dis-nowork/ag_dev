> *Migrated from claudio-motor (v1) — reference document*

# CAPABILITIES.md — Inventário Completo do Claudio OS

*Gerado pelo Academicista em 2026-02-09*

Este documento mapeia TODAS as capacidades do ecossistema Claudio OS para garantir replicabilidade e documentação completa.

---

## 📊 Resumo Executivo

| Categoria | Quantidade |
|-----------|------------|
| **Engines (Motores)** | 5 operacionais |
| **Cron Jobs** | 3 ativos |
| **Toolbox Scripts** | 32 ferramentas |
| **Skills** | 51 skills especializadas |
| **Memória Vetorial** | 1.300+ chunks (Supabase pgvector) |
| **Integrações** | 16+ APIs/serviços |

---

## 🚀 ENGINES OPERACIONAIS

### 1. Intelligence Engine
- **Localização:** `/root/clawd/claudio-os/toolbox/intelligence-engine.py`
- **O que é:** Motor de briefing diário automatizado
- **O que faz:** Brave Search + HN + Google News Brasil → Gemini analisa → Resumo estruturado
- **Cron:** Diário às 11:00 UTC (8h SP)
- **Output:** `/root/clawd/claudio-os/briefings/briefing-YYYY-MM-DD.md`
- **Dependências:** Brave API, Gemini API
- **Tópicos monitorados:**
  - AI agents tools 2026
  - Marketing digital tendências Brasil
  - Open source self-hosted alternatives
  - Content creation AI tools
  - Funis de vendas automação
  - WhatsApp Business API automation

### 2. Session Memory Manager
- **Localização:** `/root/clawd/claudio-os/toolbox/session-memory-manager.py`
- **O que é:** Gestor de memória vetorial automático
- **O que faz:** Detecta sessões >50K tokens → Extrai → Embeddings → Supabase pgvector → Prepara compaction
- **Cron:** A cada 3 horas
- **Filosofia:** Contexto = RAM (curto prazo), Supabase = HD (longo prazo)
- **State file:** `/root/clawd/claudio-os/memory-manager-state.json`
- **Extractions:** `/root/clawd/memory/extractions/`
- **Dependências:** Gemini text-embedding-004, Supabase pgvector

### 3. Arsenal Scanner (GitHub)
- **Localização:** `/root/clawd/claudio-os/toolbox/arsenal-scanner.py`
- **O que é:** Scanner semanal de repositórios GitHub úteis
- **O que faz:** Busca repos trending → Analisa relevância → Relatório com top ferramentas
- **Cron:** Segundas às 14:00 UTC (11h SP)
- **Output:** `/root/clawd/claudio-os/arsenal-scans/scan-YYYY-MM-DD_HHMM.md`
- **Dependências:** GitHub API

### 4. Creative Factory (Sob demanda)
- **Conceito:** Pipeline Brief → Copy → Imagen4 → Landing page HTML
- **Status:** Componentes testados, pipeline manual
- **Dependências:** Gemini, Imagen 4

### 5. Video Director Studio (ViMax)
- **Localização:** `/root/clawd/tools/vimax/`
- **Skill:** `/root/clawd/skills/video-director/`
- **O que é:** Pipeline de produção de vídeos AI end-to-end
- **O que faz:** Idea → Script → Characters → Video
- **Status:** Configurado, aguardando testes extensivos
- **Dependências:** Gemini 2.5 Flash, Imagen 3, Veo 3.1

---

## ⏰ CRON JOBS ATIVOS

| ID | Nome | Schedule | Modelo | Descrição |
|----|------|----------|--------|-----------|
| `6c67ab65` | Intelligence Briefing Diário | `0 11 * * *` (8h SP) | Gemini Flash | Briefing matinal de tendências |
| `217cd077` | GitHub Arsenal Scan Semanal | `0 14 * * 1` (seg 11h SP) | Gemini Flash | Scan de repos úteis |
| `f332d6d3` | Session Memory Manager | `0 */3 * * *` | Gemini Pro | Extração de sessões → Supabase |

---

## 🧰 TOOLBOX — Scripts Disponíveis

| Script | Descrição | Testado |
|--------|-----------|---------|
| `intelligence-engine.py` | Briefing diário automatizado | ✅ |
| `session-memory-manager.py` | Gestão de memória vetorial | ✅ |
| `arsenal-scanner.py` | Scanner GitHub semanal | ✅ |
| `dashboard-full-update.py` | Dashboard HTML do sistema | ✅ |
| `dashboard-update.py` | Atualização rápida dashboard | ✅ |
| `design-gen.js` | Geração de designs programáticos | - |
| `vision-api.py` | Google Vision API wrapper | - |
| `drive-downloader.py` | Download de arquivos do Drive | ✅ |
| `claudio-mcp-server.py` | Servidor MCP (FastMCP) | ✅ |
| `mcp-tools.py` | Ferramentas MCP auxiliares | - |
| `test-crawl4ai.py` | Teste do crawler Crawl4ai | ✅ |
| `test-docling.py` | Teste do parser Docling | ✅ |
| `scrape-trends*.py` | Variantes de scraping de tendências | ❌ |
| `test-pytrends*.py` | Testes pytrends (deprecated) | ❌ |
| `get-trends-rss.py` | Tendências via RSS | - |
| `video-director.py` | Wrapper para ViMax | - |
| `ugc_skincare.py` | Pipeline de vídeo UGC Skincare | - |

### Legenda de Status
- ✅ Testado e funcional
- ❌ Falhou nos testes
- `-` Não testado ainda

---

## 🎯 SKILLS DISPONÍVEIS (51)

Skills são capacidades especializadas que o Claudio pode invocar.

### Categoria: AI & Agents
| Skill | Descrição |
|-------|-----------|
| `agent-swarm` | Orquestração multi-agente com MCP |
| `claude-multi-agent` | Coordenação de agentes Claude |
| `collaborating-with-ai` | Delegação para Codex/Gemini |
| `prompt-engineering` | Técnicas de prompt engineering |
| `creating-skills` | Criação de novas skills |
| `skill-creator` | Criação avançada de skills |

### Categoria: Código & Dev
| Skill | Descrição |
|-------|-----------|
| `ag-dev` | Desenvolvimento assistido |
| `code-review` | Review automatizado de PRs |
| `feature-dev` | Workflow de 7 fases para features |
| `review-implementing` | Implementação de feedback de review |
| `rails-dev` | Stack completo Rails (10+ sub-skills) |
| `webapp-testing` | Testes com Playwright |
| `coding-agent` | Controle de agentes de código CLI |
| `github` | Interação via `gh` CLI |

### Categoria: Documentos & Dados
| Skill | Descrição |
|-------|-----------|
| `pdf` | Criar, ler, manipular PDFs |
| `docx` | Word documents |
| `pptx` | PowerPoint presentations |
| `xlsx` | Excel spreadsheets |
| `csv-data-summarizer` | Análise de CSVs |
| `postgres` | Queries PostgreSQL seguras |

### Categoria: Conteúdo & Criativo
| Skill | Descrição |
|-------|-----------|
| `content-research-writer` | Pesquisa e escrita de artigos |
| `copy-squad` | Sistema 11 agentes de copywriting DR |
| `imagen` | Geração de imagens (Gemini) |
| `premium-frontend` | Interfaces frontend premium |
| `web-artifacts-builder` | Artefatos HTML React/Tailwind |
| `react-artifacts-builder` | Apps React production-grade |
| `d3-viz` | Visualizações D3.js |
| `theme-factory` | Temas e estilos consistentes |
| `video-director` | Produção de vídeos AI (ViMax) |

### Categoria: Marketing & Sales
| Skill | Descrição |
|-------|-----------|
| `competitive-ads-extractor` | Extração de anúncios concorrentes |
| `lead-research` | Pesquisa e qualificação de leads |
| `retention-optimization-expert` | Otimização de retenção |
| `tailored-resume-generator` | Currículos customizados |

### Categoria: Mídia & Arquivos
| Skill | Descrição |
|-------|-----------|
| `article-extractor` | Extração de artigos web |
| `video-downloader` | Download de vídeos (yt-dlp) |
| `image-enhancer` | Melhoria de imagens |
| `file-organizer` | Organização de arquivos |
| `invoice-organizer` | Organização de notas fiscais |
| `video-frames` | Extração de frames com ffmpeg |
| `openai-whisper` | Transcrição local (Whisper) |

### Categoria: Pesquisa & Análise
| Skill | Descrição |
|-------|-----------|
| `brainstorming` | Estruturação de ideias |
| `family-history-research` | Genealogia |
| `langsmith-fetch` | Debug de agents LangChain |
| `notebooklm-integration` | Integração NotebookLM |
| `reddit-fetch` | Fetch de conteúdo Reddit |
| `tapestry` | Interligação de documentos |
| `gemini` | Q&A One-shot com Gemini |
| `weather` | Previsão do tempo |

### Categoria: Processo & Workflow
| Skill | Descrição |
|-------|-----------|
| `process-modeling` | Modelagem BPMN |
| `project-manager` | Gestão de projetos |
| `changelog-generator` | Geração de changelogs |
| `explanatory-output` | Output educacional |
| `tmux` | Controle remoto de sessões tmux |

### Categoria: Segurança & Infra
| Skill | Descrição |
|-------|-----------|
| `sentinel` | Análise de prompt injection |
| `hookify` | Criação de hooks de segurança |
| `domain-name-brainstormer` | Brainstorm de domínios |
| `healthcheck` | Hardening e auditoria de segurança |

### Categoria: Especializadas
| Skill | Descrição |
|-------|-----------|
| `architect-of-exclusion` | Análise anti-amadorismo |
| `invertido` | (A documentar) |

---

## 🧠 SISTEMA DE MEMÓRIA

### Arquitetura
```
┌─────────────────────────────────────────────────┐
│           MEMÓRIA DO CLAUDIO OS                 │
├─────────────────────────────────────────────────┤
│  CONTEXTO (sessão) = RAM                        │
│  • Curto/médio prazo                            │
│  • Leve, compactável                            │
├─────────────────────────────────────────────────┤
│  SUPABASE (pgvector) = HD                       │
│  • Longo prazo total                            │
│  • 1.300+ chunks                                │
│  • Semantic search                              │
├─────────────────────────────────────────────────┤
│  ARQUIVOS .MD = Cache                           │
│  • MEMORY.md (curado)                           │
│  • memory/YYYY-MM-DD.md (diários)               │
│  • memory/extractions/ (processados)            │
└─────────────────────────────────────────────────┘
```

### Componentes
| Componente | Localização | Descrição |
|------------|-------------|-----------|
| Supabase pgvector | `yxsvdkfdwigtlqjihbce.supabase.co` | 1.300+ chunks vetoriais |
| Tabela | `memories` | Armazenamento de chunks |
| RPC | `search_memories` | Busca semântica |
| Embedding | Gemini text-embedding-004 | 768 dimensões |
| State | `memory-manager-state.json` | Estado do extrator |

---

## 🔌 INTEGRAÇÕES (APIs & Serviços)

### AI Models
| Serviço | Uso | Custo |
|---------|-----|-------|
| Claude Opus | Raciocínio principal | Pay-per-use |
| Gemini Pro | Tarefas complexas | Free tier |
| Gemini Flash | Tarefas rápidas | ~Grátis |
| Imagen 4 | Geração de imagens | Pay-per-use |
| ViMax | Produção de vídeo | Pay-per-use |

### APIs de Dados
| API | Uso | Custo |
|-----|-----|-------|
| Brave Search | Pesquisa web | 2k/mês free |
| Google Vision | OCR | Pay-per-use |
| Pexels | Imagens stock | Free |
| HackerNews | Tech trends | Free |

### Serviços
| Serviço | Uso | Status |
|---------|-----|--------|
| Supabase | Memória vetorial | ✅ Ativo |
| ElevenLabs | TTS premium | ✅ Ativo |
| Telegram Bot | Canal principal | ✅ Ativo |
| n8n | Automações | ✅ Ativo (porta 5678) |

---

## 📂 ESTRUTURA DE DIRETÓRIOS

```
/root/clawd/
├── AGENTS.md          # Instruções do sistema
├── SOUL.md            # Personalidade e identidade
├── USER.md            # Sobre o usuário (KML)
├── MEMORY.md          # Memória curada de longo prazo
├── TOOLS.md           # Notas locais de ferramentas
├── HEARTBEAT.md       # Tarefas periódicas
├── IDENTITY.md        # Identificação básica
│
├── claudio-os/        # Motor de soluções
│   ├── toolbox/       # Scripts operacionais (32)
│   ├── engines/       # Engines principais
│   ├── briefings/     # Briefings diários
│   ├── arsenal-scans/ # Scans do GitHub
│   ├── dashboard/     # HTML dashboard
│   ├── references/    # Referências técnicas
│   └── memory-manager-state.json
│
├── memory/            # Logs e extrações
│   ├── YYYY-MM-DD.md  # Logs diários
│   └── extractions/   # Sessões extraídas
│
├── docs/              # Documentação
│   ├── CAPABILITIES.md    # Este arquivo
│   ├── arsenal-deep-map.md
│   ├── PRD-expansion-v2.md
│   ├── architecture/
│   └── capabilities/
│
└── skills/            # (link para /tmp/claudio-motor/skills)
```

---

## ✅ STATUS DOS TESTES (2026-02-09)

| Componente | Status | Notas |
|------------|--------|-------|
| Crawl4ai | ✅ PASS | Extração markdown limpo |
| Docling | ✅ PASS | PDF 14.6MB processado |
| FastMCP | ✅ PASS | Servidor funcional |
| Intelligence Engine | ✅ PASS | Briefings diários OK |
| Arsenal Scanner | ✅ PASS | 29 repos no último scan |
| Supabase Search | ✅ PASS | 5 resultados, threshold 0.25 |
| ViMax | 🟡 PEND | Configurado, falta teste extensivo |
| Google Trends | ❌ FAIL | API deprecated, precisa SerpAPI |

---

## 🔥 COMBINAÇÕES EXPLOSIVAS (Potenciais)

1. **Fábrica de Conteúdo Autônoma**
   - TrendRadar → Gemini → TTS → Vídeo → Postiz
   - Resultado: Canal faceless 24/7

2. **Consultor de Documentos**
   - Docling → PageIndex → AntV → Telegram
   - Resultado: Análise + infográfico em segundos

3. **SDR Infalível**
   - Brave → Crawl4ai → BillionMail → CRM
   - Resultado: Prospecção B2B de alta escala

4. **Contador de Elite**
   - OCR → LangExtract → Bigcapital
   - Resultado: Automação fiscal total

---

## 📌 PRÓXIMOS PASSOS (Academicista)

- [ ] Documentar cada Engine em `/docs/capabilities/`
- [ ] Criar TOOLS_MAP.md detalhado
- [ ] Criar REPLICATION_GUIDE.md
- [ ] Documentar arquitetura de memória
- [ ] Documentar integrações detalhadamente

---

*Este documento é um organismo vivo. Atualizar conforme novas capacidades forem adicionadas.*

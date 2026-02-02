# ⚡ AG Dev v2.1 — Multi-Agent Development Orchestration

Plataforma de orquestração multi-agente para desenvolvimento de software. 14 agentes IA especializados, 10 workflows, 5 squads, 30+ SuperSkills — tudo orquestrado via Clawdbot/Telegram.

## 🚀 Quick Start

```bash
# Iniciar
cd /root/clawd/ag_dev && ./scripts/agdev.sh start

# Status
./scripts/agdev.sh status

# Parar
./scripts/agdev.sh stop
```

**Acesso:** http://localhost:3456  
**Health:** http://localhost:3456/health

> 📖 Guia completo: [QUICKSTART.md](QUICKSTART.md)

## 📦 O que é

AG Dev orquestra múltiplos agentes de IA — cada um com persona especializada — para construir software de forma coordenada. Usa workflows YAML, squads (times), terminais PTY reais, grafo temporal, e memória em 3 camadas.

**Filosofia:** Sob demanda. Liga quando precisa, desliga quando terminar.

## 🏗️ Arquitetura

```
┌─────────────────┐    SSE     ┌──────────────────────┐
│   Web UI        │◄──────────►│   Express Server     │
│   (React)       │            │   (Modular Routes)   │
└─────────────────┘            └──────────┬───────────┘
                                          │
                    ┌─────────────────────┼────────────────────┐
                    │                     │                    │
              ┌─────▼──────┐     ┌───────▼───────┐   ┌──────▼───────┐
              │ Orchestrator│     │ Squad Manager │   │ Runtime Layer│
              │ (agents +   │     │ (teams)       │   │ (Clawdbot    │
              │  workflows) │     └───────────────┘   │  Gateway)    │
              └─────┬──────┘                          └──────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌──▼──────┐
    │Agent 1 │ │Agent 2 │ │Agent N  │
    │ (PTY)  │ │ (PTY)  │ │ (PTY)   │
    └────────┘ └────────┘ └─────────┘
```

## 🤖 Agentes (14)

| Agente | Papel |
|--------|-------|
| aios-master | Consultor sênior, visão sistêmica |
| analyst | Análise de requisitos, decomposição |
| architect | Design de arquitetura, padrões |
| dev | Implementação de código |
| qa | Testes, qualidade, code review |
| devops | CI/CD, deploy, infraestrutura |
| pm | Gestão de projeto |
| po | Product owner, backlog |
| sm | Scrum master |
| data-engineer | Dados, pipelines, ETL |
| ux-design-expert | UX/UI design |
| content-writer | Documentação técnica |
| seo-analyst | SEO, performance web |
| squad-creator | Cria squads customizados |

## 📋 Workflows (10)

| Workflow | Tipo |
|----------|------|
| greenfield-fullstack | Projeto novo completo |
| greenfield-service | Novo microserviço |
| greenfield-ui | Nova interface |
| brownfield-fullstack | Feature em projeto existente |
| brownfield-discovery | Análise de codebase |
| brownfield-service | Serviço em codebase existente |
| brownfield-ui | UI em codebase existente |
| qa-loop | Loop de qualidade |
| spec-pipeline | Pipeline de especificação |
| auto-worktree | Worktree git automático |

## 📁 Estrutura

```
ag_dev/
├── server/                  # Backend Express
│   ├── server-modular.js    # Entry point (modular, ~120L)
│   ├── server.js            # Entry point (legacy, 1326L)
│   ├── routes/              # 12 route modules
│   │   ├── terminals.js     # /api/terminals/*
│   │   ├── agents.js        # /api/agents/*
│   │   ├── workflows.js     # /api/workflows/*
│   │   ├── squads.js        # /api/squads/*
│   │   ├── ralph.js         # /api/ralph/*
│   │   ├── context.js       # /api/context/*
│   │   ├── graph.js         # /api/graph/*
│   │   ├── superskills.js   # /api/superskills/*
│   │   ├── runtime.js       # /api/runtime/*
│   │   ├── memory.js        # /api/memory/*
│   │   └── system.js        # SSE, health, chat, metrics
│   ├── orchestrator.js      # Cérebro
│   ├── terminal-manager.js  # PTY manager
│   ├── squad-manager.js     # Squad coordination
│   ├── runtimes/            # Clawdbot + standalone
│   └── ...
├── core/                    # Agent/workflow definitions
├── superskills/             # 30+ extensible skills
├── ui-dist/                 # Frontend compilado
├── scripts/agdev.sh         # CLI management
├── docs/                    # Documentation
│   ├── SYSTEM-XRAY.md       # Full system dissection
│   └── V3-ROADMAP.md        # Next version roadmap
├── QUICKSTART.md            # Usage guide
└── config.json              # Configuration
```

## 📖 Docs

- **[QUICKSTART.md](QUICKSTART.md)** — Como usar, exemplos, APIs
- **[docs/SYSTEM-XRAY.md](docs/SYSTEM-XRAY.md)** — Dissecação técnica completa
- **[docs/V3-ROADMAP.md](docs/V3-ROADMAP.md)** — Roadmap V3 (ACP, Claude Code, quality gates)

## 🔧 Configuração

`config.json` — porta, limites de terminal, caminhos, gateway Clawdbot.

Environment overrides: `AG_DEV_PORT`, `AG_DEV_HOST`, `AG_DEV_DATA_DIR`, `AG_DEV_RUNTIME`.

---

*AG Dev v2.1 — Built for Clawdbot ecosystem*

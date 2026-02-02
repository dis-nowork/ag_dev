# ⚡ AG Dev — Guia Rápido

## O que é

AG Dev é uma plataforma de orquestração multi-agente para desenvolvimento de software. Você comanda via Telegram, o Claudio interpreta e orquestra 14 agentes especializados (Architect, Developer, QA, DevOps, etc.) que trabalham juntos em squads e workflows definidos.

**Filosofia:** AG Dev é sob demanda. Liga quando precisa, desliga quando terminar.

---

## 🚀 Iniciar

```bash
cd /root/clawd/ag_dev && ./scripts/agdev.sh start
```

## 🛑 Parar

```bash
cd /root/clawd/ag_dev && ./scripts/agdev.sh stop
```

## 📊 Status

```bash
./scripts/agdev.sh status
```

---

## 💬 Como usar via Telegram

Você fala naturalmente no grupo AG Dev. O Claudio traduz seus pedidos em ações:

| Você diz | O que acontece |
|----------|----------------|
| "Cria um squad pra desenvolver feature X" | Spawna agentes (dev + qa + architect), monta squad, inicia workflow |
| "Roda o workflow greenfield-fullstack pro projeto Y" | Executa o workflow YAML com os agentes adequados |
| "O que o QA achou?" | Consulta o output do agente QA |
| "Para tudo" | Pausa workflows e terminais ativos |
| "Status" | Mostra agents rodando, workflows ativos, métricas |

---

## 🤖 Agentes Disponíveis (14)

| Agente | Papel |
|--------|-------|
| **aios-master** | Consultor sênior, visão sistêmica |
| **analyst** | Análise de requisitos, decomposição |
| **architect** | Design de arquitetura, padrões |
| **dev** | Implementação de código |
| **qa** | Testes, qualidade, code review |
| **devops** | CI/CD, deploy, infra |
| **pm** | Gestão de projeto, priorização |
| **po** | Product owner, backlog |
| **sm** | Scrum master, facilitação |
| **data-engineer** | Dados, pipelines, ETL |
| **ux-design-expert** | UX/UI design |
| **content-writer** | Documentação técnica |
| **seo-analyst** | SEO, performance web |
| **squad-creator** | Cria squads customizados |

## 📋 Workflows Disponíveis (10)

| Workflow | Descrição |
|----------|-----------|
| `greenfield-fullstack` | Projeto novo, stack completa |
| `greenfield-service` | Novo microserviço/API |
| `greenfield-ui` | Nova interface/frontend |
| `brownfield-fullstack` | Feature em projeto existente |
| `brownfield-discovery` | Análise de codebase existente |
| `brownfield-service` | Serviço em projeto existente |
| `brownfield-ui` | UI em projeto existente |
| `qa-loop` | Loop de qualidade (testes + review) |
| `spec-pipeline` | Pipeline de especificação |
| `auto-worktree` | Worktree automático com git |

## 🏛 Squads

Squads são times pré-configurados de agentes. Você pode:
- Usar squads prontos (5 configurações)
- Criar squads customizados via API
- Ativar/desativar squads dinamicamente

---

## 🔧 API (para referência)

Base URL: `http://localhost:3456`

### Principais endpoints:
- `GET /health` — Health check
- `GET /api/agents` — Lista agentes
- `GET /api/workflows` — Lista workflows
- `POST /api/workflows/:name/start` — Inicia workflow
- `POST /api/terminals` — Spawna terminal/agente
- `GET /api/squads` — Lista squads
- `POST /api/squads/:id/activate` — Ativa squad
- `GET /api/runtime/status` — Status do runtime Clawdbot
- `GET /api/graph/stats` — Métricas do grafo de agentes
- `POST /api/superskills/:name/run` — Executa SuperSkill

---

## 📁 Estrutura

```
ag_dev/
├── server/              # Backend (Express modular)
│   ├── server-modular.js  # Entry point (~120 linhas)
│   ├── routes/          # Route files separados
│   ├── orchestrator.js  # Cérebro: agents + workflows
│   ├── terminal-manager.js
│   ├── squad-manager.js
│   ├── runtimes/        # Clawdbot + standalone
│   └── ...
├── core/                # Definições
│   ├── agents/          # 14 personas .md
│   ├── workflows/       # 10 workflows .yaml
│   └── squads/          # 5 configs .json
├── superskills/         # 30+ skills plugáveis
├── ui-dist/             # Frontend compilado
├── scripts/agdev.sh     # CLI start/stop/status
└── docs/                # Documentação
```

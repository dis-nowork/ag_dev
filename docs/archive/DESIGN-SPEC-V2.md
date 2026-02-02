# AG Dev — Design Specification v2.0
## Council Review + OpenClaw Integration Blueprint

*Revisão pelo conselho de design + análise profunda do repositório OpenClaw (Clawdbot)*

---

## 0. Análise do OpenClaw — O Que Dominar

Após estudo profundo do código-fonte do Clawdbot (OpenClaw), identificamos a arquitetura real:

### Arquitetura Core
```
Gateway (WebSocket + HTTP)
├── Agent Loop (pi-embedded runtime)
│   ├── Session Manager (JSONL transcripts)
│   ├── Tool Pipeline (before/after hooks)
│   ├── Model Providers (auth profiles)
│   └── Streaming (SSE lifecycle events)
├── Plugin System (extensions/*.ts)
│   ├── Gateway RPC methods
│   ├── Agent tools
│   ├── CLI commands
│   └── Background services
├── Channel System (Telegram, WhatsApp, Discord...)
├── Multi-Agent Routing (isolated workspaces)
├── Session Lanes (concurrency control)
└── Hooks (command + plugin lifecycle)
```

### Pontos de Integração para AG Dev
| Ponto | Como Usar |
|-------|-----------|
| **Plugin System** | AG Dev deve ser um Clawdbot Plugin (`clawdbot.plugin.json`) |
| **Gateway RPC** | WebSocket em `ws://127.0.0.1:18789` para controlar agentes |
| **Sessions** | Cada agente AIOS pode ser uma session isolada via `sessions_spawn` |
| **Agent Tools** | Registrar ferramentas custom para os agentes via plugin |
| **Hooks** | `before_agent_start`, `agent_end`, `before_tool_call` para monitorar |
| **Multi-Agent** | Cada agente AIOS = um agente Clawdbot isolado (workspace próprio) |
| **Streaming** | SSE lifecycle events (`tool`, `assistant`, `lifecycle`) para UI |

### Lacunas no OpenClaw (e como AG Dev resolve)
| Lacuna | Solução AG Dev |
|--------|---------------|
| Sem UI visual para agentes | Cockpit + Agent Focus views |
| Sessions são text-only | Visualização de progresso, sparklines, kanban |
| Multi-agent sem orquestração visual | Emergence Map + Squad system |
| Hooks sem dashboard | Consent Bar + Audit Trail |
| Sem timeline/histórico visual | Time Scrubber |
| Plugin system poderoso mas sem wizard | AG Dev como plugin wizard |

---

## 1. Council Review — O Que Falta

### 1.1 Bret Victor: "Onde está a manipulação direta?"

> "A UI mostra informação, mas não permite AGIR diretamente sobre ela."

**Gaps identificados:**
- ❌ Não dá pra arrastar um agente sobre uma task pra atribuir
- ❌ Não dá pra editar o prompt/direcionamento inline
- ❌ Não dá pra ver/editar o código em tempo real (Monaco está instalado mas não integrado)

**Ações:**
- [ ] **Inline prompt editor**: click na task → editar o prompt que guia o agente
- [ ] **Direct manipulation canvas**: arrastar agentes, conectar com linhas
- [ ] **Live code editor**: Monaco integrado na Agent Focus view

### 1.2 Edward Tufte: "Mais dados por pixel"

> "Os agent cards são bonitos, mas não densos o suficiente."

**Gaps identificados:**
- ❌ Sparklines são estáticas (dados fake quando não há histórico real)
- ❌ Sem métricas de tokens gastos por agente
- ❌ Sem comparação temporal (ontem vs hoje)

**Ações:**
- [ ] **Token counters per agent**: mostrar custo real
- [ ] **Throughput metrics**: linhas de código/hora, tasks/hora
- [ ] **Comparative sparklines**: hoje vs média histórica

### 1.3 Don Norman: "Precisa de mais feedback loops"

> "O usuário não sabe quando algo deu errado até olhar o card."

**Gaps identificados:**
- ❌ Sem notificações sonoras/visuais quando agente completa ou falha
- ❌ Sem confirmação visual de ações (pause/resume)
- ❌ Error states pouco informativos

**Ações:**
- [ ] **Toast notifications**: agente completou, agente falhou, ação pendente
- [ ] **Sound cues**: som sutil em completion/error (opcional)
- [ ] **Error as conversation**: erro mostra o que tentou e sugere fix

### 1.4 Level 6 Thinker: "Onde está o controle REAL?"

> "Dashboard é observação. Comando é intervenção. AG Dev precisa ser comando."

**Gaps CRÍTICOS identificados:**
- ❌ **Sem terminal/sessão do agente**: não dá pra ver o que o agente está executando
- ❌ **Sem edição de prompts em runtime**: não dá pra redirecionar um agente
- ❌ **Sem Gantt dinâmico**: não dá pra planejar e ajustar cronograma
- ❌ **Sem Mermaid diagrams**: não dá pra ver fluxos e arquitetura visualmente

---

## 2. Novas Views Propostas

### View 6: Terminal View (Sessão do Agente)

**Conceito**: Abrir uma "janela" para dentro do agente. Ver exatamente o que ele está executando, os comandos, os tool calls, os resultados. Como SSH para dentro da mente do agente.

```
┌────────────────────────────────────────────────────┐
│ Terminal — Developer (Dex) 🔵 active        ─ □ ✕  │
├────────────────────────────────────────────────────┤
│                                                      │
│  [13:45:02] 🔧 exec: npm install @prisma/client     │
│  [13:45:05] ✅ added 2 packages in 3.2s              │
│  [13:45:06] 🔧 exec: npx prisma generate            │
│  [13:45:08] ✅ Generated Prisma Client               │
│  [13:45:09] 💭 "Schema ready. Now implementing the   │
│              auth service based on the PRD spec..."   │
│  [13:45:10] 📝 write: src/auth/auth.service.ts       │
│  [13:45:12] ┌─ src/auth/auth.service.ts ────────┐   │
│             │ export class AuthService {          │   │
│             │   constructor(private prisma: ...) { │   │
│             │   async login(email: string, ...)   │   │
│             │ ...                                 │   │
│             └────────────────────────────────────┘   │
│  [13:45:15] 🔧 exec: npx jest auth.spec.ts          │
│  [13:45:20] ✅ Tests: 4 passed, 0 failed             │
│                                                      │
│  ▌ (streaming...)                                    │
│                                                      │
├────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐    │
│ │ Intervene: redirect, pause, or send command  │    │
│ └──────────────────────────────────────────────┘    │
│ [Pause] [Kill] [Redirect] [Inject Command]          │
└────────────────────────────────────────────────────┘
```

**Integração OpenClaw:**
- Conecta ao stream de lifecycle events do agente via Gateway RPC
- Mostra `tool` events (exec, write, read) em tempo real
- Mostra `assistant` deltas (thinking stream)
- **Inject Command**: envia mensagem para a session do agente via `sessions_send`
- **Redirect**: atualiza o prompt/task e envia novo direcionamento

### View 7: Gantt Dinâmico (Cronograma Vivo)

**Conceito**: Timeline visual de todas as tasks, com barras por agente. O usuário pode arrastar barras para repriorizar, editar prompts inline, e ver o cronograma se ajustar em tempo real conforme agentes progridem.

```
┌────────────────────────────────────────────────────────────────┐
│ Gantt — Phantom ID                              Week 1  Week 2 │
├──────────────┬─────────────────────────────────────────────────┤
│              │ Mon  Tue  Wed  Thu  Fri  Mon  Tue  Wed  Thu     │
│              │                                                  │
│ 🔍 Analyst   │ ████████░░                                      │
│   Brief      │ ✅ done                                          │
│              │                                                  │
│ 📋 PM        │      ░░░░████████░░                             │
│   PRD        │         ⏳ 40%     ← click to edit prompt       │
│              │                                                  │
│ 🎨 UX        │           ░░░░░░████████                        │
│   Spec       │                  waiting for PRD                │
│              │                                                  │
│ 🏛️ Architect │                ░░░░░░░░████████                 │
│   Design     │                       waiting                   │
│              │                                                  │
│ ✅ PO        │                              ░░░░████           │
│   Validate   │                              waiting            │
│              │                                                  │
│ ⚡ Dev       │                                    ░░░░░░░░████ │
│   Implement  │                                    blocked      │
│              │                                                  │
├──────────────┴─────────────────────────────────────────────────┤
│ ⚡ Critical Path: Brief → PRD → UX Spec → Architecture → Dev  │
│ 📊 ETA: 8 days │ Blocked: 3 agents │ Risk: PM taking too long │
└────────────────────────────────────────────────────────────────┘
```

**Interações:**
- **Drag bar**: repriorizar task, ajustar duração estimada
- **Click task**: abre panel lateral com prompt do agente (editável)
- **Double-click prompt**: editar inline o direcionamento do agente
- **Dependency arrows**: mostra cadeia de dependências entre agentes
- **Critical path**: highlighted automaticamente
- **Auto-adjust**: conforme agentes progridem, barras se movem (Nível 5-6)

### View 8: Mermaid Diagrams (Visão Arquitetural Dinâmica)

**Conceito**: Renderizar diagramas Mermaid que se atualizam automaticamente baseado no estado do projeto. Fluxos, arquitetura, ERD, sequence diagrams — tudo gerado dinamicamente.

```
┌────────────────────────────────────────────────────┐
│ Diagrams — Phantom ID            [Flow] [ERD] [Seq]│
├────────────────────────────────────────────────────┤
│                                                      │
│  ┌─── Auto-generated from codebase ───┐             │
│  │                                     │             │
│  │   flowchart TD                      │             │
│  │     A[User Request] --> B{Auth?}    │             │
│  │     B -->|Yes| C[Dashboard]         │             │
│  │     B -->|No| D[Login]              │             │
│  │     C --> E[API Gateway]            │             │
│  │     E --> F[(PostgreSQL)]           │             │
│  │     E --> G[Redis Cache]            │             │
│  │                                     │             │
│  │   [rendered as interactive SVG]     │             │
│  └─────────────────────────────────────┘             │
│                                                      │
│  LIVE UPDATES:                                       │
│  🟢 auth.service.ts → updated flow for JWT          │
│  🟢 prisma/schema.prisma → updated ERD              │
│  🔵 New endpoint: POST /api/v1/identity/resolve     │
│                                                      │
├────────────────────────────────────────────────────┤
│ Source: [Auto] [Edit Mermaid] [Export SVG/PNG]       │
└────────────────────────────────────────────────────┘
```

**Tipos de diagrama:**
- **Flow**: fluxo da aplicação (gerado do code + PRD)
- **ERD**: schema do banco (gerado do Prisma/migrations)
- **Sequence**: interações entre serviços
- **Architecture**: visão macro do sistema
- **Agent Flow**: como os agentes se conectam ao projeto

**Integração OpenClaw:**
- Hook `after_tool_call` detecta mudanças em schemas, routes, models
- Regenera diagrama automaticamente
- Editor Mermaid inline pra ajustes manuais

### View 9: Strategy Canvas (Controle de Direcionamento)

**Conceito**: O centro de controle Nível 6. Aqui o humano define a ESTRATÉGIA, não as tasks. Cada agente tem um "prompt de direcionamento" que pode ser editado em runtime.

```
┌────────────────────────────────────────────────────┐
│ Strategy Canvas — Phantom ID                        │
├────────────────────────────────────────────────────┤
│                                                      │
│  PROJECT VISION (editable)                           │
│  ┌──────────────────────────────────────────────┐   │
│  │ "Sistema de reconhecimento e atribuição de    │   │
│  │  identidade digital para influencer marketing"│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  AGENT DIRECTIVES                                    │
│                                                      │
│  🔍 Analyst — "Focus on competitor gaps, especially  │
│     ┌─ the identity resolution problem that         │
│     │  AppsFlyer/Branch don't solve for creators"   │
│     └─ [Edit] [History] [Reset]                     │
│                                                      │
│  📋 PM — "PRD must prioritize the WhatsApp BM       │
│     ┌─ integration as the core differentiator.      │
│     │  Revenue model: R$40-180K/mês tiers."         │
│     └─ [Edit] [History] [Reset]                     │
│                                                      │
│  ⚡ Dev — "Use FastAPI + PostgreSQL + pgvector.     │
│     ┌─ No over-engineering. Start with 3 API        │
│     │  endpoints: /resolve, /journey, /webhook"     │
│     └─ [Edit] [History] [Reset]                     │
│                                                      │
│  GUARDRAILS (apply to all agents)                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ • IA só no subjetivo. Sistema no objetivo.    │   │
│  │ • LGPD compliance obrigatório                 │   │
│  │ • Stack: Python/FastAPI (backend), React (FE) │   │
│  │ • First mover: Peter Jordan / Ei Nerd         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [Apply Changes] [Preview Impact] [Revert All]       │
└────────────────────────────────────────────────────┘
```

**Interações:**
- **Edit directive**: muda o prompt que guia aquele agente
- **History**: ver versões anteriores do prompt
- **Apply Changes**: envia novos prompts para agentes ativos via `sessions_send`
- **Preview Impact**: mostra quais tasks serão afetadas pela mudança
- **Guardrails**: regras globais que todos os agentes seguem

---

## 3. Arquitetura de Plugin OpenClaw

AG Dev deve ser distribuído como um **Clawdbot Plugin** para funcionar com qualquer projeto:

```
ag-dev/
├── clawdbot.plugin.json          # Plugin manifest
├── index.ts                       # Plugin entry point
├── gateway/
│   ├── rpc-methods.ts            # Custom RPC methods
│   ├── http-routes.ts            # HTTP API routes
│   └── event-bridge.ts           # Lifecycle event bridge → UI
├── agent/
│   ├── tools.ts                  # Custom agent tools
│   └── hooks.ts                  # Agent lifecycle hooks
├── ui/                           # React UI (built)
│   └── dist/
├── core/
│   ├── agents/                   # AIOS agent definitions
│   ├── tasks/                    # Task templates
│   └── workflows/                # Workflow definitions
└── scripts/
    ├── install.sh                # Project setup
    └── init-project.sh           # Initialize for new project
```

### Plugin Manifest
```json
{
  "id": "ag-dev",
  "name": "AG Dev — Multi-Agent Command Center",
  "version": "1.0.0",
  "description": "Iron Man suit for AI-powered software development",
  "entry": "./index.ts",
  "skills": ["./core"],
  "config": {
    "port": { "type": "number", "default": 3000 },
    "projectRoot": { "type": "string" },
    "enableMermaid": { "type": "boolean", "default": true },
    "enableGantt": { "type": "boolean", "default": true }
  }
}
```

### Gateway RPC Methods (exposed to UI)
```typescript
// Agent control
'ag-dev.agent.start'    // Start an agent on a task
'ag-dev.agent.pause'    // Pause agent
'ag-dev.agent.resume'   // Resume agent
'ag-dev.agent.redirect' // Change agent's directive
'ag-dev.agent.kill'     // Stop agent

// Session access
'ag-dev.agent.stream'   // Subscribe to agent's lifecycle stream
'ag-dev.agent.history'  // Get agent's session history
'ag-dev.agent.inject'   // Send message to agent's session

// Project
'ag-dev.project.init'   // Initialize AG Dev for a project
'ag-dev.project.state'  // Get full project state
'ag-dev.project.gantt'  // Get Gantt data
'ag-dev.project.diagrams' // Get auto-generated Mermaid diagrams
```

---

## 4. Implementação Priorizada

### Sprint 1: Terminal + Strategy (Controle Real)
- [ ] **Terminal View**: stream de tool calls via Gateway lifecycle events
- [ ] **Strategy Canvas**: editar prompts dos agentes em runtime
- [ ] **Inject Command**: enviar mensagem pra session do agente
- [ ] **Toast notifications**: feedback visual de ações

### Sprint 2: Gantt Dinâmico
- [ ] **Gantt view**: timeline com barras por agente
- [ ] **Drag to reorder**: repriorizar tasks
- [ ] **Inline prompt editor**: editar direcionamento na timeline
- [ ] **Critical path**: calcular e highlight

### Sprint 3: Mermaid + Diagrams
- [ ] **Mermaid renderer**: flowchart, ERD, sequence
- [ ] **Auto-generation**: detectar schemas, routes, models no código
- [ ] **Export**: SVG/PNG
- [ ] **Live updates**: hook `after_tool_call` regenera diagramas

### Sprint 4: Plugin Packaging
- [ ] **Plugin manifest**: `clawdbot.plugin.json`
- [ ] **Gateway RPC methods**: controle via WebSocket
- [ ] **Agent tools**: ferramentas custom registradas no agent loop
- [ ] **Install script**: `clawdbot plugins install ag-dev`
- [ ] **Project init**: `ag-dev init` → configura AIOS agents pro projeto

### Sprint 5: Greenfield + Brownfield
- [ ] **New project wizard**: cria projeto do zero com AIOS agents
- [ ] **Existing project scanner**: analisa codebase e configura agents
- [ ] **Template system**: templates de agent directives por tipo de projeto
- [ ] **Multi-project**: trocar entre projetos no dashboard

---

## 5. O Que Faz Isso Funcionar com QUALQUER Projeto

A chave é que AG Dev não é hardcoded para um projeto. Ele é um **traje** que se adapta:

1. **Init**: usuário aponta pra um diretório → AG Dev escaneia e configura
2. **Agents**: definições genéricas que se especializam pelo prompt (directives)
3. **Workflows**: greenfield (do zero) vs brownfield (existente) já definidos no AIOS
4. **Plugin**: funciona com qualquer instância do Clawdbot/OpenClaw
5. **Templates**: pré-sets de directives por tipo de projeto (API, SaaS, mobile, etc)

---

*Documento v2.0 — Council Review + OpenClaw Integration*
*2026-02-01*

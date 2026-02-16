# 🔬 AG Dev v2.1 — Raio-X Completo do Sistema

> Dissecação total de cada componente, como se conectam, como o sistema inicia, e como tudo funciona junto.
> Inclui diagramas Mermaid ilustrativos no final.

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AG Dev v2.1                                │
│              Multi-Agent Development Orchestration Platform          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌───────────┐    ┌────────────────────────┐        │
│  │  UI      │◄──►│  Express  │◄──►│  Módulos Ativos         │        │
│  │  React   │ SSE│  Server   │    │                        │        │
│  │  + Zustand│   │  :3456    │    │  ★ Orchestrator (841L) │        │
│  └──────────┘    │           │    │  ★ TerminalManager     │        │
│                  │  56 APIs  │    │    SquadManager         │        │
│                  │  + SSE    │    │    RalphLoop            │        │
│                  │  + Health │    │    AgentGraph           │        │
│                  └─────┬─────┘    │    MemorySystem         │        │
│                        │          │    StateManager         │        │
│                        │          │    SuperSkillRegistry   │        │
│                        │          │    RuntimeLayer ✅ NEW  │        │
│                        │          └────────────────────────┘        │
│                        │                                             │
│                        ▼          ┌────────────────────────┐        │
│                  ┌───────────┐    │  Core Assets            │        │
│                  │ Claude    │    │  • 14 Agent Personas    │        │
│                  │ Code CLI  │    │  • 10 Workflows YAML   │        │
│                  │ (via PTY) │    │  •  5 Squad Configs     │        │
│                  └───────────┘    │  • 31 SuperSkills       │        │
│                        │          │  • Template Engine      │        │
│                  ┌─────▼─────┐    └────────────────────────┘        │
│                  │ Clawdbot  │                                        │
│                  │ Gateway   │    ★ = Componentes centrais            │
│                  │ (ws:18789)│    Runtime Layer agora integrado       │
│                  └───────────┘    com fallback standalone             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Em uma frase:** AG Dev orquestra múltiplos agentes de IA (cada um com persona especializada completa) para construir software de forma autônoma, usando workflows YAML, squads, terminais PTY reais, grafo temporal, e memória em 3 camadas.

---

## 🚀 Sequência de Inicialização

Quando você roda `node server/server.js`:

### Passo 1: Config
```
config.json → merge com env vars (AG_DEV_PORT, AG_DEV_HOST, AG_DEV_DATA_DIR)
```

### Passo 2: Módulos (ordem exata no server.js)
```
 1. TerminalManager(config.terminals)     → PTY manager (máx 16 terminais)
 2. StateManager()                         → Estado in-memory
 3. Orchestrator(terminal, state, config)  → Cérebro: agents + workflows
 4. SquadManager(orchestrator)             → Times de agents
 5. RalphLoop(terminal, options)           → Dev autônomo
 6. SuperSkillRegistry(superskillsDir)     → 31 ferramentas plugáveis
 7. AgentGraph(dataDir)                    → Grafo temporal (auto-save 30s)
 8. RuntimeLayer(config, callbacks)        → Clawdbot Gateway + fallback ✅ NEW
 9. MemorySystem(baseDir)                  → Memória hot/warm/cold
```

### Passo 3: Carregamento de Assets (automático)
- **14 Agent Definitions** de `core/agents/*.md` (parsing completo: role + expertise + behavior)
- **10 Workflows** de `core/workflows/*.yaml`
- **5 Squad Configs** de `core/squads/*.json`
- **31 SuperSkills** de `superskills/*/manifest.json`

### Passo 4: Server Express
- 56 endpoints API
- SSE para push real-time
- Health check `/health`
- Serve `ui-dist/` estático

### Output no Console:
```
  ℹ Runtime: clawdbot → ws://127.0.0.1:18789
  ✅ Runtime connected successfully
Loaded 5 squad definitions
Loaded 10 workflows
Loaded 14 agent definitions
  30 SuperSkills loaded across 6 categories
🚀 AG Dev server running on http://0.0.0.0:3456
```

---

## 🧩 Módulos — Dissecação Completa

### 1. `server.js` (1.326 linhas) — O Hub Central

**O que faz:** Express server que conecta TODOS os módulos e expõe 56 endpoints REST + SSE.

**Módulos importados e usados:**
```
server.js ──uses──► TerminalManager   (spawn/kill/write PTY terminals)
           ──uses──► StateManager      (read/update estado global)
           ──uses──► Orchestrator      (list agents, execute workflows, spawn agents)
           ──uses──► SquadManager      (CRUD squads, activate)
           ──uses──► RalphLoop         (load PRD, start/pause/resume dev autônomo)
           ──uses──► SuperSkillRegistry(list/search/run 31 superskills)
           ──uses──► AgentGraph        (temporal queries, event tracking)
           ──uses──► RuntimeLayer      (status, gateway connection) ✅ NEW
           ──uses──► MemorySystem      (read/write agent memory)
```

---

### 2. `orchestrator.js` (841 linhas) — O Cérebro ★

**O que faz:** Módulo mais importante. Carrega personas, monta prompts completos, spawna agents, executa workflows.

**Parsing de Personas (v2.1 — completo):**
```markdown
# Agent: Dex (Developer)       → agentName: "Dex", agentId: "Developer"
## Role                         → role: "Expert Senior Software Engineer..."
## Expertise                    → expertise: ["Full-stack development", ...]
## Behavior                     → behavior: ["Execute tasks sequentially", ...]
## Current Directive            → directive: "{{directive}}"
```

**Montagem do Prompt (v2.1 — com expertise + behavior):**
```
You are Dex, Expert Senior Software Engineer & Full-Stack Implementation Specialist.

Expertise:
- Full-stack development (frontend + backend)
- Code implementation from requirements/stories
- Testing (unit, integration, e2e)
- ...

Behavioral rules:
- Execute tasks sequentially with precision and focus
- Write tests alongside implementation
- Use conventional commits for all changes
- ...

Your current task: Implement login page with email/password

Begin working on the task now.
```

**Execução de Workflows:**
```
orchestrator.executeWorkflow(name, task)
  → Carrega workflow YAML
  → Cria execution com steps, timing, events
  → Loop: verifica deps → contextualiza task → spawna agent → monitora (30s timeout)
  → SSE broadcast → UI atualiza
```

---

### 3. `terminal-manager.js` (356 linhas) — O Executor

**O que faz:** Spawna processos PTY reais via `node-pty`. Cada agent roda num terminal.

**Spawning de Agent IA:**
```javascript
spawnClaudeAgent(prompt) {
  spawn('claude', ['--print', '--dangerously-skip-permissions', '-p', prompt])
  // → PTY real rodando Claude Code CLI
}
```

**Limites:** Máx 16 terminais, buffer circular de 10.000 linhas, 120×40 cols/rows default.

---

### 4. `squad-manager.js` (363 linhas) — Formador de Times

**5 Squads pré-configuradas:**

| Squad | Agents | Workflow |
|-------|--------|---------|
| 🏗️ Full Stack Dev | analyst, architect, dev, qa | greenfield-fullstack |
| 🔧 Backend API | analyst, architect, dev | greenfield-service |
| 🎨 Frontend UI | ux-design-expert, dev, qa | greenfield-ui |
| 🚀 DevOps Infra | devops, architect | auto-worktree |
| ✍️ Content Marketing | content-writer, seo-analyst | spec-pipeline |

---

### 5. `workflow-engine.js` (591 linhas) — Motor Avançado

**Status:** Existe como módulo completo mas execução de workflows é feita pelo Orchestrator internamente. WorkflowEngine suporta features avançadas (step-based + phase-based + loops) e está preparado para substituir a implementação do Orchestrator quando integrado.

**Dois formatos:**
- **Phase-based** (greenfield-*, brownfield-*): fases sequenciais com agents
- **Step-based** (qa-loop): steps com on_success/on_failure e loops

---

### 6. `ralph-loop.js` (389 linhas) — Piloto Automático

**O que faz:** Recebe um PRD e implementa automaticamente, story por story.

**Fluxo:**
```
1. Recebe PRD JSON (user stories com prioridade)
2. Para cada story:
   → _spawnAgent(prompt) → PTY com Claude Code CLI
   → _waitForCompletion() → espera exit ou "TASK_COMPLETE" (timeout 5min)
   → Se passou → próxima story
   → Se falhou → registra learning, retry
3. Máx 20 iterações
4. Learnings acumulados entre tentativas
```

---

### 7. `agent-graph.js` (629 linhas) + `temporal-graph.js` (533 linhas) — Observação Temporal

**O que rastreia:**
- Spawn/Stop de agents → nodes com timestamps
- Tasks atribuídas → edges from→to
- Colaboração → edges bidirecionais
- Arquivos tocados → edges com metadata

**Queries:**
- `getTimeline(t0, t1)` → tudo num período
- `getHeatmapData()` → atividade por agent
- `getCollaborationNetwork()` → quem trabalhou com quem
- `getSystemPulse()` → métricas último minuto/hora/dia
- `getFileHistory(path)` → quem tocou qual arquivo

**Auto-save:** JSON a cada 30 segundos.

---

### 8. `memory-system.js` (146 linhas) — Memória 3 Camadas

| Camada | Propósito | Storage | Lifetime |
|--------|-----------|---------|----------|
| 🔴 Hot | Working memory | JSON | Sessão |
| 🟡 Warm | Episodic memory | JSONL append | Dias/semanas |
| 🔵 Cold | Archive | JSONL datado | Permanente |

**Memory Folding:** Comprime warm quando fica grande — mantém essência, descarta ruído.

---

### 9. `state.js` (254 linhas) — Estado Central

```javascript
this.agents = Map<id, AgentState>    // estado de cada agent
this.workflows = Map<id, WFState>    // estado de cada workflow
this.system = { status, startTime, activeAgents, totalAgents, version }
this.events = []                      // log circular (max 1000)
```

---

### 10. Runtime Layer (4 arquivos, 631 linhas) ✅ INTEGRADO v2.1

**`runtime-factory.js`** → Cria o runtime correto:
```
Se gateway configurado → ClawdbotRuntime (ws-bridge → Gateway)
Se falhar → ResilientRuntime degrada para StandaloneRuntime
Sem gateway → StandaloneRuntime direto
```

**`clawdbot-runtime.js`** → Wraps ws-bridge na interface AgentRuntime
**`standalone-runtime.js`** → Simula agents in-memory (modo demo)
**`ws-bridge.js`** → WebSocket para Clawdbot Gateway (spawn, send, history, subscribe)

**Integração no server.js (v2.1):**
```javascript
const { createRuntime } = require('./runtimes/runtime-factory');
const runtime = createRuntime(config, {
  onEvent: (e) => broadcast('runtime_event', e),
  onAgentReply: (key, reply) => broadcast('agent_reply', { key, reply }),
  onLifecycleEvent: (e) => broadcast('lifecycle_event', e)
});
runtime.connect(); // → "✅ Runtime connected successfully"
```

---

## ⚡ SuperSkills — 31 Ferramentas

### Registry & Runner
- **registry.js** (475L): Auto-descoberta, validação, execução via stdin ✅ FIXED v2.1
- **runner.js** (526L): CLI para execução direta

### Por Categoria

**🔍 Analyzers (6):** code-complexity, csv-summarizer, dep-graph, git-stats, security-scan, temporal-analysis

**🏗️ Builders (6):** docx-builder, file-organize, image-enhance, pdf-builder, static-site, xlsx-builder

**🔌 Connectors (4):** postgres-query, reddit-fetch, video-download, webhook-fire

**⚙️ Generators (6):** api-scaffold, changelog-gen, dockerfile-gen, domain-brainstorm, readme-gen, schema-to-types

**🔄 Transformers (7):** article-extractor, csv-to-json, html-to-md, invoice-parser, json-to-form, md-to-slides, text-upper

**✅ Validators (2):** lint-fix, webapp-test

---

## 🎭 Os 14 Agents

| Agent File | Persona | Role |
|------------|---------|------|
| `aios-master` | **Orion** | Master Orchestrator — executa qualquer coisa |
| `analyst` | — | Business/Systems Analyst |
| `architect` | — | Solution Architect |
| `content-writer` | — | Content Writer |
| `data-engineer` | — | Data Engineer |
| `dev` | **Dex** | Senior Full-Stack Developer |
| `devops` | — | DevOps Engineer |
| `pm` | — | Project Manager |
| `po` | — | Product Owner |
| `qa` | **Quinn** | QA Architect & Test Strategist |
| `seo-analyst` | — | SEO Analyst |
| `sm` | — | Scrum Master |
| `squad-creator` | — | Squad Creator |
| `ux-design-expert` | — | UX Designer |

---

## 🔄 Os 10 Workflows

| Workflow | Tipo | Agents Envolvidos |
|----------|------|------------------|
| `greenfield-fullstack` | Greenfield | devops → analyst → architect → dev → qa |
| `greenfield-service` | Greenfield | devops → analyst → architect → dev |
| `greenfield-ui` | Greenfield | devops → ux → dev → qa |
| `brownfield-discovery` | Brownfield | analyst → architect |
| `brownfield-fullstack` | Brownfield | analyst → architect → dev → qa |
| `brownfield-service` | Brownfield | analyst → dev |
| `brownfield-ui` | Brownfield | ux → dev |
| `qa-loop` | Loop | qa ↔ dev (review → fix → re-review, max 5x) |
| `auto-worktree` | Utility | devops (git worktree isolado) |
| `spec-pipeline` | Pipeline | analyst → content-writer |

---

## 🌐 API — 56 Endpoints

### Core (4)
`GET /health` · `GET /api/events` (SSE) · `GET /api/state` · `GET /api/metrics`

### Terminals (6)
`GET /api/terminals` · `POST /api/terminals` · `POST /:id/write` · `POST /:id/resize` · `DELETE /:id` · `GET /:id/buffer`

### Agents (1)
`GET /api/agents`

### Workflows (6)
`GET /api/workflows` · `GET /active` · `POST /active/stop` · `POST /:name/start` · `POST /:name/execute` · `POST /:id/stop`

### Squads (6)
`GET /api/squads` · `GET /active` · `POST /api/squads` · `POST /:id/activate` · `DELETE /:id` · `GET /:id`

### Ralph Loop (6)
`POST /api/ralph/prd` · `POST /start` · `POST /pause` · `POST /resume` · `POST /stop` · `GET /state`

### System (2)
`POST /api/system/pause-all` · `POST /resume-all`

### Chat (1)
`POST /api/chat`

### Project Context (4)
`GET /api/context` · `GET /:filename` · `PUT /:filename` · `POST /api/context`

### Temporal Graph (9)
`GET /api/graph/agents` · `/timeline` · `/heatmap` · `/network` · `/pulse` · `/agent/:id` · `/files` · `/stats` · `POST /events`

### SuperSkills (5)
`GET /api/superskills` · `/search` · `/stats` · `/:name` · `POST /:name/run`

### Runtime (1) ✅ NEW
`GET /api/runtime/status`

### Memory (4)
`GET /api/memory/stats` · `/agent/:agentId` · `POST /record` · `POST /fold/:agentId`

### Static (1)
`GET /` (UI)

---

## 🖥️ UI — Dashboard React

### Stack
React 18 + TypeScript + Zustand + Tailwind CSS + Lucide icons + SSE

### Componentes
| Componente | Função |
|------------|--------|
| `App.tsx` | Layout, navegação, grid de terminais |
| `TerminalPane.tsx` | Renderiza PTY output em real-time |
| `NewAgentDialog.tsx` | Spawna novo agent |
| `SquadSelector.tsx` | Seleciona squad |
| `WorkflowView.tsx` | Progresso do workflow |
| `RalphView.tsx` | Interface Ralph Loop |
| `ProjectContext.tsx` | Contexto do projeto |
| `OrchestratorChat.tsx` | Chat com orquestrador |
| `SuperSkillsView.tsx` | Catálogo de SuperSkills |

---

## 📊 Métricas v2.1

```
Código server:          7.389 linhas (17 arquivos JS)
Código UI:              ~2.600 linhas (React/TypeScript)
SuperSkills:            ~3.000 linhas (31 skills + registry + runner)
Agent personas:         14 (Markdown com parsing completo)
Workflows:              10 (YAML)
Squads:                 5 (JSON)
API endpoints:          56
Template types:         8 (PRD, ADR, story, epic, task, etc.)
Total:                  ~15.000+ linhas
```

---

## 🔮 Status das Inovações

| Inovação | Status | Descrição |
|----------|--------|-----------|
| Temporal Graph | ✅ Ativo | Grafo com dimensão temporal, queries por intervalo, auto-save |
| Memory Folding | ✅ Ativo | 3 camadas (hot/warm/cold) com compressão |
| Runtime Layer | ✅ Integrado v2.1 | Gateway + fallback standalone + ResilientRuntime |
| Ralph Loop | ✅ Ativo | Dev autônomo com learnings acumulativos |
| Agent Personas | ✅ Completo v2.1 | Expertise + behavior injetados no prompt |
| SuperSkills API | ✅ Fixed v2.1 | Stdin limpo, sem args CLI indevidos |

---

# 🎨 Diagramas Visuais (Mermaid)

## Diagrama 1: Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph UI["🖥️ UI React + Zustand"]
        App["App.tsx"]
        Terminal["TerminalPane"]
        Workflow["WorkflowView"]
        Ralph["RalphView"]
        Skills["SuperSkillsView"]
        Chat["OrchestratorChat"]
    end

    subgraph Server["⚙️ Express Server :3456"]
        SRV["server.js<br/>56 endpoints + SSE"]
    end

    subgraph Core["🧠 Módulos Core"]
        ORC["Orchestrator<br/>★ Cérebro"]
        TM["TerminalManager<br/>PTY Spawner"]
        SM["SquadManager<br/>Times de Agents"]
        RL["RalphLoop<br/>Piloto Automático"]
        AG["AgentGraph<br/>Grafo Temporal"]
        MEM["MemorySystem<br/>Hot/Warm/Cold"]
        ST["StateManager<br/>Estado Central"]
        SS["SuperSkillRegistry<br/>31 Ferramentas"]
        RT["RuntimeLayer<br/>Gateway + Fallback"]
    end

    subgraph Assets["📦 Core Assets"]
        AGENTS["14 Agent Personas<br/>.md com expertise+behavior"]
        WF["10 Workflows<br/>YAML phase/step"]
        SQ["5 Squads<br/>JSON configs"]
        SK["31 SuperSkills<br/>manifest+run.js"]
    end

    subgraph Execution["🚀 Execução"]
        CLI["Claude Code CLI<br/>claude --print -p"]
        PTY["node-pty<br/>Terminal Real"]
        GW["Clawdbot Gateway<br/>ws://127.0.0.1:18789"]
    end

    UI -->|"fetch + SSE"| Server
    SRV --> ORC
    SRV --> TM
    SRV --> SM
    SRV --> RL
    SRV --> AG
    SRV --> MEM
    SRV --> ST
    SRV --> SS
    SRV --> RT

    ORC -->|"carrega"| AGENTS
    ORC -->|"carrega"| WF
    SM -->|"carrega"| SQ
    SS -->|"escaneia"| SK

    ORC -->|"spawnAgent()"| TM
    RL -->|"_spawnAgent()"| TM
    TM -->|"spawn PTY"| PTY
    PTY -->|"executa"| CLI
    RT -->|"conecta"| GW

    style ORC fill:#ff6b6b,stroke:#333,color:#fff
    style TM fill:#4ecdc4,stroke:#333,color:#fff
    style RT fill:#45b7d1,stroke:#333,color:#fff
    style CLI fill:#96ceb4,stroke:#333,color:#fff
```

---

## Diagrama 2: Fluxo de Inicialização (Boot Sequence)

```mermaid
sequenceDiagram
    participant S as server.js
    participant C as config.json
    participant TM as TerminalManager
    participant ST as StateManager
    participant O as Orchestrator
    participant SM as SquadManager
    participant RL as RalphLoop
    participant SS as SuperSkillRegistry
    participant AG as AgentGraph
    participant RT as RuntimeLayer
    participant MM as MemorySystem

    S->>C: Lê config + env vars
    S->>TM: new TerminalManager(config)
    S->>ST: new StateManager()
    S->>O: new Orchestrator(TM, ST, config)
    Note over O: Carrega 14 agents (.md)<br/>Carrega 10 workflows (.yaml)
    S->>SM: new SquadManager(O)
    Note over SM: Carrega 5 squads (.json)
    S->>RL: new RalphLoop(TM, options)
    S->>SS: new SuperSkillRegistry(dir)
    Note over SS: Escaneia 31 SuperSkills
    S->>AG: new AgentGraph(dataDir)
    Note over AG: Auto-save a cada 30s
    S->>RT: createRuntime(config, callbacks)
    RT-->>S: Runtime conectado ✅
    S->>MM: new MemorySystem(baseDir)
    Note over S: Express: 56 endpoints + SSE<br/>🚀 Listening on :3456
```

---

## Diagrama 3: Como um Agent é Spawnado

```mermaid
sequenceDiagram
    participant U as Usuário/UI
    participant S as server.js
    participant O as Orchestrator
    participant TM as TerminalManager
    participant PTY as node-pty
    participant CLI as Claude Code CLI
    participant AG as AgentGraph
    participant ST as StateManager
    participant SSE as SSE Clients

    U->>S: POST /api/terminals {type:"agent", name:"dev", task:"..."}
    S->>O: spawnAgent("dev", task)
    O->>O: getAgentDefinition("dev")
    Note over O: Persona: Dex<br/>Role: Senior Developer<br/>10 expertise items<br/>10 behavior rules
    O->>O: createAgentPrompt(definition, task)
    Note over O: "You are Dex, Expert Senior...<br/>Expertise: - Full-stack...<br/>Behavioral rules: - Execute...<br/>Your current task: {task}"
    O->>TM: spawnClaudeAgent(prompt)
    TM->>PTY: spawn('claude', ['--print', '-p', prompt])
    PTY->>CLI: Executa Claude Code
    CLI-->>PTY: Output em streaming
    PTY-->>TM: onData events
    TM-->>S: terminal_spawn event
    S->>AG: agentSpawned("dev", metadata)
    S->>ST: updateAgent(id, state)
    S->>SSE: broadcast('terminal_spawn')
    SSE-->>U: UI atualiza com novo terminal
    
    loop Output contínuo
        CLI-->>PTY: Output
        PTY-->>TM: Buffer + emit
        TM-->>SSE: broadcast data
        SSE-->>U: Terminal renderiza em real-time
    end
```

---

## Diagrama 4: Execução de Workflow Completo

```mermaid
flowchart TD
    START([🎬 Usuário inicia workflow]) --> SELECT{Seleciona tipo}
    
    SELECT -->|Greenfield| GF["greenfield-fullstack"]
    SELECT -->|Brownfield| BF["brownfield-fullstack"]
    SELECT -->|QA Loop| QA["qa-loop"]
    SELECT -->|Ralph| RA["Ralph Loop"]
    
    GF --> P0["📦 Fase 0: Bootstrap<br/>Agent: DevOps<br/>→ Cria repo, instala deps"]
    P0 --> P1["📋 Fase 1: Discovery<br/>Agent: Analyst<br/>→ Requisitos + PRD"]
    P1 --> P1B["🏗️ Fase 1: Architecture<br/>Agent: Architect<br/>→ Design de sistema"]
    P1B --> P2["📄 Fase 2: Sharding<br/>→ Divide em tasks"]
    P2 --> P3["💻 Fase 3: Development<br/>Agent: Dev (Dex)<br/>→ Implementa código"]
    P3 --> P3B["✅ Fase 3: QA<br/>Agent: QA (Quinn)<br/>→ Testa + revisa"]
    P3B --> DONE([🎉 Projeto completo])
    
    QA --> QR["🔍 Review<br/>Agent: QA"]
    QR --> QF["🔧 Fix<br/>Agent: Dev"]
    QF --> QRR["🔍 Re-review<br/>Agent: QA"]
    QRR -->|Issues| QF
    QRR -->|OK| DONE
    QRR -->|Max 5x| ESC["⚠️ Escalar para humano"]
    
    RA --> RA1["📝 Recebe PRD"]
    RA1 --> RA2["🔄 Para cada story:"]
    RA2 --> RA3["Spawna Claude CLI"]
    RA3 --> RA4{Passou?}
    RA4 -->|Sim| RA5["✅ Próxima story"]
    RA4 -->|Não| RA6["📝 Learning + retry"]
    RA6 --> RA3
    RA5 --> RA4B{Mais stories?}
    RA4B -->|Sim| RA2
    RA4B -->|Não| DONE

    style P0 fill:#45b7d1,color:#fff
    style P1 fill:#96ceb4,color:#fff
    style P1B fill:#ffeaa7,color:#333
    style P3 fill:#ff6b6b,color:#fff
    style P3B fill:#a29bfe,color:#fff
    style DONE fill:#00b894,color:#fff
```

---

## Diagrama 5: Sistema de Squads e Agents

```mermaid
graph LR
    subgraph FS["🏗️ Full Stack Dev"]
        FS_AN["Analyst"]
        FS_AR["Architect"]
        FS_DEV["Dex (Dev)"]
        FS_QA["Quinn (QA)"]
    end

    subgraph BE["🔧 Backend API"]
        BE_AN["Analyst"]
        BE_AR["Architect"]
        BE_DEV["Dev"]
    end

    subgraph FE["🎨 Frontend UI"]
        FE_UX["UX Designer"]
        FE_DEV["Dev"]
        FE_QA["QA"]
    end

    subgraph DO["🚀 DevOps Infra"]
        DO_DEV["DevOps"]
        DO_AR["Architect"]
    end

    subgraph CM["✍️ Content Marketing"]
        CM_CW["Content Writer"]
        CM_SEO["SEO Analyst"]
    end

    subgraph SOLO["🎯 Agentes Solo"]
        ORION["Orion<br/>(AIOS Master)"]
        PM["Project Manager"]
        PO["Product Owner"]
        SM_A["Scrum Master"]
        DE["Data Engineer"]
        SC["Squad Creator"]
    end

    FS -->|greenfield-fullstack| WF1["Workflow"]
    BE -->|greenfield-service| WF2["Workflow"]
    FE -->|greenfield-ui| WF3["Workflow"]
    DO -->|auto-worktree| WF4["Workflow"]
    CM -->|spec-pipeline| WF5["Workflow"]

    style ORION fill:#ff6b6b,color:#fff
    style FS fill:#e8f5e9,stroke:#4caf50
    style BE fill:#e3f2fd,stroke:#2196f3
    style FE fill:#fff3e0,stroke:#ff9800
    style DO fill:#f3e5f5,stroke:#9c27b0
    style CM fill:#fce4ec,stroke:#e91e63
```

---

## Diagrama 6: Grafo Temporal — Como Interações São Rastreadas

```mermaid
graph TD
    subgraph T0["⏱️ t=0s — Boot"]
        N1["🟢 DevOps<br/>spawned"]
    end

    subgraph T30["⏱️ t=30s — Bootstrap completo"]
        N1 -->|"task_assignment<br/>t=0→30"| N2["🟢 Analyst<br/>spawned"]
        N1 -.->|"deactivated<br/>t=30"| N1X["🔴 DevOps<br/>stopped"]
    end

    subgraph T120["⏱️ t=120s — Planning completo"]
        N2 -->|"task_assignment<br/>t=30→120"| N3["🟢 Architect<br/>spawned"]
        N2 -->|"file_shared<br/>requirements.md"| N3
    end

    subgraph T300["⏱️ t=300s — Development"]
        N3 -->|"task_assignment<br/>t=120→300"| N4["🟢 Dev (Dex)<br/>spawned"]
        N3 -->|"file_shared<br/>architecture.md"| N4
    end

    subgraph T600["⏱️ t=600s — QA"]
        N4 -->|"collaboration<br/>t=300→600"| N5["🟢 QA (Quinn)<br/>spawned"]
        N4 -->|"file_shared<br/>src/**"| N5
    end

    subgraph Queries["🔍 Temporal Queries"]
        Q1["getTimeline(0, 600)<br/>→ Toda a história"]
        Q2["getActiveEdgesAt(150)<br/>→ Analyst→Architect ativo"]
        Q3["getHeatmap()<br/>→ Dev mais ativo"]
        Q4["getCollaborationNetwork()<br/>→ Grafo de quem trabalhou com quem"]
    end

    style T0 fill:#e3f2fd
    style T30 fill:#e8f5e9
    style T120 fill:#fff3e0
    style T300 fill:#fce4ec
    style T600 fill:#f3e5f5
    style Queries fill:#fffde7,stroke:#f9a825
```

---

## Diagrama 7: Memória — 3 Camadas

```mermaid
flowchart LR
    subgraph HOT["🔴 HOT — Sessão Atual"]
        H1["setHot('context', data)"]
        H2["getHot('context')"]
        H3["clearHot()"]
    end

    subgraph WARM["🟡 WARM — Aprendizados Recentes"]
        W1["appendWarm('dev', entry)"]
        W2["getWarm('dev', limit=50)"]
        W3["JSONL append-only"]
    end

    subgraph COLD["🔵 COLD — Arquivo Histórico"]
        C1["archive('dev')"]
        C2["dev-2026-02-02.jsonl"]
        C3["Permanente"]
    end

    subgraph FOLD["🔄 Memory Folding"]
        F1["Comprime warm"]
        F2["Mantém essência"]
        F3["Descarta ruído"]
    end

    HOT -->|"session end"| WARM
    WARM -->|"periodicamente"| COLD
    WARM -->|"quando grande"| FOLD
    FOLD -->|"resumido"| WARM

    style HOT fill:#ff6b6b,color:#fff
    style WARM fill:#ffeaa7,color:#333
    style COLD fill:#74b9ff,color:#fff
    style FOLD fill:#a29bfe,color:#fff
```

---

## Diagrama 8: SuperSkills — Fluxo de Execução

```mermaid
sequenceDiagram
    participant U as Usuário/Agent
    participant API as POST /api/superskills/:name/run
    participant REG as SuperSkillRegistry
    participant SK as SuperSkill (run.js)

    U->>API: { input: { text: "Hello World" } }
    API->>REG: execute("text-upper", input)
    REG->>REG: Valida manifest
    REG->>REG: Resolve path: superskills/transformers/text-upper/
    REG->>SK: spawn('node', ['transform.js'])
    REG->>SK: stdin.write(JSON.stringify(input))
    REG->>SK: stdin.end()
    SK-->>REG: stdout: { result: "HELLO WORLD" }
    REG-->>API: { success: true, output: "HELLO WORLD" }
    API-->>U: 200 OK
    
    Note over REG,SK: v2.1 Fix: Sem args CLI extras<br/>Input sempre via stdin limpo
```

---

## Diagrama 9: Simulação — Criando um SaaS do Zero

```mermaid
timeline
    title 🚀 Criando "TodoApp SaaS" com AG Dev
    
    section Fase 0 — Bootstrap (0-30s)
        DevOps spawna : Verifica Node.js, Git, ferramentas
                      : Cria repo no GitHub
                      : Scaffolda estrutura do projeto
                      : Gera .gitignore, README.md
    
    section Fase 1 — Planning (30s-3min)
        Analyst analisa : Decompõe "TodoApp SaaS" em requisitos
                        : Gera PRD com 8 user stories
                        : Define acceptance criteria
        Architect projeta : Escolhe stack (Next.js + Supabase)
                          : Desenha schema do banco
                          : Define API endpoints
                          : Cria architecture.md
    
    section Fase 2 — Sharding (3-4min)
        Sistema divide : PRD → 8 tasks individuais
                       : Cada task = 1 context window
                       : Ordena por dependência
    
    section Fase 3 — Development (4-20min)
        Dex implementa : Story 1 — Auth (login/register)
                       : Story 2 — CRUD de todos
                       : Story 3 — UI com Tailwind
                       : Story 4 — API endpoints
                       : ... até Story 8
        Quinn testa : Revisa cada implementação
                    : Roda testes automatizados
                    : Se falhar → Dex corrige → Quinn re-testa
    
    section Resultado
        Projeto pronto : Código no GitHub
                       : Testes passando
                       : README com deploy guide
                       : 🎉 SaaS funcional
```

---

## Diagrama 10: Runtime Layer — Fallback Resiliente

```mermaid
stateDiagram-v2
    [*] --> CreateRuntime: server.js boot

    state CreateRuntime {
        [*] --> CheckConfig
        CheckConfig --> HasGateway: gateway.url exists
        CheckConfig --> Standalone: no gateway config
        
        HasGateway --> TryClawdbot: Cria ClawdbotRuntime
        TryClawdbot --> Connected: ws connect OK ✅
        TryClawdbot --> Degraded: ws connect FAIL ⚠️
        
        Connected --> ResilientProxy: Wrap em ResilientRuntime
        Degraded --> FallbackStandalone: Auto-fallback
        
        state ResilientProxy {
            [*] --> Normal
            Normal --> Normal: Operações OK
            Normal --> CatchError: Runtime crash
            CatchError --> DegradedMode: Degrada gracefully
            DegradedMode --> DegradedMode: Usa StandaloneRuntime
        }
    }

    CreateRuntime --> Ready: Runtime pronto
    
    state Ready {
        [*] --> Serving
        Serving --> SpawnAgent: spawnAgent()
        Serving --> SendMessage: sendToAgent()
        Serving --> GetHistory: getAgentHistory()
        Serving --> GetStatus: getStatus()
    }

    note right of Ready
        GET /api/runtime/status
        retorna estado atual
    end note
```

---

*Raio-X v2.1 — Auditado e ilustrado com Mermaid — Gerado em 2026-02-02 por Claudio*

# 🔬 AG Dev v2.0 — Raio-X Completo do Sistema

> Dissecação total de cada componente, como se conectam, como o sistema inicia, e como tudo funciona junto.

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        AG Dev v2.0                              │
│              Multi-Agent Development Orchestration               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────────┐      │
│  │  UI      │◄──►│  Express  │◄──►│  Módulos do Server   │      │
│  │  React   │ SSE│  Server   │    │                      │      │
│  │  + Zustand│   │  :3456    │    │  • Orchestrator      │      │
│  └──────────┘    │           │    │  • TerminalManager   │      │
│                  │  45 APIs  │    │  • SquadManager      │      │
│                  │  + SSE    │    │  • WorkflowEngine    │      │
│                  │  + Health │    │  • RalphLoop          │      │
│                  └─────┬─────┘    │  • AgentGraph        │      │
│                        │          │  • MemorySystem      │      │
│                        │          │  • StateManager      │      │
│                        ▼          │  • SuperSkillRegistry│      │
│                  ┌───────────┐    └──────────────────────┘      │
│                  │  Runtime  │                                    │
│                  │  Layer    │    ┌──────────────────────┐      │
│                  │           │    │  Core Assets          │      │
│                  │ Clawdbot ◄├───►│  • 14 Agent Personas │      │
│                  │ Standalone│    │  • 10 Workflows YAML │      │
│                  │ Resilient │    │  •  5 Squad Configs   │      │
│                  └───────────┘    │  • 31 SuperSkills     │      │
│                                   │  • Template Engine    │      │
│                                   └──────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Em uma frase:** AG Dev é uma plataforma que orquestra múltiplos agentes de IA (cada um com uma persona especializada) para construir software de forma autônoma, usando workflows YAML, squads de agentes, terminais PTY reais, e um sistema de memória em 3 camadas.

---

## 🚀 Sequência de Inicialização

Quando você roda `node server/server.js` ou `npm start`, acontece exatamente isto:

### Passo 1: Carregamento de Config
```
config.json → merge com env vars (AG_DEV_PORT, AG_DEV_HOST, AG_DEV_DATA_DIR)
```
O `config.json` define portas, limites de terminais, paths dos agents/workflows, config do Ralph, e diretórios de dados. Environment variables podem sobrescrever tudo.

### Passo 2: Inicialização dos Módulos (ordem exata)

```
1. TerminalManager(config.terminals)     → Gerenciador de PTY terminals
2. StateManager()                         → Estado centralizado in-memory
3. Orchestrator(terminal, state, config)  → Coordenador de agents + workflows
4. SquadManager(orchestrator)             → Gerenciador de squads
5. RalphLoop(terminal, options)           → Motor de desenvolvimento autônomo
6. SuperSkillRegistry(superskillsDir)     → Registro de 31 SuperSkills
7. AgentGraph(dataDir)                    → Grafo temporal de interações
8. RuntimeFactory.createRuntime(config)   → Runtime de execução de agentes
9. WorkflowEngine(runtime, events)        → Motor de execução de workflows
```

### Passo 3: Carregamento de Assets
O Orchestrator carrega automaticamente:
- **14 Agent Definitions** de `core/agents/*.md` (parseados do Markdown)
- **10 Workflows** de `core/workflows/*.yaml` (parseados com js-yaml)
- **5 Squad Configs** de `core/squads/*.json`
- **31 SuperSkills** escaneadas de `superskills/*/manifest.json`

### Passo 4: Server Express sobe
- Middleware: CORS + JSON parsing
- 45 endpoints API registrados
- SSE (Server-Sent Events) endpoint para UI real-time
- Serve `ui-dist/` como static files
- Health check em `/health`

### Passo 5: Runtime conecta
- Tenta conectar ao Clawdbot Gateway via WebSocket
- Se falhar → degrada para Standalone Runtime (modo demo)
- ResilientRuntime protege contra crashes

### Output no Console:
```
Loaded 14 agent definitions
Loaded 10 workflows
Loaded 5 squad definitions
  ℹ Runtime: clawdbot → ws://127.0.0.1:18789
  30 SuperSkills loaded across 6 categories
AG Dev server listening on http://0.0.0.0:3456
```

---

## 🧩 Módulos do Server — Dissecação

### 1. `server.js` (1.275 linhas) — O Hub Central

**O que faz:** Express server que conecta TODOS os outros módulos e expõe a API REST.

**Responsabilidades:**
- Inicializa todos os módulos na ordem correta
- Define 45 endpoints da API REST
- Gerencia SSE (Server-Sent Events) para push real-time à UI
- Serve a UI estática (ui-dist/)
- Broadcast de eventos para todos os clientes conectados
- Error handler middleware centralizado

**Como conecta com outros:**
```
server.js ──uses──► TerminalManager (spawn/kill/write terminals)
           ──uses──► StateManager (read/update estado global)
           ──uses──► Orchestrator (list agents, start workflows)
           ──uses──► SquadManager (CRUD squads, activate)
           ──uses──► RalphLoop (load PRD, start/pause/resume)
           ──uses──► SuperSkillRegistry (list/search/run superskills)
           ──uses──► AgentGraph (temporal queries, event tracking)
           ──uses──► WorkflowEngine (execute/control workflows)
           ──uses──► MemorySystem (read/write agent memory)
           ──uses──► RuntimeFactory (create agent runtime)
```

---

### 2. `orchestrator.js` (758 linhas) — O Cérebro

**O que faz:** Coordena agents e distribui tasks. É o cérebro que sabe quem faz o quê.

**Como funciona:**
1. **Na inicialização:** Lê todos os `.md` de `core/agents/` e parseia cada um extraindo: nome, role, expertise, behavior, directive
2. **Na inicialização:** Lê todos os `.yaml` de `core/workflows/` e parseia a estrutura de fases e sequências
3. **Em runtime:** Quando solicitado, spawna agents (via TerminalManager) e atribui tasks de acordo com o workflow ativo

**Estrutura de dados:**
```javascript
this.agentDefinitions = Map<string, AgentDefinition>  // 14 agents
this.workflows = Map<string, Workflow>                  // 10 workflows
this.activeWorkflows = Map<string, WorkflowInstance>   // execuções ativas
```

**Parsing de Agent (Markdown → Object):**
```markdown
# Agent: Dex (Developer)           → name: "Dex", id: "dev"
## Role                             → role: "Expert Senior Software Engineer..."
## Expertise                        → expertise: ["Full-stack development", ...]
## Behavior                         → behavior: ["Execute tasks sequentially...", ...]
## Current Directive                → directive: "{{directive}}" (runtime injection)
```

---

### 3. `terminal-manager.js` (356 linhas) — O Executor

**O que faz:** Spawna e gerencia processos PTY (pseudo-terminals). Cada agent roda num terminal real.

**Como funciona:**
1. Usa `node-pty` para criar terminais reais (como um tmux)
2. Cada terminal tem: ID único, buffer circular, metadata (nome, tipo, task)
3. Suporta write (enviar comandos), resize, kill, auto-restart
4. Emite eventos via EventEmitter: `data`, `exit`, `error`

**Estrutura:**
```javascript
this.terminals = Map<id, {terminal, command, args, status, cols, rows}>
this.buffers = Map<id, string[]>       // circular buffer de output
this.metadata = Map<id, {name, type, task}>
this.config.maxCount = 16              // máximo 16 terminais simultâneos
```

**Fluxo típico:**
```
API POST /api/terminals → TerminalManager.spawn() → node-pty cria PTY
  → terminal.onData → buffer armazena output → SSE broadcast para UI
  → UI renderiza terminal em tempo real
```

---

### 4. `squad-manager.js` (363 linhas) — O Formador de Times

**O que faz:** Gerencia "squads" — times de agents pré-configurados para tipos específicos de trabalho.

**Squads disponíveis:**

| Squad | Agents | Workflow Default |
|-------|--------|-----------------|
| 🏗️ Full Stack Dev | analyst, architect, dev, qa | greenfield-fullstack |
| 🔧 Backend API | analyst, architect, dev | greenfield-service |
| 🎨 Frontend UI | ux-design-expert, dev, qa | greenfield-ui |
| 🚀 DevOps Infra | devops, architect | auto-worktree |
| ✍️ Content Marketing | content-writer, seo-analyst | spec-pipeline |

**Como funciona:**
1. Lê configs de `core/squads/*.json`
2. Cada squad define: agents necessários, workflow padrão, ícone
3. Ao "ativar" uma squad, o Orchestrator spawna os agents definidos
4. Squads podem ser criadas dinamicamente via API

---

### 5. `workflow-engine.js` (591 linhas) — O Diretor

**O que faz:** Lê workflows YAML e executa step-by-step, coordenando agents na sequência correta.

**Dois formatos de workflow suportados:**

**Formato 1 — Phase-based (maioria dos workflows):**
```yaml
phases:
  - phase_0: Environment Bootstrap
  - phase_1: Discovery & Planning
  - phase_2: Document Sharding
  - phase_3: Development Cycle

sequence:
  - agent: devops
    action: environment_bootstrap
    creates: [.aios/config.yaml, README.md]
  - agent: analyst
    action: requirements_analysis
    requires: [environment-report]
```

**Formato 2 — Step-based (qa-loop):**
```yaml
sequence:
  - step: review
    agent: qa
    task: "Review current code"
    on_success: fix
    on_failure: escalate
  - step: fix
    agent: dev
    task: "Fix issues found"
```

**Motor de execução:**
```
WorkflowEngine.start(workflowName, params)
  → Carrega YAML e normaliza steps
  → Para cada step:
      1. Verifica dependências (requires)
      2. Carrega agent definition
      3. Spawna agent via Runtime
      4. Envia task ao agent
      5. Aguarda conclusão
      6. Emite evento SSE
      7. Avança para próximo step
  → Persiste estado em workflow-state.json
```

**Estados de um step:** `pending → ready → running → completed/failed/skipped`
**Estados do workflow:** `idle → running → paused → completed/failed`

---

### 6. `ralph-loop.js` (389 linhas) — O Piloto Automático

**O que faz:** Motor de desenvolvimento autônomo. Recebe um PRD (Product Requirements Document) e implementa automaticamente, task por task.

**Como funciona:**
```
1. Recebe PRD (JSON com user stories)
2. Para cada story (ordenada por prioridade):
   a. Identifica o agent correto
   b. Spawna terminal com o agent
   c. Envia task ao agent
   d. Monitora output
   e. Roda quality checks (se configurados)
   f. Se passou → marca como done, próxima story
   g. Se falhou → registra learning, tenta novamente
   h. Máx 20 iterações (configurável)
3. Ao final: relatório de progresso
```

**Formato do PRD:**
```json
{
  "name": "My Feature",
  "branchName": "feature/my-feature",
  "userStories": [
    {
      "id": "story-1",
      "title": "Implement login page",
      "description": "Create a login page with email/password",
      "priority": 1,
      "passes": false,
      "acceptanceCriteria": ["Has email field", "Has password field"]
    }
  ]
}
```

**Estados:** `idle → running → paused → completed/failed`

**Inteligência:** Acumula "learnings" entre iterações — se algo falhou, o próximo attempt tem contexto do erro anterior.

---

### 7. `agent-graph.js` (629 linhas) — O Observador Temporal

**O que faz:** Camada AG Dev-específica sobre o TemporalGraph. Rastreia todas as interações entre agents ao longo do tempo.

**O que rastreia:**
- **Spawn/Stop de agents** → nodes no grafo
- **Atribuição de tasks** → edges dirigidas (from → to)
- **Colaboração** → edges bidirecionais
- **Compartilhamento de arquivos** → edges com metadata
- **Mensagens** → edges com tipo "message"

**Queries disponíveis:**
- `getTimeline(startTime, endTime)` → tudo que aconteceu num período
- `getAgentHeatmap()` → atividade por agent
- `getCollaborationNetwork()` → grafo de quem trabalhou com quem
- `getSystemPulse()` → métricas do último minuto/hora/dia
- `getFileHistory(filePath)` → quem tocou em qual arquivo

**Auto-save:** Salva o grafo em JSON a cada 30 segundos.

---

### 8. `temporal-graph.js` (533 linhas) — O Motor de Grafo

**O que faz:** Engine genérica de grafos com intervalos temporais. Base pura sobre a qual AgentGraph é construído.

**Conceito fundamental:**
- **Nodes** têm ID, data, e timestamp de criação
- **Edges** têm from, to, activatedAt, deactivatedAt, e data
- Uma edge "ativa" tem `deactivatedAt = null`
- Queries temporais: "quais edges estavam ativas às 14:30?"

**Operações core:**
```javascript
insertNode(id, data)              // cria node
addEdge(from, to, activatedAt)    // cria edge temporal
deactivateEdge(edgeId, timestamp) // "fecha" uma edge
getActiveEdgesAt(time)            // edges ativas num instante
getEdgesInInterval(t0, t1)        // edges num intervalo
getOutgoingEdges(nodeId)          // edges que saem de um node
getIncomingEdges(nodeId)          // edges que chegam a um node
```

**Serialização:** `serialize()` / `deserialize()` para persistir em JSON.

---

### 9. `memory-system.js` (146 linhas) — O Memorizador

**O que faz:** Sistema de memória em 3 camadas para agents reterem contexto entre sessões.

**As 3 camadas:**

| Camada | Propósito | Storage | Lifetime |
|--------|-----------|---------|----------|
| 🔴 Hot | Sessão atual (working memory) | JSON files | Efêmera — limpa ao reiniciar |
| 🟡 Warm | Aprendizados recentes (episodic) | JSONL append-only | Dias/semanas |
| 🔵 Cold | Arquivo histórico (long-term) | JSONL arquivado por data | Permanente |

**Fluxo:**
```
Agent aprende algo → setHot(key, value)     [sessão atual]
Session termina    → appendWarm(cat, entry) [consolidar]
Periodicamente     → archive(category)      [warm → cold]
```

**Memory Folding:** Comprime contexto quando warm fica grande demais — mantém resumo, descarta detalhes.

---

### 10. `state.js` (254 linhas) — O Estado Central

**O que faz:** Estado in-memory centralizado de todo o sistema. Single source of truth.

**O que mantém:**
```javascript
this.agents = Map<id, AgentState>    // estado de cada agent
this.workflows = Map<id, WFState>    // estado de cada workflow
this.system = {                       // estado global
  status: 'idle|working|error',
  startTime, activeAgents, totalAgents, version
}
this.events = []                      // log circular (max 1000)
```

**Eventos:** Toda mudança gera um evento no log (`agent_update`, `agent_remove`, `workflow_start`, etc.)

---

### 11. `ws-bridge.js` (329 linhas) — A Ponte com Clawdbot

**O que faz:** Conecta AG Dev ao Clawdbot Gateway via WebSocket para usar agentes IA reais.

**Protocolo:**
1. Conecta a `ws://127.0.0.1:18789`
2. Handshake: envia `connect` frame com token
3. Recebe `hello-ok` com info do gateway
4. A partir daí: pode spawnar sessions, enviar mensagens, receber replies

**Capabilities:**
- `spawnSession(task, options)` → cria uma sessão de agente no Clawdbot
- `sendMessage(sessionKey, message)` → envia mensagem a um agente
- `getHistory(sessionKey)` → histórico de uma sessão
- `listSessions()` → sessões ativas
- Subscriptions para lifecycle events (agent started, finished, etc.)

**Standalone mode:** Se gateway não está disponível, tudo funciona em modo demo (sem IA real).

---

### 12. Runtime Layer (3 arquivos, 504 linhas total)

**`index.js` — Interface abstrata AgentRuntime:**
Define o contrato que todo runtime deve implementar:
```
connect() → spawnAgent() → sendToAgent() → pauseAgent() → resumeAgent()
getAgentHistory() → listSessions() → subscribeToAgent() → getStatus()
```

**`clawdbot-runtime.js` — Runtime real:**
Wraps `ws-bridge.js` na interface AgentRuntime. Delega tudo ao WebSocket bridge.

**`standalone-runtime.js` — Runtime de demo:**
Simula agents in-memory. Sem IA real. Útil para desenvolvimento da UI e testes.

**`runtime-factory.js` — Factory + Resilient proxy:**
```
Se config.runtime = 'standalone' → StandaloneRuntime
Se config.gateway.url existe → ClawdbotRuntime envolto em ResilientRuntime
Senão → StandaloneRuntime
```

**ResilientRuntime:** Proxy que captura crashes do runtime primário e degrada gracefully para standalone. **Nunca crasha o server.**

---

## ⚡ SuperSkills — O Arsenal

### O que são
SuperSkills são ferramentas executáveis que agents podem invocar. Cada uma é um módulo independente com:
- `manifest.json` — metadata, inputs, outputs, categoria
- `run.js` — código executável

### Registry (`superskills/registry.js`, 479 linhas)
- Escaneia `superskills/*/` ao iniciar
- Valida manifests contra schema
- Categoriza em 6 tipos
- Expõe API de search, list, execute

### Runner (`superskills/runner.js`, 526 linhas)
- CLI para executar SuperSkills diretamente
- Comandos: `list`, `run <name>`, `search <query>`, `info <name>`, `validate`

### As 31 SuperSkills por Categoria

**🔍 Analyzers (6):**
| SuperSkill | Função |
|------------|--------|
| code-complexity | Analisa complexidade ciclomática do código |
| csv-summarizer | Resume datasets CSV com estatísticas |
| dep-graph | Mapeia dependências do projeto |
| git-stats | Estatísticas do repositório git |
| security-scan | Scan de vulnerabilidades |
| temporal-analysis | Análise temporal do grafo de agents |

**🏗️ Builders (6):**
| SuperSkill | Função |
|------------|--------|
| docx-builder | Gera documentos Word |
| file-organize | Organiza estrutura de arquivos |
| image-enhance | Melhora qualidade de imagens |
| pdf-builder | Gera PDFs |
| static-site | Gera sites estáticos |
| xlsx-builder | Gera planilhas Excel |

**🔌 Connectors (4):**
| SuperSkill | Função |
|------------|--------|
| postgres-query | Queries em PostgreSQL |
| reddit-fetch | Extrai conteúdo do Reddit |
| video-download | Download de vídeos |
| webhook-fire | Dispara webhooks |

**⚙️ Generators (6):**
| SuperSkill | Função |
|------------|--------|
| api-scaffold | Gera scaffolding de API REST |
| changelog-gen | Gera changelogs de commits |
| dockerfile-gen | Gera Dockerfiles otimizados |
| domain-brainstorm | Brainstorm de nomes de domínio |
| readme-gen | Gera README.md automático |
| schema-to-types | Converte schemas em TypeScript types |

**🔄 Transformers (7):**
| SuperSkill | Função |
|------------|--------|
| article-extractor | Extrai artigos de URLs |
| csv-to-json | Converte CSV → JSON |
| html-to-md | Converte HTML → Markdown |
| invoice-parser | Parseia faturas/invoices |
| json-to-form | Gera formulários de JSON schema |
| md-to-slides | Converte Markdown → slides |
| text-upper | Transforma texto em UPPERCASE |

**✅ Validators (2):**
| SuperSkill | Função |
|------------|--------|
| lint-fix | Lint + auto-fix de código |
| webapp-test | Testes automatizados de webapp |

---

## 🎭 Agent Personas — Os 14 Especialistas

Cada agent tem uma persona completa definida em Markdown com: nome, role, expertise, behavior, e directive slot.

| Agent | Persona | Especialidade |
|-------|---------|---------------|
| `aios-master` | **Orion** | Master Orchestrator — executa qualquer coisa, coordena tudo |
| `analyst` | — | Business/Systems Analyst — decompõe requisitos |
| `architect` | — | Solution Architect — design de sistema |
| `content-writer` | — | Content Writer — documentação e conteúdo |
| `data-engineer` | — | Data Engineer — pipelines e bancos de dados |
| `dev` | **Dex** | Senior Developer — implementa features, testes, debug |
| `devops` | — | DevOps Engineer — infra, CI/CD, deploy |
| `pm` | — | Project Manager — planejamento, tracking |
| `po` | — | Product Owner — priorização, roadmap |
| `qa` | **Quinn** | QA Architect — testes, qualidade, risk assessment |
| `seo-analyst` | — | SEO Analyst — otimização para buscadores |
| `sm` | — | Scrum Master — facilitação, ceremonies |
| `squad-creator` | — | Squad Creator — cria e configura squads |
| `ux-design-expert` | — | UX Designer — interfaces, usabilidade |

**Injeção de Diretiva:** Cada agent tem `{{directive}}` no .md que é substituído em runtime com a task específica.

---

## 🔄 Workflows — Os 10 Roteiros

### Greenfield (projeto novo)
| Workflow | Fases | Agents |
|----------|-------|--------|
| `greenfield-fullstack` | Bootstrap → Discovery → Sharding → Dev | devops, analyst, architect, dev, qa |
| `greenfield-service` | Similar, focado em backend/API | devops, analyst, architect, dev |
| `greenfield-ui` | Similar, focado em frontend | devops, ux, dev, qa |

### Brownfield (projeto existente)
| Workflow | Fases | Agents |
|----------|-------|--------|
| `brownfield-discovery` | Análise do codebase existente | analyst, architect |
| `brownfield-fullstack` | Evolução full-stack | analyst, architect, dev, qa |
| `brownfield-service` | Evolução de backend | analyst, dev |
| `brownfield-ui` | Evolução de frontend | ux, dev |

### Especiais
| Workflow | Função |
|----------|--------|
| `qa-loop` | Loop automático: review → fix → re-review (max 5 iterações) |
| `auto-worktree` | Git worktree automático para branches isoladas |
| `spec-pipeline` | Pipeline de especificação → implementação |

---

## 🖥️ UI — O Dashboard

### Stack
- **React 18** + TypeScript
- **Zustand** para state management
- **Tailwind CSS** para styling
- **Lucide** para ícones
- **SSE** (Server-Sent Events) para updates em tempo real

### Componentes

| Componente | Função |
|------------|--------|
| `App.tsx` | Layout principal, navegação entre views, grid de terminais |
| `TerminalPane.tsx` | Renderiza output de um terminal PTY individual |
| `NewAgentDialog.tsx` | Dialog para spawnar novo agent (escolhe tipo, task) |
| `SquadSelector.tsx` | Seletor de squads pré-configuradas |
| `WorkflowView.tsx` | Visualização do workflow ativo com steps e progresso |
| `RalphView.tsx` | Interface do Ralph Loop (PRD, progresso, controles) |
| `ProjectContext.tsx` | Exibe contexto do projeto (goals, stack, constraints) |
| `OrchestratorChat.tsx` | Chat com o orquestrador para comandos |
| `SuperSkillsView.tsx` | Catálogo e execução de SuperSkills |

### Store (Zustand)
```typescript
{
  terminals: TerminalInfo[]      // terminais ativos
  agents: AgentDef[]             // definições de agents
  connected: boolean             // SSE conectado?
  currentView: string            // view ativa na UI
  activeSquad: Squad | null      // squad ativada
  workflowState: WorkflowState   // estado do workflow
  chatMessages: ChatMessage[]    // mensagens do chat
  ralphState: RalphState         // estado do Ralph Loop
}
```

### Comunicação UI ↔ Server
```
UI ──fetch──► REST API (45 endpoints)     [requests]
UI ◄──SSE────  /api/events                [real-time updates]
```

A UI não faz polling pesado — recebe events via SSE quando algo muda no server.

---

## 🌐 API Reference — Os 45 Endpoints

### Core
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/health` | Health check com métricas |
| GET | `/api/events` | SSE stream de eventos |
| GET | `/api/state` | Estado global do sistema |
| GET | `/api/metrics` | Métricas de performance |

### Terminals (PTY)
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/terminals` | Lista terminais ativos |
| POST | `/api/terminals` | Spawna novo terminal |
| POST | `/api/terminals/:id/write` | Envia input ao terminal |
| POST | `/api/terminals/:id/resize` | Redimensiona terminal |
| DELETE | `/api/terminals/:id` | Mata terminal |
| GET | `/api/terminals/:id/buffer` | Buffer de output |

### Agents
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/agents` | Lista agent definitions |

### Workflows
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/workflows` | Lista workflows disponíveis |
| GET | `/api/workflows/active` | Workflow ativo |
| POST | `/api/workflows/:name/start` | Inicia workflow |
| POST | `/api/workflows/:name/execute` | Executa workflow (engine) |
| POST | `/api/workflows/active/stop` | Para workflow ativo |
| POST | `/api/workflows/:id/stop` | Para workflow específico |

### Squads
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/squads` | Lista squads |
| GET | `/api/squads/active` | Squad ativa |
| POST | `/api/squads` | Cria squad |
| POST | `/api/squads/:id/activate` | Ativa squad |
| DELETE | `/api/squads/:id` | Remove squad |
| GET | `/api/squads/:id` | Detalhes da squad |

### Ralph Loop
| Method | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/ralph/prd` | Carrega PRD |
| POST | `/api/ralph/start` | Inicia loop |
| POST | `/api/ralph/pause` | Pausa loop |
| POST | `/api/ralph/resume` | Retoma loop |

### System
| Method | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/system/pause-all` | Pausa todos agents |
| POST | `/api/system/resume-all` | Retoma todos agents |
| POST | `/api/chat` | Envia mensagem ao orquestrador |
| POST | `/api/context` | Atualiza contexto do projeto |

### Temporal Graph
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/graph/agents` | Agents no grafo |
| GET | `/api/graph/timeline` | Timeline de eventos |
| GET | `/api/graph/heatmap` | Heatmap de atividade |
| GET | `/api/graph/network` | Rede de colaboração |
| GET | `/api/graph/pulse` | Pulso do sistema |
| GET | `/api/graph/agent/:id` | Detalhes de um agent |
| GET | `/api/graph/files` | Histórico de arquivos |
| GET | `/api/graph/stats` | Estatísticas gerais |
| POST | `/api/graph/events` | Registra eventos |

### SuperSkills
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/superskills` | Lista todas |
| GET | `/api/superskills/search` | Busca por query |
| GET | `/api/superskills/stats` | Estatísticas |
| GET | `/api/superskills/:name` | Detalhes de uma |
| POST | `/api/superskills/:name/run` | Executa uma |

### Memory
| Method | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/memory/stats` | Estatísticas de memória |
| GET | `/api/memory/agent/:agentId` | Memória de um agent |
| POST | `/api/memory/record` | Registra memória |
| POST | `/api/memory/fold/:agentId` | Comprime memória |

---

## 🔗 Como Tudo Se Conecta — Fluxo Completo

### Cenário: "Quero criar um SaaS de to-do list"

```
1. Usuário abre UI → App.tsx carrega
   └─ fetch /api/agents → vê 14 agents disponíveis
   └─ fetch /api/squads → vê 5 squads

2. Usuário seleciona squad "Full Stack Dev"
   └─ POST /api/squads/fullstack-dev/activate
   └─ SquadManager ativa squad
   └─ Orchestrator prepara agents: analyst, architect, dev, qa

3. Usuário clica "Start Workflow" (greenfield-fullstack)
   └─ POST /api/workflows/greenfield-fullstack/execute
   └─ WorkflowEngine carrega YAML
   └─ Normaliza em steps executáveis

4. FASE 0 — Environment Bootstrap:
   └─ WorkflowEngine: step "devops/environment_bootstrap" → READY
   └─ Runtime.spawnAgent("devops", {task: "Setup environment"})
   └─ WS-Bridge → Clawdbot Gateway → cria sessão de IA
   └─ Agent devops executa: instala deps, cria repo, configura tools
   └─ AgentGraph: agentSpawned("devops", metadata)
   └─ MemorySystem: setHot("devops-session", context)
   └─ SSE broadcast → UI atualiza WorkflowView (step ✅)

5. FASE 1 — Discovery & Planning:
   └─ Step "analyst/requirements_analysis" → READY
   └─ Agent analyst analisa requisitos, gera PRD
   └─ Step "architect/system_design" → READY (depende do analyst)
   └─ Agent architect cria arquitetura
   └─ AgentGraph: taskAssigned("analyst", "architect", taskData)

6. FASE 2 — Document Sharding:
   └─ Documentos são divididos em tasks menores
   └─ Cada task → user story no formato Ralph

7. FASE 3 — Development Cycle:
   └─ RalphLoop recebe PRD gerado
   └─ Para cada story:
       └─ TerminalManager.spawn() → PTY para agent dev
       └─ Agent implementa código
       └─ Quality checks rodam
       └─ Se passou → próxima story
       └─ Se falhou → learning acumulado, retry
   └─ Agent QA revisa tudo via qa-loop workflow

8. Durante tudo isso:
   └─ AgentGraph rastreia cada interação temporal
   └─ MemorySystem persiste aprendizados
   └─ SSE mantém UI sincronizada em real-time
   └─ StateManager mantém estado global consistente
```

---

## 🧠 Template Engine — O Gerador de Documentos

Localizado em `core/templates/templates/engine/`, é um motor de templates completo:

| Arquivo | Função |
|---------|--------|
| `index.js` | Orquestrador principal |
| `loader.js` | Carrega templates do filesystem |
| `elicitation.js` | Coleta variáveis interativamente |
| `renderer.js` | Renderiza templates com variáveis |
| `validator.js` | Valida output gerado |

**Templates suportados:** PRD, PRD-v2, ADR, PMDR, DBDR, Story, Epic, Task

Usado pelo Orchestrator para gerar documentos de planejamento automaticamente.

---

## 📊 Métricas do Sistema

```
Linhas de código server:     7.259 (15 arquivos JS)
Linhas de código UI:         ~2.600 (React/TypeScript)
Linhas de SuperSkills:       ~3.000 (31 skills + registry + runner)
Agent personas:              14 (Markdown)
Workflows:                   10 (YAML)
Squads:                      5 (JSON)
API endpoints:               45
Total estimado:              ~15.000+ linhas de código
```

---

## 🔮 Inovações Únicas

1. **Temporal Graph Engine** — Grafo com dimensão temporal. Não só "quem se conecta a quem", mas "quem se conectou a quem, quando, e por quanto tempo". Permite replay temporal de todo o sistema.

2. **Memory Folding** — Compressão inteligente de contexto. Quando a memória warm cresce, ela é "dobrada" (folded) mantendo essência e descartando ruído.

3. **ResilientRuntime** — O server NUNCA crasha por causa do runtime. Se Clawdbot Gateway cair, degrada transparentemente para standalone. Zero downtime.

4. **Ralph Loop** — Desenvolvimento autônomo com learning acumulativo. Cada falha ensina o próximo attempt. É um proto-AGI de desenvolvimento.

5. **Agent Persona System** — Agents não são genéricos. Cada um tem personalidade, expertise definida, e behavioral rules. O architect pensa diferente do dev que pensa diferente do QA.

6. **SuperSkills Registry** — Sistema plugável de ferramentas. Qualquer pessoa pode criar uma SuperSkill (manifest.json + run.js) e ela é auto-descoberta.

---

*Gerado em 2026-02-02 por Claudio — Raio-X completo do AG Dev v2.0*

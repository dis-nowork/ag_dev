# AG Dev — Análise & Ajustes v2.0
## Auditoria Completa: Código × Design Spec × Capacidades OpenClaw

*Documento gerado após leitura integral de: todo código-fonte (server, bridge, UI, stores, hooks, views, componentes, theme, config), Design Spec v2.0, Capability Map, e documentação oficial do OpenClaw/Clawdbot (protocol, sessions, multi-agent, gateway).*

*Objetivo: transformar AG Dev de demo visual em extensão funcional do Clawdbot.*

---

## 0. Contexto Filosófico: Work Levels 5-6 (Elliott Jaques)

O nível 5-6 de Jaques trata de **abstração sistêmica**: a pessoa não resolve problemas — ela **redesenha o sistema** onde os problemas deixam de existir. AG Dev no nível 5-6 não é um dashboard que mostra agentes. É um **sistema que permite a qualquer humano comandar uma operação multi-agente sem entender a infraestrutura por baixo**. A armadura do Homem de Ferro: o operador veste, e o sistema adapta.

Isso significa:
- O humano **nunca** deveria digitar um `sessions_spawn` manualmente
- O humano **nunca** deveria saber que existe um WebSocket por trás
- Cada click no AG Dev deve traduzir para a operação Clawdbot correta **invisível**
- O AG Dev deve **reagir** ao que acontece no Clawdbot (events), não apenas **pedir** dados (polling)

---

## 1. Veredicto Global: Estado Atual

| Camada | Arquivos | Estado | Nota |
|--------|----------|--------|------|
| **Server** | `server.js` | 🟡 Funcional mas desconectado | Serve state local, não orquestra agentes reais |
| **Bridge** | `ws-bridge.js` | 🟡 Esqueleto correto | Protocolo de connect está errado (não segue gateway protocol v3) |
| **UI Shell** | `App.tsx` + nav + routing | ✅ Sólido | Navegação, shortcuts, layout — pronto |
| **Stores** | 3 stores Zustand | 🟡 Estrutura OK, dados fake | Precisam refletir estado real do Clawdbot |
| **Views** | 7 views | 🟡 Visual pronto, sem integração real | Cada uma precisa conectar a APIs reais |
| **Components** | 6 componentes | ✅ Maioria OK | Sparkline e StatusBar precisam dados reais |
| **Core/Agents** | 12 .md files | 🔴 Legado AIOS, incompatível | Precisam virar definições Clawdbot-native |
| **Core/Templates** | 50+ templates | ⚪ Estático | Útil depois, irrelevante agora |
| **Core/Workflows** | 10 .yaml | 🔴 AIOS-only | Precisam virar orquestrações via sessions_spawn |

---

## 2. Análise Arquivo por Arquivo

### 2.1 Server (`server/server.js`)

**Linhas:** ~350 | **Função:** Express server + SSE + REST API + static serve

| Elemento | Veredicto | Direcionamento |
|----------|-----------|----------------|
| **Express + CORS + JSON** | ✅ FICA | Base sólida |
| **SSE (`/api/sse`)** | ✅ FICA | Canal de push correto. Mas precisa emitir events REAIS do Clawdbot, não só state updates |
| **State management (JSON file)** | 🔧 AJUSTAR | O state.json atual guarda dados hardcoded do "Phantom ID". Precisa ser dinâmico: o state REAL vem do Clawdbot (sessions, agents). O state local deve ser apenas cache + UI-specific (view prefs, directives) |
| **`/api/project`** | 🔧 AJUSTAR | Hoje lê git do `PROJECT_ROOT` hardcoded. Deve aceitar qualquer projeto via config. Manter git info mas adicionar: Clawdbot gateway status, agents count from sessions |
| **`/api/agents`** | 🔧 AJUSTAR | Lê `.md` files do `core/agents/`. Correto para definições, mas STATUS deve vir do Clawdbot (`sessions_list`), não do `state.json` |
| **`POST /api/agents/:id/state`** | 🔧 AJUSTAR | Hoje grava em state.json local. Deve: (1) mandar comando para Clawdbot via bridge, (2) esperar confirmação, (3) atualizar state local como cache |
| **`/api/agents/:id/pause` e `/resume`** | 🔧 AJUSTAR | Hoje só muda string no JSON. Deve enviar para o agente real via `sessions_send` com instrução de pause/redirect |
| **`/api/chat` e `/api/chat/bot`** | 🔧 AJUSTAR | Hoje é chat local sem AI. Deve: rotear para Clawdbot main session via bridge (`sendMessage`). Respostas voltam via SSE |
| **`/api/agents/:id/chat`** | 🔧 AJUSTAR | Deve rotear para session específica do agente via `bridge.sendToSession(sessionKey, message)` |
| **`/api/docs`** | ✅ FICA | Útil para navegar docs do projeto. Expandir para mostrar docs do AG Dev também |
| **`/api/tree`** | ✅ FICA | File tree do projeto. Útil no Agent Focus |
| **`/api/git/*`** | 🔧 AJUSTAR | `POST /api/git/commit` executa `git commit` direto. **PERIGO: command injection** via `req.body.message`. Sanitizar com `execFileSync` em vez de `execSync` com template string |
| **`POST /api/exec`** | 🔴 REMOVER ou PROTEGER | Executa **qualquer comando shell** sem auth. Isso é um backdoor. Deve: (1) exigir auth, (2) limitar a comandos allowlisted, ou (3) rotear via Clawdbot exec tool |
| **`/api/strategy` + `/api/agents/:id/directive`** | ✅ FICA | Estratégia + directives por agente. Bom design. Adicionar: ao salvar directive, injetar no system prompt do agente via hook `before_agent_start` |
| **`/api/agents/:id/stream` (SSE per-agent)** | ✅ FICA | Correto. Deve receber lifecycle events reais do Clawdbot (tool calls, thinking, etc) via bridge subscription |
| **`/api/agents/:id/inject`** | 🔧 AJUSTAR | Hoje só faz broadcast local. Deve: enviar via `bridge.sendToSession(agentSessionKey, message)` — isso é o `sessions_send` real |
| **`/api/state`** | ✅ FICA | Agregador de estado. Bom para polling fallback |
| **`/api/health`** | ✅ FICA | Adicionar: bridge status, gateway ping |
| **`/api/workflows` e `/api/teams`** | ⚪ MANTER | YAML readers. Útil depois para templates de workflow |
| **SPA catch-all** | ✅ FICA | Necessário para React Router |

#### Segurança Server — Ações Obrigatórias:
1. `POST /api/exec` → remover ou exigir token auth + command allowlist
2. `POST /api/git/commit` → trocar `execSync` por `execFileSync(['git', 'commit', '-m', message])`
3. Adicionar middleware de auth simples (bearer token no header) em todas as rotas POST
4. Rate limiting básico nos endpoints de chat

---

### 2.2 WebSocket Bridge (`server/ws-bridge.js`)

**Linhas:** ~130 | **Função:** Conectar AG Dev ao Clawdbot Gateway via WebSocket

| Elemento | Veredicto | Direcionamento |
|----------|-----------|----------------|
| **Classe ClawdbotBridge** | 🔧 AJUSTAR | Estrutura correta, protocolo errado |
| **`_detectToken()`** | ✅ FICA | Lê de `~/.clawdbot/clawdbot.json`. Funcional |
| **`connect()` — handshake** | 🔴 REESCREVER | Envia connect frame com campos inventados (`clientType`, `clientVersion`). O protocolo real v3 exige: `minProtocol: 3`, `maxProtocol: 3`, `client: { id, version, platform, mode }`, `role: "operator"`, `scopes`, `auth: { token }`. Ver `/gateway/protocol.md` |
| **`_handleMessage()`** | 🔧 AJUSTAR | Espera `msg.type === 'res'` e `msg.type === 'event'`, correto. Mas os event names estão inventados (`msg.event === 'agent'`, `payload.stream`). Precisa mapear para events reais do gateway |
| **`sendMessage()`** | 🔧 AJUSTAR | Envia `method: 'agent'`. Verificar se esse é o RPC method correto no gateway. Provavelmente deve usar o método de sessions/send |
| **`sendToSession()`** | 🔧 AJUSTAR | Mesmo problema — verificar method name real |
| **Reconnect logic** | ✅ FICA | 5s retry está bom |
| **`pendingRequests` Map** | ✅ FICA | Request-response tracking correto |

#### Bridge — Reescrita Necessária:

```
ANTES (atual):
{
  type: 'req',
  id: 'agdev-1',
  method: 'connect',
  params: {
    role: 'client',
    clientType: 'ag-dev',      ← inventado
    clientVersion: '1.0.0',    ← inventado
    auth: { token: '...' }
  }
}

DEPOIS (protocolo v3 real):
{
  type: 'req',
  id: 'agdev-1',
  method: 'connect',
  params: {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'ag-dev',
      version: '1.0.0',
      platform: 'node',
      mode: 'operator'
    },
    role: 'operator',
    scopes: ['operator.read', 'operator.write'],
    caps: [],
    commands: [],
    permissions: {},
    auth: { token: '...' },
    userAgent: 'ag-dev/1.0.0'
  }
}
```

---

### 2.3 State (`server/state.json`)

**Veredicto:** 🔴 LIMPAR

O arquivo tem 12 agents com dados hardcoded do projeto "Phantom ID" (checklists, progresso, output). Isso deve ser:
1. **Zerado** — state.json deve começar vazio: `{ "agents": {}, "chat": { "messages": [] }, "agentChats": {}, "workflow": {}, "timeline": [] }`
2. **Populado dinamicamente** quando AG Dev conecta ao Clawdbot e lê sessions ativas
3. **Persistir apenas**: directives de strategy, preferências de UI, cache de última posição

---

### 2.4 Config (`config.json`)

```json
{
  "projectRoot": "/root/clawd/phantom_id",
  "port": 3000,
  "name": "Phantom ID"
}
```

**Veredicto:** 🔧 AJUSTAR

Adicionar campos:
```json
{
  "projectRoot": "",
  "port": 3000,
  "name": "",
  "gateway": {
    "url": "ws://127.0.0.1:18789",
    "token": ""
  },
  "agents": {
    "definitionsDir": "./core/agents",
    "autoSpawn": false
  }
}
```

---

### 2.5 UI — App Shell (`ui/src/App.tsx`)

**Veredicto:** ✅ FICA (com ajustes menores)

| Elemento | Veredicto | Nota |
|----------|-----------|------|
| Nav items (6 views) | ✅ | Cockpit, Pipeline, Gantt, Emergence, Strategy, Terminal |
| AnimatePresence routing | ✅ | Transições suaves entre views |
| useSSE + usePolling | ✅ | Dual connection (push + pull fallback) |
| useKeyboard | ✅ | Shortcuts funcionais |
| ConsentBar | ✅ | Posicionamento correto (acima do conteúdo) |
| StatusBar | ✅ | Footer com métricas |
| ChatFloat + CommandPalette | ✅ | Floating overlays |
| Atalhos de teclado (1-6) | 🔧 | Hoje: 1=cockpit, 2=pipeline, 3=emergence, 4=strategy. No `useKeyboard.ts` os números não batem com NAV_ITEMS. Sincronizar |

**Ajuste:** `useKeyboard.ts` mapeia `1→cockpit, 2→agent(se selecionado), 3→pipeline, 4→emergence`. Mas NAV_ITEMS é `1→cockpit, 2→pipeline, 3→gantt, 4→emergence, 5→strategy, 6→terminal`. Alinhar os dois.

---

### 2.6 UI — Stores

#### `agentStore.ts` ✅ FICA
- Interface `AgentState` completa: status, task, checklist, progress, output, thinking, filesChanged, activityHistory
- **Adicionar:** `sessionKey: string | null` — referência à session Clawdbot real deste agente
- **Adicionar:** `model: string` — modelo em uso
- **Adicionar:** `tokens: { input: number, output: number, cost: number }` — uso real

#### `chatStore.ts` ✅ FICA
- Mensagens com from/agentId/text/timestamp
- **Adicionar:** `sessionKey: string` — para rotear via bridge

#### `uiStore.ts` ✅ FICA
- View routing, agent selection, chat state, sidebar
- Sem alterações necessárias

---

### 2.7 UI — Hooks

#### `useSSE.ts` 🔧 AJUSTAR
- Conecta a `/api/sse` ✅
- Parseia `agent_update` e `state` events ✅
- **Adicionar:** handlers para novos event types vindos do bridge:
  - `clawdbot_event` → lifecycle events (tool calls, thinking)
  - `agent_stream` → text delta streaming
  - `bridge_status` → connected/disconnected

#### `useKeyboard.ts` 🔧 AJUSTAR
- Shortcuts `1-4` não batem com NAV_ITEMS (são 6 views agora)
- **Adicionar:** `5→strategy, 6→terminal` nos shortcuts
- **Adicionar:** `⌘J → toggleChat` (já existe)

---

### 2.8 UI — Theme (`lib/theme.ts`)

**Veredicto:** ✅ FICA — bem estruturado

| Elemento | Veredicto | Nota |
|----------|-----------|------|
| Color tokens | ✅ | Dark theme consistente, bem organizado |
| Squad system | ✅ | 4 squads com cores distintas |
| AGENTS array (12) | 🔧 | Hardcoded. Deve ser configurável (loaded from server) ou pelo menos facilmente extensível |
| Motion presets | ✅ | Fast/normal/slow/pulse |
| `getAgentMeta` / `getSquadColor` | ✅ | Helpers úteis |

**Problema conceitual:** Os 12 agentes e 4 squads estão hardcoded no theme. Se AG Dev deve funcionar com "qualquer projeto", os agentes devem vir do server (que lê os `.md` do `core/agents/`). O theme deve ter apenas os **defaults visuais**, não a definição dos agentes.

**Ação:** Mover `AGENTS` e `SQUADS` para um `/api/agents/meta` endpoint, ou derivar do `/api/agents` existente. Theme mantém apenas cores e helpers.

---

### 2.9 UI — Views (7 views)

#### View 1: `CockpitView.tsx` ✅ FICA

Dashboard com cards de agentes agrupados por squad. Funcional e limpo.

| Item | Nota |
|------|------|
| Grid de cards por squad | ✅ Bom layout |
| Agent selection → AgentView | ✅ Funcional |
| Squad counters (X active) | ✅ |

**Ajuste:** Adicionar indicador de conexão com Clawdbot (connected/disconnected) no topo.

#### View 2: `AgentView.tsx` ✅ FICA (com ajustes)

Split view: contexto do agente (left) + output (right).

| Item | Veredicto |
|------|-----------|
| Header com status/ações | ✅ |
| Pause/Resume/Restart buttons | 🔧 Precisam chamar API real (sessions_send) |
| "Chat" button → abre ChatFloat | ✅ |
| Current Task + Progress | ✅ |
| "Thinking" panel | 🔧 Hoje usa state local. Deve receber thinking stream do SSE |
| Checklist | ✅ |
| Activity Sparkline | 🔧 Dados fake. Precisa de métrica real (tokens/min ou events/min) |
| Output panel (monospace) | ✅ Bom para exibir output do agente |
| Files Changed | ✅ Bom. Precisa de fonte real (git diff do agente) |
| `agentAction('restart')` | 🔧 Endpoint `/api/agents/:id/restart` não existe no server. Adicionar ou remover botão |

#### View 3: `PipelineView.tsx` 🔧 AJUSTAR

Kanban com 4 colunas: Backlog → In Progress → Review → Done.

| Item | Veredicto |
|------|-----------|
| 4 colunas fixas | ✅ |
| Cards derivados de agent state | ✅ Lógica correta |
| Cards de checklist items como subtasks | ✅ Boa ideia |
| Velocity metric | 🔧 `totalDone / allTasks` é simplista. Adicionar janela temporal |
| Drag and drop | ❌ **NÃO EXISTE** — mencionado no spec mas não implementado |

**Ação:** Implementar drag-and-drop de cards entre colunas (reprioritização). Pode usar `@dnd-kit/sortable` ou framer-motion drag.

#### View 4: `GanttView.tsx` ✅ FICA (com ajustes)

Timeline com barras por agente. Derivado do state dos agentes.

| Item | Veredicto |
|------|-----------|
| `deriveGanttTasks()` | 🔧 Hardcoded para workflow AIOS (brief→prd→ux→arch...). Deve ser configurável por projeto |
| Day headers | ✅ |
| Barras com progress fill | ✅ Visual bonito |
| Click bar → Edit directive | ✅ Boa feature |
| Inline directive editor | ✅ Funcional |
| Critical path calculation | 🔧 Simplista (lista tasks não-done). Deve calcular caminho mais longo real |
| Dependency arrows visuais | ❌ **NÃO EXISTE** — dependencies estão no data mas não renderizadas como setas |
| Drag to reorder | ❌ **NÃO EXISTE** — mencionado no spec |

**Ação:** Adicionar setas de dependency SVG entre barras. Fazer workflow configurável.

#### View 5: `EmergenceView.tsx` 🔧 AJUSTAR

Grafo de relações usando React Flow.

| Item | Veredicto |
|------|-----------|
| Project → Squads → Agents hierarchy | ✅ |
| Animated edges para agents ativos | ✅ Visual bom |
| Collaboration detection (cross-squad) | ✅ Boa heurística |
| Pattern insights (footer) | 🔧 Simplista. Adicionar: dependency tracking, bottleneck detection |
| Node positions hardcoded | 🔧 Devem ser calculadas dinamicamente (layout algorithm) |

**Ação:** Usar layout algorithm do React Flow (dagre/elkjs) para posicionar automaticamente. Adicionar: click em agente → abre AgentView.

#### View 6: `TerminalView.tsx` ✅ FICA (view mais importante)

"SSH para dentro do agente". Stream de events + command injection.

| Item | Veredicto |
|------|-----------|
| SSE per-agent stream | ✅ Arquitetura correta |
| Line types (exec, write, read, thinking, result, error, system, inject) | ✅ Completo |
| Auto-scroll com detecção de posição | ✅ |
| Command input → inject | 🔧 Deve rotear para `sessions_send` real |
| Pause/Resume/Redirect buttons | 🔧 Precisam de integração real |
| "Clear" button | ✅ |
| Initial lines from agent state | ✅ Boa UX |
| Cursor pulsante durante working | ✅ Visual bonito |

**Esta é a view mais crítica.** Quando conectada ao Clawdbot real, será a janela para ver tool calls, exec results, file edits, e thinking em tempo real.

**Integração necessária:**
1. Bridge subscribe ao lifecycle stream do agente (tool events, assistant deltas)
2. Server traduz eventos do gateway → SSE per-agent → TerminalView
3. Inject commands → `sessions_send(sessionKey, message)` real

#### View 7: `StrategyView.tsx` ✅ FICA

Centro de controle de direcionamento. Editar visão, directives, guardrails.

| Item | Veredicto |
|------|-----------|
| Project Vision editor | ✅ |
| Per-agent directive editor | ✅ |
| Directive history | ✅ Boa feature |
| Guardrails (global rules) | ✅ |
| "Apply Changes" button | 🔧 Hoje salva em strategy.json. Deve TAMBÉM injetar no system prompt dos agentes ativos via hook |
| "Preview Impact" | ❌ **NÃO EXISTE** — mencionado no spec |

---

### 2.10 UI — Componentes

#### `AgentCard.tsx` ✅ FICA
- Status dot com animação pulse ✅
- Progress bar ✅
- Sparkline integrada ✅
- **Ajuste:** Sparkline usa dados fake quando não há histórico. Documentar que é esperado (bootstrapping) ou mostrar placeholder

#### `ChatFloat.tsx` ✅ FICA
- Agent picker dropdown ✅
- Mensagens com balões ✅
- Input com Enter/Send ✅
- **Ajuste crítico:** `send()` faz POST em `/api/chat` que grava local mas NÃO envia para Clawdbot. Deve usar `/api/bridge/send` para processar via AI real. Quando `chatAgentId` está setado, usar `sendToSession`

#### `CommandPalette.tsx` ✅ FICA
- cmdk integration ✅
- Views, Agents, Actions ✅
- **Ajuste:** "Pause All Agents" e "Resume All Agents" chamam endpoints que NÃO EXISTEM (`/api/agents/pause-all`). Implementar no server ou remover

#### `ConsentBar.tsx` ✅ FICA
- Baseado em `pendingActions` count ✅
- **Ajuste:** Botões "Approve all" e "Dismiss" não têm onClick handler. Implementar: deve chamar Clawdbot approval API

#### `Sparkline.tsx` ✅ FICA — perfeito
- SVG puro, performático, sem dependências externas ✅

#### `StatusBar.tsx` ✅ FICA
- View label, project name, agent counts, task counts ✅
- **Adicionar:** Bridge status (🟢 connected / 🔴 disconnected)
- **Adicionar:** Token usage total (custo da sessão)

---

### 2.11 CSS

#### `index.css` ✅ FICA
- Tailwind import, scrollbar styling, cmdk overrides, React Flow overrides ✅

#### `App.css` 🔴 REMOVER
- Template padrão do Vite (logo-spin, `.card`, `.read-the-docs`). Não usado por nenhum componente. Lixo.

---

### 2.12 Core — Agent Definitions (`core/agents/*.md`)

**12 arquivos:** analyst, architect, data-engineer, dev, devops, pm, po, qa, sm, ux-design-expert, aios-master, squad-creator

**Veredicto:** 🔧 REFORMAR

Esses arquivos são prompts AIOS (sistema anterior). Contêm:
- YAML blocks com `activation-instructions`, `persona`, `commands`
- Referências a `.aios-core/development/` (path que não existe no AG Dev)
- Formato incompatível com Clawdbot sessions

**Direcionamento:**
- **Manter como referência** — as personas e skills de cada agente são valiosas
- **Reformatar** para serem usáveis como system prompts quando fizerem `sessions_spawn`
- Cada `.md` deve virar um template de system prompt injetável:

```markdown
# Agent: Developer (Dex)
## Role
Fullstack development specialist. Implements features, writes tests, fixes bugs.

## Expertise  
- Backend: Node.js, Python, Go
- Frontend: React, TypeScript
- Testing: Jest, Playwright
- DevOps: Docker, CI/CD

## Behavior
- Always write tests alongside implementation
- Use conventional commits
- Ask for clarification before architectural decisions
```

---

### 2.13 Core — Workflows (`core/workflows/*.yaml`)

**10 arquivos:** greenfield-*, brownfield-*, spec-pipeline, auto-worktree, qa-loop

**Veredicto:** ⚪ MANTER para referência futura

São workflows AIOS. Conceito valioso (greenfield vs brownfield), mas formato incompatível. No futuro, traduzir para orquestrações Clawdbot:
- Cada step → `sessions_spawn` com task específica
- Dependências → sequential execution ou event-driven

---

### 2.14 Core — Templates (`core/templates/`)

**50+ arquivos:** schemas JSON, templates .hbs, SQL templates, engine JS

**Veredicto:** ⚪ MANTER

Template engine (elicitation, loader, renderer, validator) é funcional. Útil para:
- Gerar PRDs a partir de schema
- Gerar stories formatadas
- Padronizar output dos agentes

Não é prioridade agora, mas vale preservar.

---

## 3. O Que SAI ❌

| Item | Arquivo | Motivo |
|------|---------|--------|
| App.css (Vite template) | `ui/src/App.css` | Não usado, lixo de scaffold |
| State hardcoded "Phantom ID" | `server/state.json` | Dados fake de outro projeto. Limpar para `{}` |
| `/api/exec` sem auth | `server/server.js` | Backdoor de segurança. Remover ou proteger |
| Endpoints fantasma no CommandPalette | `CommandPalette.tsx` | `/api/agents/pause-all` e `/api/agents/resume-all` não existem. Implementar ou remover ações |
| Config hardcoded "Phantom ID" | `config.json` | Substituir por valores vazios/genéricos |

---

## 4. O Que ENTRA 🆕

### 4.1 Novas Views

| View | Descrição | Prioridade |
|------|-----------|------------|
| **DocsView** | Navegador de documentos do projeto (já tem API `/api/docs`, falta view). Monaco editor integrado para edição inline | Sprint 2 |
| **DiagramsView** | Renderização de Mermaid diagrams (flow, ERD, sequence). Auto-gerados ou editáveis | Sprint 3 |
| **LogsView** | Logs do Clawdbot gateway filtráveis. Útil para debug | Sprint 3 |

### 4.2 Novos Componentes

| Componente | Descrição | Prioridade |
|------------|-----------|------------|
| **BridgeIndicator** | Badge no header: 🟢/🔴 Clawdbot connection status | Sprint 1 |
| **ToastSystem** | Notificações de eventos (agent completed, error, approval needed) | Sprint 1 |
| **AgentSpawnDialog** | Modal para iniciar um agente: escolher definição, task, modelo | Sprint 1 |
| **TokenCounter** | Custo/tokens por agente e total na StatusBar | Sprint 2 |

### 4.3 Novos Endpoints Server

| Endpoint | Função | Prioridade |
|----------|--------|------------|
| `GET /api/bridge/status` | Já existe. Adicionar: gateway version, uptime, agent count real | Sprint 1 |
| `POST /api/agents/:id/spawn` | Cria session Clawdbot real para este agente via `sessions_spawn` com o prompt do `.md` + directives do strategy | Sprint 1 |
| `POST /api/agents/:id/send` | Envia mensagem para session ativa do agente via bridge | Sprint 1 |
| `GET /api/agents/:id/history` | Busca histórico da session do agente via bridge | Sprint 1 |
| `POST /api/agents/batch` | Batch operations: spawn squad inteiro, pause all, resume all | Sprint 2 |
| `GET /api/gateway/status` | Proxy para `clawdbot status` — health do gateway real | Sprint 1 |
| `GET /api/agents/meta` | Retorna AGENTS + SQUADS do server (move do theme.ts hardcoded) | Sprint 1 |
| `POST /api/agents/:id/approve` | Approve pending action do agente (consent) | Sprint 2 |

### 4.4 Nova Store

| Store | Função |
|-------|--------|
| `bridgeStore.ts` | Estado da conexão bridge: `{ connected: boolean, gatewayUrl: string, gatewayVersion: string, latency: number }` |

---

## 5. Fluxos de Integração Real

### Fluxo 1: Chat → Clawdbot (PRINCIPAL)

```
Humano digita no ChatFloat
  → POST /api/bridge/send { message, sessionKey? }
    → bridge.sendMessage(message) ou bridge.sendToSession(key, message)
      → WebSocket frame { type: 'req', method: 'agent', params: { message, sessionKey } }
        → Clawdbot Gateway processa
          → Gateway retorna res/events
            → bridge._handleMessage() → broadcast SSE
              → useSSE() → chatStore.addMessage()
                → ChatFloat re-render com resposta
```

### Fluxo 2: Start Agent (spawn)

```
Humano clica "Start" no AgentCard ou AgentSpawnDialog
  → POST /api/agents/:id/spawn { task, model? }
    → Server lê core/agents/:id.md (system prompt)
    → Server lê strategy.directives[:id] (directive atual)
    → Server compõe task: directive + task + guardrails
    → bridge.call('sessions_spawn', { task, agentId, model })
      → Clawdbot cria session isolada
        → Retorna sessionKey
          → Server salva sessionKey no state do agente
            → Broadcast SSE: agent_update { status: 'working', sessionKey }
              → UI atualiza card, Terminal pode conectar ao stream
```

### Fluxo 3: Inject Command (Terminal)

```
Humano digita comando no TerminalView input
  → POST /api/agents/:id/send { message }
    → Server busca sessionKey do agente no state
    → bridge.sendToSession(sessionKey, message)
      → Clawdbot injeta mensagem na session do agente
        → Agente recebe como user message e responde
          → Lifecycle events fluem de volta via SSE → TerminalView
```

### Fluxo 4: Consent/Approval

```
Clawdbot precisa de aprovação (exec sensível, etc)
  → Gateway emite event de approval pending
    → Bridge recebe → broadcast SSE: 'consent_pending'
      → ConsentBar aparece com detalhes
        → Humano clica "Approve"
          → POST /api/agents/:id/approve
            → bridge envia aprovação para gateway
              → Agent continua execução
```

---

## 6. Plano de Sprints

### Sprint 1 — Integração Real (CRÍTICO) 🔴

*Tudo que transforma AG Dev de demo em ferramenta funcional*

| # | Tarefa | Arquivo(s) | Complexidade |
|---|--------|------------|-------------|
| 1.1 | Reescrever handshake do bridge (protocolo v3) | `ws-bridge.js` | Média |
| 1.2 | Implementar `/api/agents/:id/spawn` com `sessions_spawn` real | `server.js` | Alta |
| 1.3 | Rotear ChatFloat → `/api/bridge/send` | `ChatFloat.tsx`, `server.js` | Média |
| 1.4 | Rotear inject → `sessions_send` real | `TerminalView.tsx`, `server.js` | Média |
| 1.5 | Lifecycle events bridge → SSE → TerminalView | `ws-bridge.js`, `server.js`, `useSSE.ts` | Alta |
| 1.6 | BridgeIndicator no header | `App.tsx`, novo `BridgeIndicator.tsx` | Baixa |
| 1.7 | Limpar state.json e config.json | `state.json`, `config.json` | Baixa |
| 1.8 | Fix segurança: `/api/exec`, git commit injection | `server.js` | Média |
| 1.9 | Mover AGENTS/SQUADS para server endpoint | `server.js`, `theme.ts` | Média |
| 1.10 | ToastSystem para notificações | Novo `Toast.tsx` | Baixa |

### Sprint 2 — Polimento & Features

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 2.1 | DocsView com Monaco editor | Alta |
| 2.2 | Drag-and-drop no PipelineView | Média |
| 2.3 | TokenCounter na StatusBar + por agente | Média |
| 2.4 | ConsentBar com approve/deny funcional | Média |
| 2.5 | `/api/agents/batch` (spawn squad, pause all) | Média |
| 2.6 | AgentSpawnDialog (modal de configuração) | Média |
| 2.7 | Fix keyboard shortcuts (alinhar 1-6 com NAV_ITEMS) | Baixa |
| 2.8 | Remover App.css | Baixa |

### Sprint 3 — Visualização Avançada

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 3.1 | DiagramsView com Mermaid | Alta |
| 3.2 | Dependency arrows no GanttView | Média |
| 3.3 | Auto-layout no EmergenceView (dagre/elkjs) | Média |
| 3.4 | LogsView (gateway logs filtráveis) | Média |
| 3.5 | GanttView configurável (não hardcoded para AIOS workflow) | Média |
| 3.6 | Strategy "Preview Impact" | Alta |

### Sprint 4 — Plugin Clawdbot

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 4.1 | `clawdbot.plugin.json` manifest | Baixa |
| 4.2 | Entry point TypeScript do plugin | Alta |
| 4.3 | Hooks de lifecycle (`before_agent_start`, `agent_end`) | Alta |
| 4.4 | Directive injection via hook no system prompt | Média |
| 4.5 | `clawdbot plugins install ag-dev` workflow | Média |
| 4.6 | `clawdbot dev` CLI command → abre AG Dev | Média |

### Sprint 5 — Projeto-Agnóstico

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 5.1 | `ag-dev init` — wizard de setup para novo projeto | Alta |
| 5.2 | Agent definitions configuráveis (não hardcoded 12) | Média |
| 5.3 | Project templates (API, SaaS, mobile) | Média |
| 5.4 | Brownfield scanner (analisa codebase existente) | Alta |
| 5.5 | Multi-project switcher | Média |

---

## 7. Prioridade de Arquivos para Edição

Ordem exata de quais arquivos mexer primeiro:

```
1. server/ws-bridge.js        ← Reescrever handshake (protocolo v3)
2. server/server.js            ← Novos endpoints (spawn, send, approve, meta)
3. server/state.json           ← Limpar dados fake
4. config.json                 ← Tornar genérico
5. ui/src/hooks/useSSE.ts      ← Novos event handlers
6. ui/src/hooks/useKeyboard.ts ← Fix shortcuts 1-6
7. ui/src/components/ChatFloat.tsx ← Rotear para bridge
8. ui/src/views/TerminalView.tsx   ← Integrar inject real
9. ui/src/stores/agentStore.ts     ← Adicionar sessionKey, tokens
10. ui/src/lib/theme.ts            ← Mover AGENTS para server
11. ui/src/App.tsx                 ← BridgeIndicator
12. ui/src/components/StatusBar.tsx ← Bridge status + tokens
13. ui/src/App.css                 ← Deletar
```

---

## 8. Decisões Arquiteturais

### Decisão 1: AG Dev como Plugin vs Standalone

**Recomendação: Standalone PRIMEIRO, Plugin DEPOIS (Sprint 4)**

Motivo: Como standalone (Express server que conecta ao gateway via WS), funciona HOJE. Plugin requer conhecer o sistema de plugins do Clawdbot em profundidade. Fazemos funcionar standalone, depois empacotamos como plugin.

### Decisão 2: AGENTS hardcoded vs dinâmicos

**Recomendação: Dinâmicos vindo do server**

O array de 12 agentes em `theme.ts` deve migrar para o server. O endpoint `/api/agents` já lê os `.md` files. Basta retornar `{ agents, squads }` com metadata suficiente para a UI renderizar. Theme mantém apenas cores/helpers.

### Decisão 3: State.json local vs Clawdbot como source of truth

**Recomendação: Clawdbot é source of truth. State.json é cache + UI prefs.**

- `state.agents[id].status` → vem do Clawdbot (session status)
- `state.agents[id].checklist` → pode ser AG Dev local (UI-driven)
- `strategy.directives` → AG Dev local (esses SÃO do AG Dev)
- `chat.messages` → vem do Clawdbot (session history)

### Decisão 4: 12 agentes fixos vs N agentes configuráveis

**Recomendação: N configuráveis**

Os 12 são um bom default ("full team"), mas qualquer projeto pode precisar de 3, 5, ou 20 agentes. O sistema deve:
1. Ler quantos `.md` existem em `core/agents/`
2. Permitir adicionar/remover via UI (Sprint 5)
3. Squads são opcionais — se não definidos, todos ficam em "default"

---

## 9. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Arquivos totais analisados** | 32 (server: 4, UI: 22, core: 6 categorias) |
| **✅ FICA sem mudança** | 11 (Sparkline, index.css, main.tsx, uiStore, etc) |
| **🔧 AJUSTAR** | 16 (server.js, bridge, views, hooks, stores) |
| **🔴 REMOVER** | 3 (App.css, state fake, /api/exec inseguro) |
| **🆕 NOVO** | 12 items (3 views, 4 componentes, 5+ endpoints) |
| **Sprints estimados** | 5 |
| **Sprint 1 (crítico)** | 10 tarefas — transforma demo em ferramenta real |

**A transformação central é uma:** fazer o AG Dev FALAR com o Clawdbot de verdade. Hoje é uma UI linda que mostra dados estáticos. Depois do Sprint 1, será uma UI linda que CONTROLA agentes reais.

---

*AG Dev Análise & Ajustes v2.0 — 2026-02-01*
*Baseado em: código-fonte completo + Design Spec v2.0 + Capability Map + OpenClaw docs*

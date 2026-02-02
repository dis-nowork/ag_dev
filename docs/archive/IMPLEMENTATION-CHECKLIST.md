# AG Dev — Implementation Checklist v2
*Baseado no DESIGN-SPEC v1.0 + Council Review v2.0*

## Fase 1 — Foundation ✅ COMPLETA

### 1.1 Dependencies & Architecture
- ✅ Instalar: zustand, @xyflow/react, recharts, cmdk, @monaco-editor/react
- ✅ Estrutura: `components/`, `stores/`, `hooks/`, `views/`, `lib/`
- ✅ Design tokens em `lib/theme.ts` (cores, tipografia, motion, squads)
- ✅ Zustand stores: `agentStore`, `uiStore`, `chatStore`

### 1.2 Cockpit View (Home)
- ✅ Agent cards em grid por squad (small multiples — Tufte)
- ✅ Squad grouping: Builders 🏗️, Thinkers 🧠, Guardians 🛡️, Creators 🎨
- ✅ Cada card: nome, status dot (pulsante), sparkline, task, progress bar
- ✅ Consent bar no topo + Status bar no footer
- ✅ SSE connection + polling para live updates

### 1.3 Command Palette (⌘K) + Keyboard
- ✅ cmdk integrado com busca de agentes, views, ações
- ✅ Atalhos: ⌘K search, ⌘J chat, 1-6 views, Escape back

## Fase 2 — Interaction ✅ COMPLETA

### 2.1 Agent Focus View
- ✅ Split view: contexto + output/código
- ✅ "Thinking out loud" panel
- ✅ Checklist + progress bar + sparkline
- ✅ Ações: Pause, Resume, Restart, Chat

### 2.2 Chat Flutuante (⌘J)
- ✅ Overlay com selector de agente
- ✅ Integração com `/api/chat`

### 2.3 Pipeline View (Kanban)
- ✅ 4 colunas com task cards por agente
- ✅ Badge de squad + métricas

## Fase 3 — Intelligence ✅ COMPLETA

### 3.1 Emergence Map
- ✅ Grafo Project → Squads → Agentes (React Flow)
- ✅ Animated edges para agentes ativos
- ✅ Collaboration lines + Pattern insights

## Fase 4 — Council Review v2 ✅ COMPLETA

### 4.1 Terminal View (Sessão do Agente) — NEW
- ✅ Stream de tool calls via SSE por agente
- ✅ Timeline com timestamp, tipo (exec/write/thinking/error)
- ✅ Inject Command: enviar mensagem pra session do agente
- ✅ Ações: Pause, Resume, Redirect, Clear
- ✅ Auto-scroll + cursor pulsante

### 4.2 Gantt Dinâmico — NEW
- ✅ Timeline com barras por agente (10 tasks do workflow AIOS)
- ✅ Progress bars animadas dentro de cada barra
- ✅ Status: done/active/waiting/blocked com cores
- ✅ Inline directive editor: click na task → editar prompt
- ✅ Critical path calculado automaticamente
- ✅ Dependency chain visual
- ✅ Métricas: ETA, blocked count

### 4.3 Strategy Canvas (Controle de Direcionamento) — NEW
- ✅ Project Vision editável
- ✅ Agent Directives: prompt individual por agente
- ✅ Edit inline + Save & Apply
- ✅ Directive history (últimas 10 versões) com restore
- ✅ Guardrails globais (regras para todos os agentes)
- ✅ Persistência em `strategy.json`

### 4.4 Server APIs — NEW
- ✅ `GET /api/strategy` + `POST /api/strategy`
- ✅ `POST /api/agents/:id/directive`
- ✅ `GET /api/agents/:id/stream` (SSE terminal)
- ✅ `POST /api/agents/:id/inject`

## Fase 5 — OpenClaw Integration ⬜ TODO

### 5.1 Plugin Architecture
- ⬜ `clawdbot.plugin.json` manifest
- ⬜ Gateway RPC methods registration
- ⬜ Agent tools registration
- ⬜ Plugin hooks (lifecycle events)

### 5.2 Real Agent Sessions
- ⬜ Each AIOS agent → Clawdbot session via `sessions_spawn`
- ⬜ Terminal view → real lifecycle event stream
- ⬜ Inject → real `sessions_send` to agent session
- ⬜ Strategy directives → injected into agent system prompt

### 5.3 Mermaid Diagrams
- ⬜ Auto-generate flowchart from code
- ⬜ Auto-generate ERD from schemas
- ⬜ Live updates via hooks
- ⬜ Export SVG/PNG

### 5.4 Project Initialization
- ⬜ `ag-dev init` → scan project + configure agents
- ⬜ Greenfield vs Brownfield templates
- ⬜ Multi-project support

---
**Progresso: ~85% das features implementadas**
**9 views: Cockpit, Agent Focus, Pipeline, Gantt, Emergence, Terminal, Strategy + Chat Float + Command Palette**
**URL: https://ubuntu-8gb-nbg1-1.taila69746.ts.net**

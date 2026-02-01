# AG Dev — Master Checklist
## Execução Completa: De Demo → Armadura Funcional

---

## Sprint 1 — Integração Real 🔴 CRÍTICO

### Backend & Bridge
- [x] 1.1 Reescrever handshake bridge (protocolo v3 real)
- [x] 1.2 Implementar `POST /api/agents/:id/spawn` com sessions_spawn
- [x] 1.3 Implementar `POST /api/agents/:id/send` via bridge
- [x] 1.4 Implementar `GET /api/agents/:id/history` via bridge
- [x] 1.5 Implementar `GET /api/agents/meta` (agents + squads do server)
- [x] 1.6 Implementar `GET /api/gateway/status` (proxy bridge)
- [x] 1.7 Implementar `POST /api/agents/batch` (pause-all, resume-all)
- [x] 1.8 Fix segurança: sanitizar git commit (execFileSync)
- [x] 1.9 Fix segurança: proteger `/api/exec` com auth
- [x] 1.10 Auth middleware (bearer token) em rotas POST
- [x] 1.11 Rotear `/api/chat` POST → bridge.sendMessage()
- [x] 1.12 Rotear `/api/agents/:id/inject` → bridge.sendToSession()
- [x] 1.13 Lifecycle events bridge → SSE per-agent stream
- [x] 1.14 Limpar config.json (genérico + gateway config)
- [x] 1.15 Limpar state.json (remover dados Phantom ID)

### Frontend
- [x] 1.16 Deletar App.css (lixo Vite)
- [x] 1.17 agentStore: adicionar sessionKey, model, tokens
- [x] 1.18 Criar bridgeStore (integrado no agentStore)
- [x] 1.19 useSSE: handlers para clawdbot_event, agent_stream, bridge_status
- [x] 1.20 useKeyboard: fix shortcuts 1-6 alinhados com NAV_ITEMS
- [x] 1.21 ChatFloat: rotear para `/api/bridge/send`
- [x] 1.22 StatusBar: indicador bridge 🟢/🔴 + tokens
- [x] 1.23 ConsentBar: handlers approve/dismiss funcionais
- [x] 1.24 TerminalView: inject → `/api/agents/:id/send`
- [x] 1.25 App.tsx: BridgeIndicator no header
- [x] 1.26 Criar Toast.tsx + toastStore.ts
- [x] 1.27 Criar AgentSpawnDialog.tsx
- [x] 1.28 theme.ts: marcar AGENTS como defaults (server é source)

### Build & Deploy
- [x] 1.29 TypeScript compila sem erros
- [x] 1.30 Vite build produção OK
- [x] 1.31 Server syntax válida
- [x] 1.32 ui-dist atualizado com novo build

**Sprint 1: ✅ 32/32 COMPLETO**

---

## Sprint 2 — Polimento & Features

- [ ] 2.1 DocsView com Monaco editor inline
- [ ] 2.2 Drag-and-drop no PipelineView
- [ ] 2.3 TokenCounter na StatusBar + per-agent
- [ ] 2.4 ConsentBar com approve/deny funcional (detalhes)
- [ ] 2.5 AgentSpawnDialog: model selector, preview do prompt
- [ ] 2.6 Fix keyboard shortcuts completo
- [ ] 2.7 Agent definition reformatter (.md → system prompt format)

---

## Sprint 3 — Visualização Avançada

- [ ] 3.1 DiagramsView com renderização Mermaid
- [ ] 3.2 Dependency arrows no GanttView (SVG)
- [ ] 3.3 Auto-layout no EmergenceView (dagre/elkjs)
- [ ] 3.4 LogsView (gateway logs filtráveis)
- [ ] 3.5 GanttView configurável (workflow não-hardcoded)
- [ ] 3.6 Strategy "Preview Impact"
- [ ] 3.7 Time Scrubber (rebobinar estado)

---

## Sprint 4 — Plugin Clawdbot

- [ ] 4.1 clawdbot.plugin.json manifest
- [ ] 4.2 Entry point TypeScript do plugin
- [ ] 4.3 Hooks de lifecycle (before_agent_start, agent_end)
- [ ] 4.4 Directive injection via hook no system prompt
- [ ] 4.5 `clawdbot plugins install ag-dev` workflow
- [ ] 4.6 `clawdbot dev` CLI command → abre AG Dev

---

## Sprint 5 — Projeto-Agnóstico

- [ ] 5.1 `ag-dev init` wizard de setup
- [ ] 5.2 Agent definitions configuráveis (N agentes, não 12 fixos)
- [ ] 5.3 Project templates (API, SaaS, mobile)
- [ ] 5.4 Brownfield scanner (analisa codebase existente)
- [ ] 5.5 Multi-project switcher
- [ ] 5.6 Squad customization (criar/editar squads na UI)

---

*Total: 58 tarefas | Sprint 1: ✅ 32/32 | Sprint 2-5: 26 pendentes*
*Status: Sprint 1 COMPLETO — pronto para Sprint 2*

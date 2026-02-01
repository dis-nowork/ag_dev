# AG Dev — Análise Completa e Direcionamento de Ajustes

> **Documento:** Análise elemento-por-elemento da aplicação atual + direcionamento de cada ajuste
> **Autores:** Time Design-Spec (após leitura do Design-Spec v2.0, OpenClaw Capability Map, e revisão completa do código)
> **Data:** 01/02/2026
> **Regra:** Este documento é o blueprint. Nenhum código será alterado sem estar aqui.

---

## 0. PRINCÍPIOS GUIA

### Elliot Jaques — Work Levels 5-6
- **Nível 5:** Pensamento sistêmico — ver a organização inteira como sistema, prever efeitos colaterais, criar frameworks
- **Nível 6:** Pensamento conceitual-abstrato — criar modelos novos que não existiam, enxergar padrões emergentes, transformar paradigmas

O AG Dev opera no Nível 6: não é um dashboard de tarefas. É um **framework de cognição aumentada** onde o humano pensa no nível estratégico e os agentes executam. A metáfora "Armadura do Homem de Ferro" é precisa — o sistema amplifica a capacidade do operador, não a substitui.

### Bret Victor — Manipulação Direta
Cada dado visível deve ser **editável onde está**. Ver e agir no mesmo lugar.

### Edward Tufte — Densidade de Informação
Mais dados por pixel. Nada decorativo. Cada pixel informa.

### Don Norman — Feedback Loops
O usuário SEMPRE sabe o que está acontecendo. Sem silêncios. Sem estados ambíguos.

### Dieter Rams — Mínimo Necessário
Menos, mas melhor. Cada feature que não existe é uma feature que não confunde.

---

## 1. DIAGNÓSTICO: O QUE EXISTE HOJE

### Arquitetura Atual
```
ag_dev/
├── ui/src/                          # React + Vite + TypeScript
│   ├── App.tsx                      # Router (120 linhas) ✅ BEM ESTRUTURADO
│   ├── views/ (7 views)             # Cockpit, Agent, Pipeline, Emergence, Gantt, Strategy, Terminal
│   ├── components/ (6 componentes)  # AgentCard, ChatFloat, CommandPalette, ConsentBar, Sparkline, StatusBar
│   ├── stores/ (3 stores Zustand)   # agentStore, chatStore, uiStore
│   ├── hooks/ (2 hooks)             # useSSE, useKeyboard
│   └── lib/theme.ts                 # Design tokens + agent/squad definitions
│
├── server/
│   ├── server.js                    # Express (370 linhas) — API + SSE + state
│   ├── ws-bridge.js                 # WebSocket bridge para Clawdbot Gateway
│   └── state.json                   # Persistência in-memory
│
├── core/                            # AIOS definitions
│   ├── agents/ (12 .md)             # Definições dos 12 agentes
│   ├── tasks/ (150+ .md)            # Definições de tasks
│   ├── workflows/ (9 .yaml)         # Workflows greenfield/brownfield
│   ├── teams/ (5 .yaml)             # Composições de equipe
│   ├── checklists/ (15 .md)         # Checklists de qualidade
│   └── templates/ (80+ files)       # Templates de documentos
│
└── config.json                      # projectRoot, port, name
```

### Pontos Fortes (MANTER)
- ✅ **Componentização** — código bem separado em views/components/stores/hooks
- ✅ **Zustand stores** — state management limpo e reativo
- ✅ **Squad system** — agrupamento cognitivo (Builders/Thinkers/Guardians/Creators)
- ✅ **SSE + Polling** — comunicação real-time funcional
- ✅ **ws-bridge.js** — ponte para Clawdbot Gateway já estruturada
- ✅ **Design tokens** — cores, squads, agentes centralizados em theme.ts
- ✅ **Command Palette** — Ctrl+K com cmdk
- ✅ **Keyboard shortcuts** — navegação por teclado
- ✅ **Agent stream endpoint** — SSE per-agent para terminal
- ✅ **Strategy API** — vision/guardrails/directives com persistência e histórico
- ✅ **Timeline event log** — rastreamento de eventos

### Pontos Fracos (CORRIGIR)
- ❌ **Chat não conecta ao Gateway de verdade** — POST /api/chat só salva local, não chega no Clawdbot
- ❌ **Agentes não executam de verdade** — state é manual, não reflete sessions_spawn reais
- ❌ **Terminal View não mostra output real** — SSE do agent stream não tem dados reais do agent loop
- ❌ **Emergence Map estático** — relações são inferidas do squad, não de atividade real
- ❌ **Sparklines são fake** — dados gerados com Math.random() quando não há histórico
- ❌ **ConsentBar não conecta** — mostra UI mas não tem sistema de aprovação real
- ❌ **Sem auth** — qualquer pessoa com URL acessa
- ❌ **state.json frágil** — perde dados em crash
- ❌ **Sem Mermaid diagrams** — mencionado no spec mas não implementado
- ❌ **Sem Browser View** — mencionado no capability map mas não existe
- ❌ **Sem Docs/Files views** — existe no Phantom ID command-center mas não no ag_dev
- ❌ **Git view ausente** — existe no Phantom ID mas não aqui

---

## 2. DECISÕES ARQUITETURAIS

### 2.1 SSE → WebSocket (MANTER SSE)

**Decisão: MANTER SSE + adicionar WebSocket apenas para o bridge.**

Justificativa:
- SSE funciona bem para UI updates unidirecionais (server→client)
- O Chat e Agent Commands já usam POST (client→server)
- WebSocket é necessário APENAS para o bridge com Clawdbot Gateway (já existe no ws-bridge.js)
- Adicionar socket.io no frontend aumenta bundle e complexidade sem ganho real

### 2.2 state.json → SQLite

**Decisão: NÃO migrar para SQLite agora.**

Justificativa:
- O AG Dev é uma ferramenta de desenvolvimento local, não um servidor de produção
- state.json é suficiente para o caso de uso (12 agentes, poucos KB de dados)
- Adicionar melhor: save com write-ahead (backup antes de salvar) e recovery

**Ação:** Adicionar `saveState()` com try/catch + backup file.

### 2.3 Plugin System

**Decisão: AG Dev DEVE se tornar um Clawdbot Plugin no futuro, mas NÃO agora.**

Justificativa:
- Prioridade é fazer funcionar end-to-end com o Gateway atual
- Plugin system requer `clawdbot.plugin.json` + registro no gateway — próxima fase
- Hoje o ws-bridge.js já faz a ponte — basta completar a integração

---

## 3. ANÁLISE E AJUSTE: CADA ARQUIVO

### 3.1 `ui/src/App.tsx` (120 linhas)

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Header bar | ✅ FICA | Sem alterações |
| Nav tabs (6 views) | 🔧 AJUSTAR | Adicionar item "Docs" (view 7) e "Diagrams" (view 8) |
| Search trigger (⌘K) | ✅ FICA | OK |
| ConsentBar | ✅ FICA | Integrar com Gateway (ver componente) |
| Main content (AnimatePresence) | 🔧 AJUSTAR | Adicionar `DiagramsView` e `DocsView` |
| StatusBar | ✅ FICA | Adicionar token counter |
| ChatFloat | ✅ FICA | Integrar com Gateway |
| CommandPalette | ✅ FICA | Adicionar ações de Docs e Diagrams |

**Novos NAV_ITEMS a adicionar:**
```typescript
{ id: 'docs', label: 'Docs', icon: <FileText size={15} />, shortcut: '7' },
{ id: 'diagrams', label: 'Diagrams', icon: <GitBranch size={15} />, shortcut: '8' },
```

---

### 3.2 `ui/src/views/CockpitView.tsx` (67 linhas)

**Veredicto: ✅ FICA — é a view mais limpa e funcional.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Squad groups | ✅ FICA | OK — agrupamento cognitivo é o core |
| Squad header (icon, label, active count) | ✅ FICA | OK |
| Agent cards grid (2-4 cols) | ✅ FICA | OK |
| Default state fallback | ✅ FICA | OK |

**Adições:**
| Novo elemento | Justificativa | Onde |
|--------------|---------------|------|
| **Project Progress Bar** | Tufte: mostrar % geral do projeto no topo | Acima dos squads |
| **Quick Actions** | Bret Victor: ações diretas sem navegar | Abaixo do progress — botões "Start Next", "Pause All", "View Report" |
| **Last Activity Feed** | Norman: feedback loop — últimos 5 eventos | Sidebar direita ou abaixo dos squads |

---

### 3.3 `ui/src/views/AgentView.tsx` (232 linhas)

**Veredicto: 🔧 AJUSTAR — funcional mas precisa de integração real.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Back button + header | ✅ FICA | OK |
| Status badge | ✅ FICA | OK |
| Action buttons (Pause/Resume/Restart/Chat) | 🔧 AJUSTAR | **Restart** não faz nada — conectar ao Gateway. Adicionar **Kill** e **Redirect** |
| Left panel — Current Task | ✅ FICA | OK |
| Left panel — Thinking | 🔧 AJUSTAR | Conectar ao stream real do agent loop (lifecycle events `assistant.thinking`) |
| Left panel — Checklist | ✅ FICA | OK |
| Left panel — Activity Sparkline | 🔧 AJUSTAR | Conectar a dados reais (tokens/minuto ou events/minuto) |
| Right panel — Output | 🔧 AJUSTAR | Transformar em terminal mini (reutilizar lógica do TerminalView) |
| Right panel — Files Changed | ✅ FICA | OK — quando conectar ao Gateway, vai popular automaticamente |

**Adições:**
| Novo elemento | Justificativa | Onde |
|--------------|---------------|------|
| **Dependencies panel** | Nível 5: ver relações | Left panel, abaixo de Activity |
| **Artifacts list** | Tufte: output tangível | Left panel — lista de .md gerados pelo agente |
| **Token counter** | Tufte: custo real | Header, ao lado do status badge |
| **Time active** | Norman: feedback | Header — "Active for 4m 23s" |

---

### 3.4 `ui/src/views/PipelineView.tsx` (152 linhas)

**Veredicto: 🔧 AJUSTAR — precisa melhorar a derivação de tasks.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Kanban 4 colunas (Backlog/InProgress/Review/Done) | ✅ FICA | OK |
| Header com totais | ✅ FICA | OK |
| Task cards derivados de checklist | 🔧 AJUSTAR | Não mostra tasks dos agentes (currentTask), só checklist items |
| Velocity % | 🔧 AJUSTAR | Calcular velocity real (tasks/hora) não só % |

**Mudanças:**
- Incluir `currentTask` de cada agente como task card (não só checklist items)
- Adicionar drag-and-drop entre colunas (prioridade: BAIXA, melhorar interação futura)
- Adicionar mini sparkline dentro de cada card para mostrar atividade

---

### 3.5 `ui/src/views/EmergenceView.tsx` (190 linhas)

**Veredicto: 🔧 AJUSTAR — funcional mas relações são estáticas.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| ReactFlow graph | ✅ FICA | OK — @xyflow/react é a lib certa |
| Project center node | ✅ FICA | OK |
| Squad nodes | ✅ FICA | OK |
| Agent nodes | ✅ FICA | OK |
| Collaboration edges (entre ativos) | 🔧 AJUSTAR | Detectar colaboração REAL (agentes que tocam no mesmo arquivo, não só "ambos working") |
| Pattern insights footer | 🔧 AJUSTAR | Adicionar padrões mais ricos: "Analyst output → PM input", "Bottleneck: PM blocking 3 agents" |
| Background + Controls | ✅ FICA | OK |

**Adições:**
| Novo elemento | Justificativa | Onde |
|--------------|---------------|------|
| **Data flow edges** | Nível 6: ver como dados fluem entre agentes | Edges com labels "Brief → PRD → UX Spec" |
| **Bottleneck detection** | Nível 5: identificar gargalos | Highlight em vermelho do agente que bloqueia mais |
| **Time annotations** | Tufte: quando cada agente completou | Label no node com timestamp |

---

### 3.6 `ui/src/views/GanttView.tsx` (263 linhas)

**Veredicto: ✅ FICA — é uma das melhores views, quase completa.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Task rows com label + timeline | ✅ FICA | OK |
| Day headers | ✅ FICA | OK |
| Progress bars animados | ✅ FICA | OK |
| Status colors (done/active/waiting/blocked) | ✅ FICA | OK |
| Edit directive inline | ✅ FICA | Já conecta ao /api/agents/:id/directive |
| Critical path | ✅ FICA | OK |
| Dependency derivation (workflow array) | 🔧 AJUSTAR | Tornar configurável — hoje é hardcoded |

**Adições:**
| Novo elemento | Justificativa | Onde |
|--------------|---------------|------|
| **Drag bars** | Bret Victor: manipulação direta | Drag horizontal para ajustar duração |
| **Dependency arrows** | Tufte: relações visíveis | Linhas SVG de task→task |
| **Today marker** | Norman: orientação temporal | Linha vertical vermelha no dia atual |
| **Estimated vs Actual** | Nível 5: plano vs realidade | Barra fantasma mostrando estimativa original |

---

### 3.7 `ui/src/views/StrategyView.tsx` (289 linhas)

**Veredicto: ✅ FICA — é o coração do Nível 6. Melhor view conceitual.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Project Vision (textarea) | ✅ FICA | OK |
| Agent Directives (per-agent textareas) | ✅ FICA | OK |
| Edit/History/Reset por agente | ✅ FICA | OK |
| Guardrails (global rules) | ✅ FICA | OK |
| Apply Changes button | 🔧 AJUSTAR | Deve REALMENTE enviar directives aos agentes via sessions_send |
| Save para strategy.json | ✅ FICA | OK |

**Adições:**
| Novo elemento | Justificativa | Onde |
|--------------|---------------|------|
| **Preview Impact** | Nível 6: ver consequências antes de agir | Ao clicar "Apply", mostra: "Isso vai afetar: PM (re-generate PRD), UX (aguardar novo PRD)" |
| **Model selector per agent** | Capability Map: escolher modelo | Dropdown ao lado de cada agente: Claude Opus, Sonnet, Haiku |
| **Token budget per agent** | Rams: limites claros | Slider ou input de max tokens |

---

### 3.8 `ui/src/views/TerminalView.tsx` (285 linhas)

**Veredicto: 🔧 AJUSTAR — a estrutura é boa, mas precisa de dados reais.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Header com agent info | ✅ FICA | OK |
| Controls (Pause/Resume/Redirect/Clear) | ✅ FICA | Conectar Redirect ao gateway |
| Terminal output (font-mono, timestamped) | ✅ FICA | OK — design excelente |
| SSE per-agent stream | 🔧 AJUSTAR | Hoje só mostra state inicial — precisa conectar ao lifecycle stream real do Clawdbot |
| Command input ($) | ✅ FICA | Conectar inject ao sessions_send real |
| Type icons/colors | ✅ FICA | OK |
| Auto-scroll + cursor pulsante | ✅ FICA | OK |

**A integração crítica:**
```
Clawdbot Agent Loop emite lifecycle events:
  tool:start   → "🔧 exec: npm install"
  tool:end     → "✅ added 2 packages"
  assistant    → "💭 Pensando em como..."
  write        → "📝 src/auth.ts"
  error        → "❌ Command failed"

AG Dev precisa:
  1. ws-bridge.js subscribe ao lifecycle stream da session do agente
  2. server.js recebe os eventos e publica no SSE per-agent
  3. TerminalView.tsx mostra em tempo real
```

---

### 3.9 `ui/src/components/AgentCard.tsx` (108 linhas)

**Veredicto: ✅ FICA — design limpo e informativo.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| StatusDot (animado quando working) | ✅ FICA | OK |
| Icon + shortName | ✅ FICA | OK |
| Progress bar | ✅ FICA | OK |
| Current task text | ✅ FICA | OK |
| Sparkline | 🔧 AJUSTAR | Conectar a dados reais (hoje é fake) |

**Adições:**
| Novo elemento | Justificativa |
|--------------|---------------|
| **Token count mini** | "234 tok" — Tufte: custo visível |
| **Time active mini** | "4m" — Norman: feedback |

---

### 3.10 `ui/src/components/ChatFloat.tsx` (191 linhas)

**Veredicto: 🔧 AJUSTAR — precisa conectar ao Gateway de verdade.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Header com agent picker | ✅ FICA | OK — trocar entre Main Chat e per-agent |
| Message list | ✅ FICA | OK |
| Typing indicator | ✅ FICA | OK |
| Input + Send | ✅ FICA | OK |
| Agent picker dropdown | ✅ FICA | OK |

**Mudança crítica:**
O `send()` faz POST para `/api/chat` que apenas salva no state.json. Precisa:
1. POST `/api/chat` → server.js → ws-bridge → Clawdbot Gateway → sessions_send
2. Gateway responde → ws-bridge → server.js → SSE broadcast → ChatFloat mostra resposta
3. Para agent chat: POST `/api/agents/:id/chat` → ws-bridge → sessions_send(agentSessionKey)

---

### 3.11 `ui/src/components/CommandPalette.tsx` (132 linhas)

**Veredicto: ✅ FICA — excelente.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| cmdk integration | ✅ FICA | OK |
| Views group | 🔧 AJUSTAR | Adicionar "Docs" e "Diagrams" |
| Agents group | ✅ FICA | OK |
| Actions group | 🔧 AJUSTAR | Adicionar: "Generate Mermaid", "Export Report", "Connect Gateway" |
| Shortcut hints | ✅ FICA | OK |

---

### 3.12 `ui/src/components/ConsentBar.tsx` (45 linhas)

**Veredicto: 🔧 AJUSTAR — estrutura OK, precisa de dados reais.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| Pending count | 🔧 AJUSTAR | Conectar ao hook system do Clawdbot (`before_tool_call` que requer aprovação) |
| Approve all / Dismiss | 🔧 AJUSTAR | Conectar ao Gateway — approve/deny de exec commands |

**Integração necessária:**
- Clawdbot hooks `before_tool_call` podem require approval
- ws-bridge recebe o pedido → server.js → SSE → ConsentBar mostra
- Usuário clica Approve → server.js → ws-bridge → Gateway aprova

---

### 3.13 `ui/src/components/StatusBar.tsx` (62 linhas)

**Veredicto: 🔧 AJUSTAR — adicionar métricas reais.**

| Elemento | Veredicto | Ação |
|----------|-----------|------|
| View label | ✅ FICA | OK |
| Project name | ✅ FICA | OK |
| Active/error/done counts | ✅ FICA | OK |
| Tasks counter | ✅ FICA | OK |
| ⌘K hint | ✅ FICA | OK |

**Adições:**
| Novo elemento | Justificativa |
|--------------|---------------|
| **Gateway status** | "🟢 Connected" ou "🔴 Offline" |
| **Total tokens** | "1.2K tok" — custo acumulado |
| **Uptime** | "Running for 2h 15m" |
| **Chat toggle** | "💬" botão para abrir chat rápido |

---

### 3.14 `ui/src/components/Sparkline.tsx` (51 linhas)

**Veredicto: ✅ FICA — SVG puro, leve e bonito.**

Sem alterações.

---

### 3.15 `ui/src/stores/agentStore.ts` (65 linhas)

**Veredicto: 🔧 AJUSTAR — adicionar campos.**

| Campo | Veredicto | Ação |
|-------|-----------|------|
| agents: Record<string, AgentState> | ✅ FICA | OK |
| pendingActions | ✅ FICA | Conectar ao ConsentBar real |
| projectName / totalTasks / completedTasks | ✅ FICA | OK |

**Novos campos no AgentState:**
```typescript
interface AgentState {
  // Existentes (manter):
  status, currentTask, checklist, progress, output, thinking, filesChanged, activityHistory
  
  // Novos (adicionar):
  sessionKey?: string           // Clawdbot session key do agente
  tokensUsed?: number           // Total de tokens consumidos
  startedAt?: number            // Timestamp de quando começou a trabalhar
  completedAt?: number          // Timestamp de quando completou
  model?: string                // Modelo em uso (opus, sonnet, haiku)
  artifacts?: string[]          // Arquivos gerados (/docs/project-brief.md)
  dependencies?: string[]       // IDs de agentes que este depende
  blockedBy?: string[]          // IDs de agentes que bloqueiam este
  errorMessage?: string         // Detalhe do erro (quando status = error)
}
```

---

### 3.16 `ui/src/stores/chatStore.ts` (34 linhas)

**Veredicto: ✅ FICA — simples e funcional.**

**Adição:** campo `agentId` por mensagem já existe. Adicionar:
```typescript
interface ChatMessage {
  // Existentes (manter)
  id, from, agentId, text, timestamp
  
  // Novos
  markdown?: boolean    // Se true, renderizar como markdown
  tools?: string[]      // Tools usadas na resposta (exec, write, etc)
}
```

---

### 3.17 `ui/src/stores/uiStore.ts` (48 linhas)

**Veredicto: 🔧 AJUSTAR — adicionar novas views.**

```typescript
// Mudar ViewId para incluir novas views:
export type ViewId = 'cockpit' | 'agent' | 'pipeline' | 'emergence' | 'terminal' | 'gantt' | 'strategy' | 'docs' | 'diagrams'
```

---

### 3.18 `ui/src/hooks/useSSE.ts` (67 linhas)

**Veredicto: ✅ FICA — funcional.**

**Adição:** Handler para novos event types:
```typescript
// Novos handlers no onmessage:
if (data.type === 'bridge_status') { /* atualizar gateway status na StatusBar */ }
if (data.type === 'consent_request') { /* incrementar pendingActions */ }
if (data.type === 'token_update') { /* atualizar tokensUsed por agente */ }
```

---

### 3.19 `ui/src/hooks/useKeyboard.ts` (48 linhas)

**Veredicto: 🔧 AJUSTAR — adicionar atalhos para novas views.**

```typescript
// Adicionar:
if (e.key === '7') { setView('docs'); return }
if (e.key === '8') { setView('diagrams'); return }
```

Atualmente os atalhos estão errados:
- `2` faz agent (deveria ser pipeline conforme NAV_ITEMS) 
- `3` faz pipeline (deveria ser gantt)
- `4` faz emergence

**Corrigir para alinhar com NAV_ITEMS:**
1=cockpit, 2=pipeline, 3=gantt, 4=emergence, 5=strategy, 6=terminal, 7=docs, 8=diagrams

---

### 3.20 `ui/src/lib/theme.ts` (90 linhas)

**Veredicto: ✅ FICA — excelente centralização.**

**Adições:**
```typescript
// Adicionar ao colors:
colors.gateway = {
  connected: '#10B981',
  disconnected: '#EF4444',
  connecting: '#EAB308',
}
```

---

### 3.21 `server/server.js` (370 linhas)

**Veredicto: 🔧 AJUSTAR — estrutura OK, precisa completar integrações.**

| Endpoint/Feature | Veredicto | Ação |
|-----------------|-----------|------|
| Config loading | ✅ FICA | OK |
| State management (load/save) | 🔧 AJUSTAR | Adicionar backup file antes de save |
| SSE broadcasting | ✅ FICA | OK |
| GET /api/project | ✅ FICA | OK |
| GET /api/agents | ✅ FICA | OK |
| POST /api/agents/:id/state | ✅ FICA | OK |
| POST /api/agents/:id/pause | 🔧 AJUSTAR | Também enviar pause pro Gateway via bridge |
| POST /api/agents/:id/resume | 🔧 AJUSTAR | Idem |
| GET /api/agents/:id/definition | ✅ FICA | OK |
| GET/POST /api/chat | 🔧 AJUSTAR | POST deve enviar pro Gateway via bridge, não só salvar local |
| POST /api/chat/bot | ✅ FICA | OK — bridge já pusha respostas aqui |
| GET/POST /api/agents/:id/chat | 🔧 AJUSTAR | POST deve enviar pro Gateway via sessions_send |
| GET/POST /api/docs | ✅ FICA | OK |
| GET /api/tree | ✅ FICA | OK |
| POST /api/git/commit | 🔧 AJUSTAR | Sanitizar message (command injection) |
| GET /api/git/status | ✅ FICA | OK |
| GET /api/timeline | ✅ FICA | OK |
| GET /api/workflows | ✅ FICA | OK |
| GET /api/teams | ✅ FICA | OK |
| GET /api/health | ✅ FICA | OK |
| Bridge integration | 🔧 AJUSTAR | Completar onAgentReply para popular terminal streams |
| GET /api/bridge/status | ✅ FICA | OK |
| POST /api/bridge/send | 🔧 AJUSTAR | Completar integração |
| POST /api/exec | ⚠️ RISCO | Sem auth, qualquer um executa comandos. Adicionar middleware auth |
| GET/POST /api/strategy | ✅ FICA | OK |
| POST /api/agents/:id/directive | ✅ FICA | OK |
| GET /api/agents/:id/stream | ✅ FICA | Conectar ao lifecycle real |
| POST /api/agents/:id/inject | 🔧 AJUSTAR | Enviar pro Gateway via sessions_send |
| GET /api/state | ✅ FICA | OK |

**Novos endpoints:**
| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/agents/:id/start` | POST | Iniciar agente — sessions_spawn no Gateway |
| `/api/agents/:id/kill` | POST | Matar agente — encerrar session no Gateway |
| `/api/agents/:id/redirect` | POST | Mudar task — sessions_send com novo direcionamento |
| `/api/agents/:id/artifacts` | GET | Listar arquivos que o agente gerou |
| `/api/gateway/connect` | POST | Forçar reconexão do ws-bridge |
| `/api/gateway/status` | GET | Status detalhado do gateway |
| `/api/diagrams/generate` | POST | Gerar diagrama Mermaid do codebase |

**Segurança a adicionar:**
```javascript
// Middleware auth simples — token no .env
const AUTH_TOKEN = process.env.AG_DEV_TOKEN;
function authMiddleware(req, res, next) {
  if (!AUTH_TOKEN) return next(); // Dev mode: sem auth
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
// Aplicar em endpoints de escrita:
app.post('/api/exec', authMiddleware, ...);
app.post('/api/git/commit', authMiddleware, ...);
app.post('/api/docs/save', authMiddleware, ...);
```

---

### 3.22 `server/ws-bridge.js` (150 linhas)

**Veredicto: 🔧 AJUSTAR — estrutura excelente, precisa completar handlers.**

| Feature | Veredicto | Ação |
|---------|-----------|------|
| Connect frame | ✅ FICA | OK |
| Auto-reconnect | ✅ FICA | OK |
| Token detection | ✅ FICA | OK |
| sendMessage (main) | ✅ FICA | OK |
| sendToSession | ✅ FICA | OK |
| onAgentReply (delta/complete) | 🔧 AJUSTAR | Completar para popular terminal view |
| Pending requests (timeout) | ✅ FICA | OK |

**Completar a integração:**

```javascript
// No _handleMessage, adicionar handlers para:

// 1. Lifecycle events do agent loop (para Terminal View)
if (msg.type === 'event' && msg.event === 'agent') {
  const p = msg.payload;
  
  // Tool call events
  if (p.stream === 'tool' && p.phase === 'start') {
    this.onToolEvent({ type: 'exec', tool: p.tool, args: p.args, agentId: p.agentId });
  }
  if (p.stream === 'tool' && p.phase === 'end') {
    this.onToolEvent({ type: 'result', tool: p.tool, result: p.result, agentId: p.agentId });
  }
  
  // Thinking stream
  if (p.stream === 'assistant' && p.thinking) {
    this.onThinking({ agentId: p.agentId, text: p.thinking });
  }
}

// 2. Consent requests (para ConsentBar)
if (msg.type === 'event' && msg.event === 'consent_request') {
  this.onConsentRequest(msg.payload);
}
```

---

### 3.23 `config.json`

**Veredicto: 🔧 AJUSTAR — expandir.**

```json
{
  "projectRoot": "/path/to/project",
  "port": 3000,
  "name": "Project Name",
  "gateway": {
    "url": "ws://127.0.0.1:18789",
    "autoConnect": true
  },
  "auth": {
    "token": null
  },
  "ui": {
    "defaultView": "cockpit",
    "showDocs": true,
    "showDiagrams": true
  }
}
```

---

## 4. NOVAS VIEWS A CRIAR

### 4.1 DocsView (NOVA)

**Rota:** view `docs` (key 7)
**Baseado em:** capability map — Read/Write/Edit tools expostos visualmente

| Elemento | Descrição |
|----------|-----------|
| Sidebar com categorias | docs/, brainstorm/, stories/ — colapsável |
| Document list | Nome, tamanho, data, agente que gerou |
| Markdown viewer | react-markdown + syntax highlighting |
| Editor | Textarea com syntax highlight (futuro: CodeMirror) |
| Save button | Auto-commit git após salvar |
| Create/Delete | Botões para criar novo doc ou deletar |

**Endpoints já existem:** GET /api/docs, GET /api/docs/read, POST /api/docs/save

---

### 4.2 DiagramsView (NOVA)

**Rota:** view `diagrams` (key 8)
**Baseado em:** Design Spec v2.0 — View 8: Mermaid Diagrams

| Elemento | Descrição |
|----------|-----------|
| Diagram tabs | Flow, ERD, Sequence, Architecture, Agent Flow |
| Mermaid renderer | Usar mermaid.js no browser |
| Auto-generate button | POST /api/diagrams/generate — analisa codebase |
| Edit Mermaid source | Textarea para editar o source do diagrama |
| Export | SVG/PNG download |
| Live updates | Quando agente muda um schema/route, regerar |

**Lib necessária:** `mermaid` (npm) — renderiza no browser, não precisa de mmdc server-side.

---

## 5. INTEGRAÇÃO REAL COM CLAWDBOT

### 5.1 Fluxo: Usuário envia mensagem no Chat

```
1. User digita no ChatFloat → send()
2. POST /api/chat { message, agentId }
3. server.js → salva local + envia via bridge
4. bridge.sendToSession(sessionKey, message) → Clawdbot Gateway
5. Gateway → Agent Loop processa
6. Agent Loop emite lifecycle events → Gateway → ws-bridge
7. ws-bridge → onAgentReply → server.js → broadcast SSE
8. ChatFloat recebe via useSSE → mostra resposta
```

### 5.2 Fluxo: Iniciar um agente

```
1. User clica "Start" no AgentView
2. POST /api/agents/:id/start { task, directive }
3. server.js → bridge.sendMessage("sessions_spawn: task=..., label=agent-{id}")
   OU diretamente: bridge call sessions_spawn via Gateway RPC
4. Gateway → sessions_spawn → nova session isolada
5. Sub-agent começa a trabalhar
6. Lifecycle events fluem: tool/assistant/lifecycle → ws-bridge → SSE → Terminal/Agent views
7. Sub-agent completa → lifecycle:end → bridge → server.js → updateAgent(done)
```

### 5.3 Fluxo: Inject command no Terminal

```
1. User digita comando no TerminalView input
2. POST /api/agents/:id/inject { message }
3. server.js → bridge.sendToSession(agent.sessionKey, message)
4. Clawdbot recebe como user message na session do agente
5. Agente processa e responde
6. Lifecycle events → ws-bridge → SSE → TerminalView mostra output
```

### 5.4 Fluxo: Consent/Approval

```
1. Agente tenta executar comando perigoso (rm, etc)
2. Clawdbot hook before_tool_call → require approval
3. Gateway emite consent_request event → ws-bridge
4. ws-bridge → server.js → broadcast SSE {type: 'consent_request'}
5. ConsentBar incrementa pendingActions, mostra detalhes
6. User clica "Approve" → POST /api/consent/approve
7. server.js → bridge → Gateway aprova → agente continua
```

---

## 6. O QUE SAI (REMOVER)

| Item | Motivo |
|------|--------|
| Dados fake nas sparklines (`Math.random()`) | Substituir por dados reais ou array zerado |
| Restart button que não faz nada | Conectar ao Gateway ou remover |
| `Pause All` / `Resume All` na CommandPalette (sem endpoint) | Criar endpoints ou remover |
| Keyboard shortcut `2` para agent view | Corrigir para alinhar com NAV_ITEMS |

---

## 7. PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Sprint 1: Gateway Integration (Prioridade MÁXIMA)
1. [ ] Completar ws-bridge.js — handlers de lifecycle events
2. [ ] POST /api/chat → enviar pro Gateway via bridge
3. [ ] POST /api/agents/:id/chat → enviar pro Gateway via bridge.sendToSession
4. [ ] POST /api/agents/:id/inject → enviar pro Gateway via bridge.sendToSession
5. [ ] POST /api/agents/:id/start → sessions_spawn no Gateway
6. [ ] POST /api/agents/:id/kill → encerrar session no Gateway
7. [ ] Terminal view populada com lifecycle events reais
8. [ ] ChatFloat recebendo respostas reais do Clawdbot

### Sprint 2: Data Quality
9. [ ] Sparklines com dados reais (tokens/minuto ou events/minuto)
10. [ ] Token counter por agente no AgentState
11. [ ] Time active tracking (startedAt/completedAt)
12. [ ] Gateway status na StatusBar
13. [ ] ConsentBar conectada ao hook system

### Sprint 3: New Views
14. [ ] DocsView — viewer + editor de documentos do projeto
15. [ ] DiagramsView — renderer Mermaid com auto-generate
16. [ ] Adicionar items no nav e command palette

### Sprint 4: UX Polish
17. [ ] Project Progress Bar no CockpitView
18. [ ] Quick Actions no CockpitView
19. [ ] Last Activity Feed no CockpitView
20. [ ] Dependencies panel no AgentView
21. [ ] Artifacts list no AgentView
22. [ ] Today marker no GanttView
23. [ ] Dependency arrows no GanttView
24. [ ] Preview Impact na StrategyView
25. [ ] Model selector per agent na StrategyView
26. [ ] Bottleneck detection no EmergenceView
27. [ ] Data flow edges no EmergenceView

### Sprint 5: Security & Robustness
28. [ ] Auth middleware (token no .env)
29. [ ] Sanitizar git commit message (command injection)
30. [ ] Backup antes de saveState()
31. [ ] Corrigir keyboard shortcuts (alinhar com NAV_ITEMS)
32. [ ] Remover fake data das sparklines

### Sprint 6: Plugin Packaging (Futuro)
33. [ ] clawdbot.plugin.json manifest
34. [ ] Gateway RPC methods registrados
35. [ ] `clawdbot dev` command → abre AG Dev
36. [ ] `ag-dev init` → configura AIOS para qualquer projeto
37. [ ] Template system por tipo de projeto

---

## 8. CHECKLIST FINAL — CADA ELEMENTO

### LAYOUT / SHELL
- [ ] Adicionar nav items: Docs (7), Diagrams (8)
- [ ] Gateway status indicator no header
- [ ] Chat toggle button na StatusBar
- [ ] Token counter total na StatusBar
- [ ] Uptime na StatusBar

### COCKPIT VIEW
- [ ] Project Progress Bar (% geral)
- [ ] Quick Actions (Start Next, Pause All, View Report)
- [ ] Last Activity Feed (últimos 5 eventos)

### AGENT VIEW
- [ ] Conectar Restart ao Gateway
- [ ] Adicionar Kill button
- [ ] Adicionar Redirect button
- [ ] Conectar Thinking ao lifecycle stream real
- [ ] Conectar Sparkline a dados reais
- [ ] Mini terminal no right panel (reutilizar TerminalView)
- [ ] Dependencies panel
- [ ] Artifacts list
- [ ] Token counter no header
- [ ] Time active no header

### PIPELINE VIEW
- [ ] Incluir currentTask como task card (não só checklist)
- [ ] Velocity real (tasks/hora)

### EMERGENCE VIEW
- [ ] Colaboração baseada em atividade real (não só "ambos working")
- [ ] Data flow edges (Brief → PRD → UX)
- [ ] Bottleneck detection (highlight vermelho)
- [ ] Time annotations nos nodes

### GANTT VIEW
- [ ] Dependency arrows (SVG lines)
- [ ] Today marker (linha vermelha)
- [ ] Tornar workflow configurável (não hardcoded)
- [ ] Estimated vs Actual (barra fantasma)

### STRATEGY VIEW
- [ ] Apply Changes envia REALMENTE via sessions_send
- [ ] Preview Impact
- [ ] Model selector per agent
- [ ] Token budget per agent

### TERMINAL VIEW
- [ ] Conectar ao lifecycle stream REAL do Clawdbot
- [ ] Inject envia REALMENTE via sessions_send
- [ ] Redirect envia novo direcionamento real

### CHAT FLOAT
- [ ] Enviar mensagens ao Gateway de verdade
- [ ] Receber respostas via SSE
- [ ] Markdown rendering nas respostas
- [ ] Per-agent chat via sessions_send

### COMMAND PALETTE
- [ ] Adicionar views: Docs, Diagrams
- [ ] Adicionar ações: Generate Mermaid, Export Report, Connect Gateway
- [ ] Remover ações sem endpoint (Pause All / Resume All) ou criar endpoints

### CONSENT BAR
- [ ] Conectar ao hook system (before_tool_call)
- [ ] Approve envia aprovação real ao Gateway
- [ ] Mostrar detalhes do que precisa aprovação

### STATUS BAR
- [ ] Gateway status (🟢/🔴)
- [ ] Total tokens
- [ ] Uptime
- [ ] Chat toggle

### STORES
- [ ] AgentState: sessionKey, tokensUsed, startedAt, completedAt, model, artifacts, dependencies, blockedBy, errorMessage
- [ ] ChatMessage: markdown, tools
- [ ] ViewId: adicionar 'docs' e 'diagrams'

### HOOKS
- [ ] useSSE: handlers para bridge_status, consent_request, token_update
- [ ] useKeyboard: corrigir atalhos (2=pipeline, não agent), adicionar 7=docs, 8=diagrams

### SERVER
- [ ] Auth middleware (AG_DEV_TOKEN)
- [ ] Sanitizar git commit message
- [ ] Backup antes de saveState
- [ ] POST /api/agents/:id/start (sessions_spawn)
- [ ] POST /api/agents/:id/kill
- [ ] POST /api/agents/:id/redirect
- [ ] GET /api/agents/:id/artifacts
- [ ] POST /api/gateway/connect
- [ ] GET /api/gateway/status
- [ ] POST /api/diagrams/generate
- [ ] POST /api/chat → enviar pro Gateway
- [ ] POST /api/agents/:id/chat → enviar pro Gateway
- [ ] POST /api/agents/:id/inject → enviar pro Gateway

### WS-BRIDGE
- [ ] Handlers de lifecycle events (tool:start/end, assistant, write)
- [ ] Handlers de consent_request
- [ ] Handlers de token_update
- [ ] Callback onToolEvent para popular terminal streams

### NOVAS VIEWS
- [ ] DocsView: sidebar + markdown viewer + editor + save + create/delete
- [ ] DiagramsView: Mermaid renderer + tabs + auto-generate + edit source + export

### CONFIG
- [ ] Expandir config.json: gateway, auth, ui sections

---

**Total: 78 itens**

**A regra de ouro:** O Sprint 1 (Gateway Integration, 8 itens) transforma o AG Dev de protótipo visual em ferramenta funcional real. Sem ele, tudo é demonstração. Com ele, o AG Dev é a armadura.

---

*Documento gerado pelo time Design-Spec após análise completa de:*
- *Design Spec v2.0 (Council Review + OpenClaw Integration)*
- *OpenClaw Capability Map*
- *Código-fonte completo: 7 views, 6 componentes, 3 stores, 2 hooks, 1 theme, 1 server, 1 bridge*
- *Princípios: Elliot Jaques (Nível 5-6), Bret Victor, Tufte, Norman, Rams*

*Nenhum elemento foi omitido. Cada arquivo do repositório foi analisado.*

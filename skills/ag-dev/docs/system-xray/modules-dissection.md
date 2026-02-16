# Módulos — Dissecação Completa

## 1. `server.js` (1.326 linhas) — O Hub Central

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

## 2. `orchestrator.js` (841 linhas) — O Cérebro ★

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

## 3. `terminal-manager.js` (356 linhas) — O Executor

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

## 4. `squad-manager.js` (363 linhas) — Formador de Times

**5 Squads pré-configuradas:**

| Squad | Agents | Workflow |
|-------|--------|---------|
| Full Stack Dev | analyst, architect, dev, qa | greenfield-fullstack |
| Backend API | analyst, architect, dev | greenfield-service |
| Frontend UI | ux-design-expert, dev, qa | greenfield-ui |
| DevOps Infra | devops, architect | auto-worktree |
| Content Marketing | content-writer, seo-analyst | spec-pipeline |

---

## 5. `workflow-engine.js` (591 linhas) — Motor Avançado

**Status:** Existe como módulo completo mas execução de workflows é feita pelo Orchestrator internamente. WorkflowEngine suporta features avançadas (step-based + phase-based + loops) e está preparado para substituir a implementação do Orchestrator quando integrado.

**Dois formatos:**
- **Phase-based** (greenfield-*, brownfield-*): fases sequenciais com agents
- **Step-based** (qa-loop): steps com on_success/on_failure e loops

---

## 6. `ralph-loop.js` (389 linhas) — Piloto Automático

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

## 7. `agent-graph.js` (629 linhas) + `temporal-graph.js` (533 linhas) — Observação Temporal

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

## 8. `memory-system.js` (146 linhas) — Memória 3 Camadas

| Camada | Propósito | Storage | Lifetime |
|--------|-----------|---------|----------|
| Hot | Working memory | JSON | Sessão |
| Warm | Episodic memory | JSONL append | Dias/semanas |
| Cold | Archive | JSONL datado | Permanente |

**Memory Folding:** Comprime warm quando fica grande — mantém essência, descarta ruído.

---

## 9. `state.js` (254 linhas) — Estado Central

```javascript
this.agents = Map<id, AgentState>    // estado de cada agent
this.workflows = Map<id, WFState>    // estado de cada workflow
this.system = { status, startTime, activeAgents, totalAgents, version }
this.events = []                      // log circular (max 1000)
```

---

## 10. Runtime Layer (4 arquivos, 631 linhas) INTEGRADO v2.1

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

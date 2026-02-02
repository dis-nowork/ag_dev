# AG Dev — Revolution Checklist
## De "bom projeto" para "sistema sem limitações"

*Gerado em 01/02/2026 após revisão completa do codebase*
*Status: 🔄 Em execução (3 sub-agentes trabalhando)*

---

## FASE 1: Eliminar Falhas (Prioridade Máxima)
> Sub-agente: `fix-server-bugs` — 🔄 Em andamento

### 1.1 Rotas Duplicadas no Server
- [ ] Remover `GET /api/templates` duplicado (~linha 1290)
- [ ] Remover `GET /api/project/config` duplicado (~linha 1300)
- [ ] Remover `POST /api/project/init` duplicado (~linha 1310)
- [ ] Remover `POST /api/project/config` duplicado (~linha 1355)
- [ ] Remover `const TEMPLATES_DIR` duplicado (~linha 1285)
- [ ] Remover SPA fallback middleware duplicado (manter só o catch-all final)

### 1.2 Segurança
- [ ] Fix path traversal em `GET /api/docs/read` — validar que path está dentro de PROJECT_ROOT ou CORE_DIR
- [ ] Fix path traversal em `POST /api/docs/save` — mesma validação
- [ ] Sanitizar `/api/exec` — blocklist de comandos destrutivos, limite de 1000 chars
- [ ] Logar todas execuções de `/api/exec` na timeline
- [ ] Auth token auto-gerado: validar que não é exposto em logs

### 1.3 Performance & Estabilidade
- [ ] Debounce de `saveState()` — agrupar escritas em 500ms ao invés de salvar a cada evento
- [ ] `saveStateImmediate()` para shutdown graceful
- [ ] Fix referência a `STRATEGY_FILE` antes da declaração no endpoint spawn

### 1.4 Validação
- [ ] `node -c server.js` passa sem erros
- [ ] Server inicia sem warnings
- [ ] Todas as rotas respondem corretamente (sem 404 por rota duplicada)

---

## FASE 2: UI 100% Dinâmica (Zero Hardcode)
> Sub-agente: `dynamic-ui` — 🔄 Em andamento

### 2.1 Store Dinâmico
- [ ] Adicionar `agentMetas: AgentMeta[]` ao agentStore
- [ ] Adicionar `squads: Squad[]` ao agentStore
- [ ] Adicionar `loaded: boolean` flag
- [ ] Ações: `setAgentMetas()`, `setSquads()`

### 2.2 Bootstrap Dinâmico
- [ ] Fetch `/api/agents/meta` no boot da aplicação
- [ ] Mapear resposta do server para formato da UI
- [ ] Derivar `shortName` automaticamente se não fornecido
- [ ] Fallback para defaults se server não responder

### 2.3 Theme Dinâmico
- [ ] Renomear `AGENTS` → `DEFAULT_AGENTS` (fallback)
- [ ] Renomear `SQUADS` → `DEFAULT_SQUADS` (fallback)
- [ ] Paleta de cores dinâmica — ciclo de 8+ cores para squads desconhecidos
- [ ] `getSquadColorDynamic()` que funciona com qualquer squad name

### 2.4 Views Adaptadas
- [ ] `CockpitView` — agrupar por squads dinâmicos, não SQUAD_ORDER fixo
- [ ] `EmergenceView` — buildGraph() aceita agentes/squads dinâmicos
- [ ] `PipelineView` — tasks derivadas de metas dinâmicos
- [ ] `StrategyView` — diretivas listam agentes dinâmicos
- [ ] `TerminalView` — usar meta do store
- [ ] `CommandPalette` — listar agentes do store
- [ ] `AgentSpawnDialog` — listar agentes do store

### 2.5 Loading State
- [ ] Spinner enquanto `loaded === false`
- [ ] Transição suave para conteúdo real

### 2.6 Validação
- [ ] `vite build` compila sem erros
- [ ] UI funciona com agentes default (sem server)
- [ ] UI funciona com agentes custom (via server)
- [ ] Adicionar um agente .md custom e ele aparece na UI automaticamente

---

## FASE 3: Runtime Agnóstico (Funciona com Qualquer Sistema)
> Sub-agente: `runtime-workflow` — 🔄 Em andamento

### 3.1 Interface de Runtime
- [ ] Criar `server/runtimes/index.js` — interface AgentRuntime documentada
- [ ] Métodos: connect, disconnect, spawnAgent, sendToAgent, pauseAgent, resumeAgent, getAgentHistory, listSessions, subscribeToAgent, getStatus
- [ ] Propriedades: connected, name, capabilities[]

### 3.2 Implementações
- [ ] `ClawdbotRuntime` — wrapper sobre ws-bridge.js existente
- [ ] `StandaloneRuntime` — runtime in-memory para demo/teste
- [ ] `RuntimeFactory` — seleciona runtime baseado em config, com fallback

### 3.3 Integração no Server
- [ ] Substituir todas as chamadas `bridge.*` por `runtime.*`
- [ ] Endpoints de status usam `runtime.getStatus()`
- [ ] Backward compatible — mesma API, mesmas respostas

### 3.4 Validação
- [ ] Server funciona com ClawdbotRuntime (gateway ativo)
- [ ] Server funciona com StandaloneRuntime (sem gateway)
- [ ] Transição automática: se gateway cai, standalone assume

---

## FASE 4: Workflow Engine Real (YAMLs Viram Automação)
> Sub-agente: `runtime-workflow` — 🔄 Em andamento

### 4.1 Engine Core
- [ ] Criar `server/workflow-engine.js`
- [ ] Parser de YAML real (usa formato dos arquivos existentes em core/workflows/)
- [ ] `loadWorkflow(name)` — lê e parseia YAML
- [ ] `startWorkflow(name, params)` — inicia execução
- [ ] `getWorkflowState()` — estado atual de cada step
- [ ] `pauseWorkflow()` / `resumeWorkflow()`

### 4.2 Orquestração
- [ ] Resolver dependências entre steps
- [ ] Spawn automático de agentes quando dependências são satisfeitas
- [ ] Tracking de status por step (pending, running, done, error)
- [ ] Eventos SSE para broadcast de progresso
- [ ] Persistência em `workflow-state.json`

### 4.3 API Endpoints
- [ ] `GET /api/workflow/available` — listar workflows disponíveis
- [ ] `GET /api/workflow/state` — estado da execução atual
- [ ] `POST /api/workflow/start` — iniciar workflow
- [ ] `POST /api/workflow/pause` — pausar
- [ ] `POST /api/workflow/resume` — resumir

### 4.4 Validação
- [ ] Engine parseia todos os 9 workflows YAML existentes
- [ ] Workflow pode ser iniciado via API
- [ ] Steps executam na ordem correta respeitando dependências
- [ ] Estado persiste entre restarts do server

---

## FASE 5: Evolução (Pós-correções)
> A fazer depois das Fases 1-4

### 5.1 Agent Editor na UI
- [ ] View para criar/editar agentes .md direto na interface
- [ ] Preview do agent card enquanto edita
- [ ] Validação de formato (campos obrigatórios)

### 5.2 Workflow Builder Visual
- [ ] View para criar workflows visualmente (drag-and-drop)
- [ ] Conectar steps com linhas de dependência
- [ ] Exportar como YAML
- [ ] Importar YAML existente

### 5.3 Metrics & Analytics
- [ ] Token counters por agente (custo real)
- [ ] Throughput: tasks/hora, linhas/hora
- [ ] Comparação temporal (sparklines reais vs fake)
- [ ] Dashboard de custo total do projeto

### 5.4 Multi-Project
- [ ] Switcher de projetos na UI
- [ ] Cada projeto tem sua config independente
- [ ] Histórico de workflows por projeto

### 5.5 Notificações Inteligentes
- [ ] Toast quando agente completa ou falha
- [ ] Som opcional em eventos críticos
- [ ] Notificação de bottleneck (agente bloqueando outros)

### 5.6 Export & Sharing
- [ ] Exportar estado do projeto como JSON
- [ ] Importar estado em outra instância
- [ ] Compartilhar workflow templates

---

## TRACKING

| Fase | Status | Sub-agente | Início |
|------|--------|------------|--------|
| 1. Eliminar Falhas | 🔄 | fix-server-bugs | 01/02 05:13 |
| 2. UI Dinâmica | 🔄 | dynamic-ui | 01/02 05:13 |
| 3. Runtime Agnóstico | 🔄 | runtime-workflow | 01/02 05:13 |
| 4. Workflow Engine | 🔄 | runtime-workflow | 01/02 05:13 |
| 5. Evolução | ⏳ | — | — |

---

*Atualizado automaticamente conforme sub-agentes completam.*

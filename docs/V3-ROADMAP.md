# 🚀 AG Dev V3 — Roadmap

> Tudo que foi discutido e planejado para a próxima versão.
> V3 foca em: **rodar no Claude Code diretamente**, **ACP para qualidade máxima**, e **preservação de contexto**.

---

## 🔜 V2.2 — Backlog Imediato (Chat Executável + Controles)

### Chat do Orchestrator executa ações de verdade
**Arquivo:** `server/routes/system.js` → `processOrchestratorChat()`
- **Problema:** O chat apenas sugere comandos API em vez de executá-los
- **Fix:** Tornar `processOrchestratorChat` async e chamar os métodos reais:
  - `spawn {agent} {task}` → `orchestrator.spawnAgent(agentName, task)`
  - `start {workflow}` → `orchestrator.startWorkflow(workflowName)`
  - `stop` → `orchestrator.stopWorkflowExecution()` + kill terminals
  - `pause` → `stateManager.pauseAll()`
  - `resume` → `stateManager.resumeAll()`
  - `list agents` → retorna agents com status em tempo real
  - `list workflows` → retorna workflows disponíveis

### Pause/Stop/Resume funcional na UI
- Botões Pause/Stop no WorkflowView precisam de rotas server-side funcionais
- `POST /api/workflows/active/pause` → pausa o workflow ativo
- `POST /api/workflows/active/stop` → para o workflow e mata terminals
- `POST /api/workflows/active/resume` → retoma workflow pausado

### SuperSkills execução pela UI
- Card de cada skill com campos de input baseados no manifest
- Botão "Run" que executa e mostra output inline
- Histórico de execuções recentes

---

## 🎯 Visão V3

**V1** = Primeira versão, protótipo inicial.
**V2** = Plataforma web com API, orquestrada pelo Clawdbot via Telegram (versão atual).  
**V3** = O desenvolvedor (ou agente) roda AG Dev **dentro do Claude Code** como uma ferramenta nativa, com o Agent Client Protocol (ACP) garantindo comunicação estruturada e qualidade.

### Filosofia Central
> "Agentes especializados que colaboram como um time de dev real, onde cada um tem expertise profunda e o protocolo garante que nada se perde na tradução."

---

## 📋 Features V2

### 1. 🔌 ACP (Agent Client Protocol) Integration
**Repo:** `josevalim/agent-client-protocol`

**O que é:** Protocolo padronizado para comunicação entre agentes IA. Clawdbot já usa internamente.

**Como usar no AG Dev:**
- Cada agente AG Dev se registra como um ACP agent
- Comunicação agente↔agente via ACP (não mais via PTY/texto bruto)
- Benefícios:
  - **Tipagem estruturada** — requests/responses com schema, não texto livre
  - **Streaming nativo** — progresso real-time de cada agente
  - **Cancelamento graceful** — parar um agente sem matar processo
  - **Contexto preservado** — cada agente mantém histórico estruturado
  - **Composabilidade** — agentes podem invocar outros agentes nativamente

**Implementação proposta:**
```
AG Dev Server
  ├── ACP Registry (registra agentes como ACP services)
  ├── ACP Router (roteia mensagens entre agentes)
  └── ACP Bridge → Clawdbot Gateway (para agentes Clawdbot)
```

### 2. 🖥️ Claude Code Native Mode
**Objetivo:** Pessoa roda `ag-dev` direto no Claude Code CLI.

**Como funcionaria:**
1. Usuário abre Claude Code num projeto
2. AG Dev disponível como MCP tool ou CLI companion
3. Comandos naturais: "preciso de um squad de dev + qa + architect pra esse feature"
4. AG Dev spawna agentes via ACP, cada um com sua especialidade
5. Output aparece diretamente no Claude Code terminal

**Desafios:**
- Claude Code tem contexto limitado — precisa de smart context management
- Múltiplos agentes competem por tokens — priorização inteligente
- Cada agente precisa de "workspace view" isolada mas com merge coordenado

**Proposta de Arquitetura:**
```
Claude Code
  └── AG Dev MCP Server
        ├── spawn_squad(tipo, projeto)
        ├── ask_agent(agente, pergunta)
        ├── run_workflow(nome, params)
        └── get_status()
```

### 3. 🛡️ Preservação de Qualidade — Estratégias

#### 3.1 Context Compression Inteligente
- Cada agente mantém um "context budget"
- Quando atinge limite, faz summarization automática (mantendo decisões-chave)
- Usa técnica de "progressive disclosure" — detalhes sob demanda

#### 3.2 Agent Memory Tiers (já existe parcial)
```
Hot Memory  → Conversa atual (in-context)
Warm Memory → Sessão atual, decisões recentes (arquivo local)
Cold Memory → Histórico completo, consultável (busca semântica)
```
**V3 melhoria:** Warm memory com embeddings para busca rápida, não apenas texto.

#### 3.3 Quality Gates Automáticos
Inspirado em CI/CD, cada etapa do workflow passa por gates:
```yaml
quality_gates:
  code_generation:
    - lint_check: auto
    - type_check: auto
    - test_generation: required
  architecture:
    - consistency_check: auto
    - pattern_compliance: auto
  review:
    - security_scan: auto
    - performance_check: auto
    - human_approval: optional
```

#### 3.4 Agent Debate Protocol
Inspirado em `sandeco/prompts` (prompts evolucionários):
- Antes de decisões arquiteturais, 2+ agentes "debatem"
- Cada um defende sua abordagem com argumentos
- O Orchestrator avalia e escolhe (ou pede consenso)
- Resultado: decisões mais robustas

### 4. 👥 Novos Squads

#### Marketing & Sales Squad
Agentes especializados em:
- **Content Strategist** — planeja conteúdo técnico
- **Copywriter** — escreve copy para landing pages, docs
- **SEO Analyst** (já existe) — otimização de busca
- **Growth Hacker** — estratégias de aquisição

#### Research & Analysis Squad
- **Market Analyst** — pesquisa de mercado e competidores
- **Tech Scout** — avalia tecnologias emergentes
- **Data Scientist** — análise de dados e insights

### 5. 🔗 Inter-Agent Communication
**Hoje:** Agentes são isolados, comunicam via Orchestrator.
**V2:** Agentes podem se comunicar diretamente via ACP.

```
Architect ──ACP──► Developer: "Use repository pattern aqui"
Developer ──ACP──► QA: "Implementei, esses são os edge cases"
QA ──ACP──► Developer: "Teste X falhou, fix sugerido: ..."
```

Benefícios:
- Menos overhead no Orchestrator
- Comunicação mais rica (podem trocar código, schemas, diagramas)
- Workflow emergente (agentes se auto-organizam)

### 6. 🏗️ WorkflowEngine V2
**Hoje:** Workflows YAML são sequenciais com steps fixos.
**V2:** 
- **Conditional branching** — if/else baseado em output do step anterior
- **Parallel execution** — steps independentes rodam em paralelo
- **Loop/retry** — steps que podem ser re-executados com feedback
- **Dynamic squads** — workflow spawna agentes conforme necessidade
- **Checkpoints** — salvar estado para retomar depois

```yaml
workflow:
  name: adaptive-feature
  steps:
    - agent: analyst
      action: analyze_requirements
      output: requirements
    
    - parallel:
        - agent: architect
          action: design_architecture
          input: $requirements
        - agent: qa
          action: create_test_plan
          input: $requirements
    
    - agent: dev
      action: implement
      input: [$architecture, $test_plan]
      retry:
        max: 3
        condition: "qa.review.passed == false"
    
    - gate:
        type: quality
        checks: [lint, test, security]
        on_fail: loop_back(implement)
```

### 7. 📊 Server.js Full Modularization
**V1** faz route splitting básico.
**V2** vai além:
- Plugin architecture — cada módulo é um plugin registrável
- Hot-reload — atualizar módulos sem restart
- API versioning — /api/v1/, /api/v2/
- Rate limiting e auth por endpoint
- OpenAPI spec auto-gerada

---

## 🔄 Repos Avaliados para V3

### `josevalim/agent-client-protocol`
- **Usar:** Protocolo de comunicação inter-agente
- **Status:** Clawdbot já usa ACP internamente, AG Dev precisa expor seus agentes como ACP services
- **Prioridade:** ALTA — é o backbone da V2

### `oalanicolas/ia`
- **Usar:** Inspiração para agentes de marketing + alguns SuperSkills
- **SuperSkills potenciais:**
  - `smart-commit` — commits semânticos automáticos
  - `auto-deploy` — deploy automatizado com rollback
  - `performance-profiler` — profiling automático
- **Prioridade:** MÉDIA

### `sandeco/prompts`
- **Usar:** Técnicas de prompt avançadas
- **Conceitos:**
  - Agent Debate — múltiplos agentes discutem antes de decidir
  - Evolutionary Prompts — prompts que melhoram iterativamente
  - Chain of Verification — output verificado por outro agente
- **Prioridade:** MÉDIA

---

## 📅 Fases de Implementação

### Fase 1: ACP Foundation (2-3 semanas)
- [ ] Definir ACP schema para agentes AG Dev
- [ ] Implementar ACP Registry no server
- [ ] Migrar comunicação Orchestrator→Agent de PTY para ACP
- [ ] Testes de comunicação agent-to-agent via ACP

### Fase 2: Claude Code Integration (2-3 semanas)
- [ ] Criar MCP Server para AG Dev
- [ ] Implementar spawn_squad, ask_agent, run_workflow como MCP tools
- [ ] Smart context management (context budgets)
- [ ] Testes no Claude Code real

### Fase 3: Quality & Intelligence (2 semanas)
- [ ] Quality Gates automáticos
- [ ] Agent Debate Protocol
- [ ] Memory tiers com embeddings
- [ ] Context compression inteligente

### Fase 4: New Squads & Workflows (2 semanas)
- [ ] Marketing & Sales squad personas
- [ ] Research & Analysis squad personas
- [ ] WorkflowEngine V3 com conditional/parallel/retry
- [ ] Novos workflows adaptados

### Fase 5: Polish & Production (1-2 semanas)
- [ ] Plugin architecture
- [ ] OpenAPI spec
- [ ] Documentação completa
- [ ] Performance optimization

---

## 💡 Princípios Guia V2

1. **Qualidade > Velocidade** — Melhor demorar e entregar código bom do que ser rápido e retrabalhar
2. **Protocolo > Convenção** — ACP garante que agentes se entendam, não depende de "prompt engineering perfeito"
3. **Preservação de Contexto** — Cada decisão, cada trade-off, cada debate fica registrado e consultável
4. **Sob Demanda** — AG Dev não é serviço permanente, é uma ferramenta que você liga quando precisa
5. **Clawdbot-First** — Tudo passa pelo Clawdbot como orquestrador principal, Claude Code é um canal de acesso

---

*Documento criado em 2026-02-02. Atualizar conforme evolução do projeto.*

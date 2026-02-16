# Features V2

## 1. ACP (Agent Client Protocol) Integration
**Repo:** `josevalim/agent-client-protocol`

**O que e:** Protocolo padronizado para comunicacao entre agentes IA. Clawdbot ja usa internamente.

**Como usar no AG Dev:**
- Cada agente AG Dev se registra como um ACP agent
- Comunicacao agente<->agente via ACP (nao mais via PTY/texto bruto)
- Beneficios:
  - **Tipagem estruturada** — requests/responses com schema, nao texto livre
  - **Streaming nativo** — progresso real-time de cada agente
  - **Cancelamento graceful** — parar um agente sem matar processo
  - **Contexto preservado** — cada agente mantem historico estruturado
  - **Composabilidade** — agentes podem invocar outros agentes nativamente

**Implementacao proposta:**
```
AG Dev Server
  ├── ACP Registry (registra agentes como ACP services)
  ├── ACP Router (roteia mensagens entre agentes)
  └── ACP Bridge → Clawdbot Gateway (para agentes Clawdbot)
```

## 2. Claude Code Native Mode
**Objetivo:** Pessoa roda `ag-dev` direto no Claude Code CLI.

**Como funcionaria:**
1. Usuario abre Claude Code num projeto
2. AG Dev disponivel como MCP tool ou CLI companion
3. Comandos naturais: "preciso de um squad de dev + qa + architect pra esse feature"
4. AG Dev spawna agentes via ACP, cada um com sua especialidade
5. Output aparece diretamente no Claude Code terminal

**Desafios:**
- Claude Code tem contexto limitado — precisa de smart context management
- Multiplos agentes competem por tokens — priorizacao inteligente
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

## 3. Preservacao de Qualidade — Estrategias

### 3.1 Context Compression Inteligente
- Cada agente mantem um "context budget"
- Quando atinge limite, faz summarization automatica (mantendo decisoes-chave)
- Usa tecnica de "progressive disclosure" — detalhes sob demanda

### 3.2 Agent Memory Tiers (ja existe parcial)
```
Hot Memory  → Conversa atual (in-context)
Warm Memory → Sessao atual, decisoes recentes (arquivo local)
Cold Memory → Historico completo, consultavel (busca semantica)
```
**V3 melhoria:** Warm memory com embeddings para busca rapida, nao apenas texto.

### 3.3 Quality Gates Automaticos
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

### 3.4 Agent Debate Protocol
Inspirado em `sandeco/prompts` (prompts evolucionarios):
- Antes de decisoes arquiteturais, 2+ agentes "debatem"
- Cada um defende sua abordagem com argumentos
- O Orchestrator avalia e escolhe (ou pede consenso)
- Resultado: decisoes mais robustas

## 4. Novos Squads

### Marketing & Sales Squad
Agentes especializados em:
- **Content Strategist** — planeja conteudo tecnico
- **Copywriter** — escreve copy para landing pages, docs
- **SEO Analyst** (ja existe) — otimizacao de busca
- **Growth Hacker** — estrategias de aquisicao

### Research & Analysis Squad
- **Market Analyst** — pesquisa de mercado e competidores
- **Tech Scout** — avalia tecnologias emergentes
- **Data Scientist** — analise de dados e insights

## 5. Inter-Agent Communication
**Hoje:** Agentes sao isolados, comunicam via Orchestrator.
**V2:** Agentes podem se comunicar diretamente via ACP.

```
Architect ──ACP──► Developer: "Use repository pattern aqui"
Developer ──ACP──► QA: "Implementei, esses sao os edge cases"
QA ──ACP──► Developer: "Teste X falhou, fix sugerido: ..."
```

Beneficios:
- Menos overhead no Orchestrator
- Comunicacao mais rica (podem trocar codigo, schemas, diagramas)
- Workflow emergente (agentes se auto-organizam)

## 6. WorkflowEngine V2
**Hoje:** Workflows YAML sao sequenciais com steps fixos.
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

## 7. Server.js Full Modularization
**V1** faz route splitting basico.
**V2** vai alem:
- Plugin architecture — cada modulo e um plugin registravel
- Hot-reload — atualizar modulos sem restart
- API versioning — /api/v1/, /api/v2/
- Rate limiting e auth por endpoint
- OpenAPI spec auto-gerada

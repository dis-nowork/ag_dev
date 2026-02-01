# AG Dev × OpenClaw — Mapa Completo de Capacidades

*Cada feature do OpenClaw mapeada para como o AG Dev expõe, melhora ou inova.*

---

## 🔧 Core Tools — Exposição Visual

| OpenClaw Tool | O Que Faz | AG Dev View | Melhoria |
|---------------|-----------|-------------|----------|
| `exec` | Executa comandos shell | **Terminal View** | Ver comandos em tempo real, inject commands, logs coloridos |
| `process` | Gerencia processos background | **Terminal View** | Painel de processos ativos por agente, kill/pause visual |
| `Read` | Lê arquivos | **Agent Focus** | Preview de arquivos no split view, syntax highlighting |
| `Write` | Cria/escreve arquivos | **Terminal View** | Diff visual em tempo real do que o agente escreveu |
| `Edit` | Edita arquivos | **Terminal View** | Diff inline com antes/depois |
| `apply_patch` | Multi-file patches | **Terminal View** | Visualização de patch como PR diff |
| `browser` | Controle de Chrome | **Browser View** (NOVO) | Screenshot live, ver o que o agente vê no browser |
| `canvas` | Apresenta HTML/UI | **Canvas View** (NOVO) | Preview embeddado do canvas do agente |
| `web_search` | Busca na web | **Research Panel** | Resultados de pesquisa visíveis no Agent Focus |
| `web_fetch` | Extrai conteúdo de URL | **Research Panel** | Conteúdo extraído visível, salvável |
| `image` | Analisa imagens | **Agent Focus** | Imagens analisadas visíveis no output |
| `tts` | Text-to-speech | **Audio Player** | Reproduzir áudio gerado diretamente na UI |

## 🤖 Agent System — Orquestração Visual

| OpenClaw Feature | O Que Faz | AG Dev View | Melhoria |
|------------------|-----------|-------------|----------|
| `sessions_spawn` | Cria sub-agentes | **Cockpit + Terminal** | Cada agente AIOS = sub-agente visual, spawn com click |
| `sessions_list` | Lista sessions ativas | **Cockpit** | Cards visuais de todas sessions |
| `sessions_history` | Histórico de session | **Terminal View** | Scroll de todo histórico formatado |
| `sessions_send` | Envia msg pra session | **Chat Float + Terminal** | Chat direto com qualquer agente, inject commands |
| `session_status` | Status da session | **Status Bar** | Tokens, custo, tempo por agente no footer |
| Multi-Agent | Agentes isolados | **Squad System** | Squads visuais, workspace por agente |
| Agent Loop | Lifecycle events | **Terminal View** | Stream de `tool`, `assistant`, `lifecycle` events |
| Compaction | Compacta contexto | **Agent Focus** | Indicador visual quando compaction acontece |
| Model Selection | Escolhe modelo | **Strategy Canvas** | Selector de modelo por agente na UI |

## ⏱ Automação & Scheduling

| OpenClaw Feature | O Que Faz | AG Dev View | Melhoria |
|------------------|-----------|-------------|----------|
| `cron` | Jobs agendados | **Gantt View** | Cronograma visual, drag to reschedule |
| Heartbeats | Polling periódico | **Status Bar** | Heartbeat indicator pulsante |
| Hooks | Intercept lifecycle | **Consent Bar** | Ações pendentes de aprovação visual |
| Exec Approvals | Aprovar comandos | **Consent Bar** | Approve/deny com contexto visual |

## 🔌 Plugins & Extensions

| OpenClaw Feature | O Que Faz | AG Dev View | Melhoria |
|------------------|-----------|-------------|----------|
| Plugin System | Extensions TypeScript | **Plugin Manager** (NOVO) | Instalar/configurar plugins pela UI |
| Skills | Capacidades do agente | **Skills Browser** (NOVO) | Ver skills disponíveis, ativar/desativar |
| Channels | Telegram, WhatsApp... | **Channel Manager** (NOVO) | Ver canais ativos, enviar por canal |
| ClawdHub | Marketplace de skills | **Skill Store** (NOVO) | Buscar e instalar skills pela UI |

## 📱 Nodes & Devices

| OpenClaw Feature | O Que Faz | AG Dev View | Melhoria |
|------------------|-----------|-------------|----------|
| Mobile Nodes | Celular como periférico | **Devices Panel** (NOVO) | Ver nodes conectados, câmera, tela |
| Camera | Fotos do celular | **Devices Panel** | Tirar foto e ver na UI |
| Screen Record | Gravar tela | **Devices Panel** | Preview de gravação |
| Location | GPS do dispositivo | **Map View** (FUTURO) | Localização em mapa |

## 📊 Monitoring & Debug

| OpenClaw Feature | O Que Faz | AG Dev View | Melhoria |
|------------------|-----------|-------------|----------|
| `clawdbot status` | Estado do gateway | **Dashboard Header** | Health check visual em tempo real |
| `clawdbot doctor` | Diagnóstico | **Health Check** (NOVO) | Diagnóstico visual com fixes |
| `clawdbot logs` | Logs do gateway | **Logs View** (NOVO) | Logs filtráveis, coloridos |
| Usage Tracking | Tokens gastos | **Status Bar + Analytics** | Custo por agente, gráfico de uso |
| Memory Search | Busca em memória | **Memory Browser** (NOVO) | Visualizar MEMORY.md, buscar memórias |

---

## 🆕 Inovações AG Dev (não existe no OpenClaw)

| Feature | Descrição | Por Que |
|---------|-----------|---------|
| **Squad System** | Agentes agrupados por função | Don Norman: reduz carga cognitiva de 12→4 |
| **Emergence Map** | Grafo de relações auto-detectadas | Nível 6: padrões emergentes |
| **Gantt Dinâmico** | Timeline que se ajusta ao progresso real | Bret Victor: manipulação direta |
| **Strategy Canvas** | Editar directives dos agentes em runtime | Nível 6: controle estratégico |
| **Terminal View** | SSH visual para dentro do agente | Tufte: mostrar os dados |
| **Thinking Out Loud** | Ver raciocínio do agente | Anthropic: transparência |
| **Consent Bar** | Ações pendentes de aprovação | Anthropic: oversight |
| **Time Scrubber** | Rebobinar estado do projeto | Bret Victor: explorar timeline |
| **Mermaid Auto** | Diagramas gerados do código | Tufte: visualizar arquitetura |
| **Project Templates** | Pre-sets por tipo de projeto | Rams: mínimo necessário |

---

## 🎯 Plano de Integração Real

### Nível 1: WebSocket Bridge (ATUAL)
```
AG Dev UI → Express Server → WebSocket → Clawdbot Gateway
```
- Já funciona para status, chat, SSE
- Limitação: não acessa lifecycle events reais

### Nível 2: Plugin Gateway (PRÓXIMO)
```
AG Dev Plugin → Gateway RPC → Agent Runtime
                            → Tool Pipeline
                            → Session Manager
                            → Event Stream
```
- AG Dev registra como Clawdbot Plugin
- Acessa lifecycle events reais (tool/assistant/lifecycle)
- Cada agente AIOS = session Clawdbot
- Strategy directives injetadas no system prompt via `before_agent_start` hook

### Nível 3: Full Integration (FUTURO)
```
AG Dev = Native Clawdbot UI
├── Replaces: clawdbot tui
├── Extends: clawdbot dashboard
├── Adds: visual orchestration layer
└── Enables: any user to command 12 agents visually
```
- AG Dev como a interface padrão para desenvolvimento com Clawdbot
- `clawdbot dev` → abre AG Dev no browser
- Qualquer projeto: `cd my-project && clawdbot dev init`

---

## 📦 Lacunas do OpenClaw que AG Dev Preenche

| Lacuna | Como AG Dev Resolve |
|--------|-------------------|
| Sem UI visual | 9+ views React com design system |
| Sem orquestração visual | Squad system + Emergence Map |
| Sem timeline | Gantt dinâmico + Time Scrubber |
| Sem edição de prompts runtime | Strategy Canvas |
| Sem feedback visual de ferramentas | Terminal View com stream |
| Sem Kanban | Pipeline View |
| Sem diagramas auto-gerados | Mermaid integration |
| Sem controle de modelo por agente | Strategy Canvas + model selector |
| Sem approval UI | Consent Bar |
| Sem métricas visuais | Sparklines + token counters |

---

*Mapa v1.0 — Cobertura completa OpenClaw → AG Dev*
*2026-02-01*

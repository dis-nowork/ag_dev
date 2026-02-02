# AG_Dev v2 — Blueprint Completo para Construção

**Propósito:** Este documento é a spec completa para um desenvolvedor construir o sistema AG_Dev v2 para Clawdbot. Contém arquitetura, fluxos, regras, exemplos reais de falhas, e soluções concretas.

---

## 1. O Que é o AG_Dev

AG_Dev é um sistema multi-agent de desenvolvimento de software. O Clawdbot "veste" esse sistema como uma armadura — ele se torna o orquestrador e despacha agents especializados para cada tarefa. O resultado: desenvolvimento paralelo, com qualidade, sem o orquestrador tocar em código.

### Analogia
- **Sem AG_Dev:** Um dev faz tudo sozinho — planeja, codifica, testa, faz deploy.
- **Com AG_Dev:** Um tech lead (orquestrador) coordena um squad de especialistas. Cada um faz sua parte. O tech lead nunca abre o editor — só despacha, revisa, e aprova.

### Agents do Squad

| Agent | Papel | Quando Usar |
|-------|-------|-------------|
| **Architect** | Planeja estrutura, define interfaces, cria CONTEXT.md | Início de feature, mudança de arquitetura |
| **Builder** | Implementa código | Toda implementação |
| **Reviewer** | Code review: bugs, duplicatas, referências quebradas | Depois de cada build |
| **QA/Tester** | Testa no browser, valida visual, testa fluxos | Depois de cada merge |
| **DevOps-Perf** | Performance, bundle size, rendering | Antes de ship |
| **DevOps-Security** | XSS, SQL injection, credentials, RLS | Antes de ship |
| **DevOps-DB** | Índices, queries, migrations | Quando envolve banco |
| **Integrator** | Merge de patches em arquivo final | Quando >1 builder trabalhou |
| **Ralph (QA Final)** | Verificação final contra PRD/spec | Antes de ship |
| **Designer** | CSS, visual, design system | Quando envolve UI |

---

## 2. Arquitetura do Sistema

### 2.1 Arquivos Core

```
projeto/
├── .agdev/
│   ├── CONTEXT.md          # Estado atual do projeto (compartilhado entre agents)
│   ├── QUEUE.md             # Fila de tarefas pendentes
│   ├── CHANGELOG.md         # Log de todas as mudanças por agent
│   ├── RULES.md             # Regras invioláveis (copiado pro prompt de cada agent)
│   └── sessions/
│       ├── sprint-001.md    # Log do sprint atual
│       └── ...
├── build/                   # Outputs dos builders (patches, não edits diretos)
│   ├── builder-1-output.html
│   ├── builder-2-output.js
│   └── integration-guide.md
├── tests/
│   ├── screenshots/         # Screenshots de QA
│   └── test-results.md
└── src/                     # Código fonte real
    └── ...
```

### 2.2 CONTEXT.md — O Cérebro Compartilhado

Este é o arquivo MAIS IMPORTANTE do sistema. Cada agent lê antes de começar e atualiza ao terminar.

```markdown
# CONTEXT.md — Estado do Projeto

## Última Atualização
Agent: rsb-builder-nav | 2026-02-02 18:30 UTC

## Arquitetura
- Single HTML file (14K linhas)
- Supabase backend (PostgreSQL + pgvector)
- D3.js para grafo
- Quill.js para editor

## Funções Globais (window.*)
| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| changeState(state) | rsb-app.html | 7356 | Troca view ativa |
| showOverlay(id) | rsb-app.html | 9835 | Abre overlay |
| hideOverlay(id) | rsb-app.html | 9869 | Fecha overlay |
| initializeGraph() | rsb-app.html | 7490 | Inicia D3 graph |
| handleInput() | rsb-app.html | 7391 | Processa input |

## IDs do DOM
| ID | Tipo | View | Descrição |
|----|------|------|-----------|
| defaultState | div.state | Pulse | Dashboard principal |
| activeState | div.state | Response | Resposta cognitiva |
| graphState | div.state | Graph | Visualização do grafo |
| composerState | div.state | Composer | Editor/compositor |
| feedOverlay | div.overlay | - | Feed de emergências |
| settingsOverlay | div.overlay | - | Configurações/lentes |
| deepDiveOverlay | div.overlay | - | 7 camadas NEXUS |

## CSS Classes Importantes
| Classe | Comportamento |
|--------|--------------|
| .state | opacity:0, pointer-events:none (inativo) |
| .state.active | opacity:1, pointer-events:auto (ativo) |
| .overlay | display:none, opacity:0 (fechado) |
| .overlay.visible | display:block, opacity:1 (aberto) |

## Event Listeners Globais
| Evento | Handler | Registrado em |
|--------|---------|---------------|
| Cmd+K | RSBIntentBar.toggle() | navigation.js |
| Ctrl+Shift+C | changeState('composer') | initializeEventListeners() |
| ESC | hideOverlay(current) | showOverlay() |
| visibilitychange | pause/resume simulation | perf-optimizations |

## Variáveis Globais
| Variável | Tipo | Descrição |
|----------|------|-----------|
| currentState | string | 'default'/'active'/'graph'/'composer' |
| simulation | d3.forceSimulation | Instância do grafo |
| supabase | SupabaseClient | Cliente do banco |
| graphData | {nodes[], links[]} | Dados do grafo em memória |
| composerBlocks | array | Blocos no compositor |

## Scripts (ordem de carregamento)
1. `<script>` principal (linhas 5900-12500) — app core
2. `<script>` pathfinder-extras (linhas 12500-12900) — patches
3. `<script>` navigation (linhas 13000-14100) — sidebar/intent bar

## Histórico de Mudanças Recentes
| Agent | Data | O Que Mudou |
|-------|------|-------------|
| rsb-compositor | 02/02 15:49 | Adicionou Quill.js, 3 estados, @mentions |
| rsb-sessions | 02/02 15:57 | Session nodes hexagonais, similar sessions |
| rsb-integrator | 02/02 16:10 | Merge v3 (6684 linhas) |
| rsb-pulse | 02/02 18:19 | Dashboard 7 componentes |
| rsb-navigation | 02/02 18:21 | Sidebar + Intent Bar + Graph Controls |
| rsb-redesign | 02/02 20:55 | Novo design system purple |
```

### 2.3 RULES.md — Injetado no Prompt de Cada Agent

```markdown
# REGRAS AG_DEV (Invioláveis)

## Para o Orquestrador
1. NUNCA escreva código diretamente. Sempre despache um agent.
2. Toda mudança segue: Plan → Build → Review → Test → Fix → Ship.
3. Antes de despachar, leia CONTEXT.md e inclua no briefing.
4. Depois de cada merge, rode QA. Sem exceção.
5. Se QA falha, NÃO corrija você mesmo. Mande de volta pro builder.

## Para Builders
1. NUNCA edite o arquivo principal diretamente.
2. Escreva output em /build/[seu-nome]-output.[ext]
3. Inclua integration guide com linhas exatas de inserção.
4. Ao terminar, atualize CONTEXT.md com suas mudanças.
5. Preencha o Checklist de Entrega (obrigatório).

## Para Integrators
1. Leia TODOS os outputs + integration guides + CONTEXT.md.
2. Resolva conflitos documentando cada decisão.
3. Output = arquivo final completo (não patch).
4. Atualize CONTEXT.md com o estado pós-merge.

## Para Reviewers
1. Verifique: funções duplicadas, IDs duplicados, referências undefined.
2. Trace o init flow: o que chama o que, em que ordem.
3. Verifique CONTEXT.md vs código real — estão sincronizados?
4. Liste CADA issue com arquivo:linha e fix sugerido.

## Para QA/Testers
1. ABRA o app no browser (browser tool ou Playwright).
2. Teste cada view: Pulse, Constellation, Deep Dive, Settings.
3. Teste navegação: sidebar, overlays, voltar.
4. Tire screenshot de cada view.
5. Se algo não funciona, REJEITE com evidência.

## Para Todos
1. Leia CONTEXT.md antes de começar. Sempre.
2. Atualize CONTEXT.md ao terminar. Sempre.
3. Se não tem certeza de algo, pergunte ao orquestrador.
4. Nunca assuma que "provavelmente funciona". Verifique.
```

---

## 3. Fluxo Detalhado com Exemplos

### 3.1 Exemplo: Adicionar Pathfinder UI

**❌ Como foi feito (errado):**
```
1. Orquestrador despacha 4 builders em paralelo no MESMO arquivo
2. Cada builder escreve ~500 linhas de código
3. Integrador junta tudo num arquivo de 14K linhas
4. Ninguém testa
5. Usuário abre → navegação quebrada
6. Orquestrador faz fix direto (sem agent)
7. Fix quebra outra coisa
8. Loop de 5+ rodadas de correção
```

**✅ Como deveria ser feito:**
```
1. Architect analisa: "Pathfinder mexe no graph view (graphState).
   Afeta: click handlers do D3, painel lateral, CSS do graph container.
   NÃO afeta: Pulse, Settings, Compositor."
   
2. Architect atualiza CONTEXT.md com o plano.

3. Builder-Pathfinder recebe briefing + CONTEXT.md.
   Escreve output em /build/pathfinder-output.html (só HTML/CSS/JS do pathfinder).
   Integration guide diz: "Inserir CSS na linha X, HTML na linha Y, JS na linha Z."
   Atualiza CONTEXT.md: "Adicionei: pathfinderNodeClick(), showPathfinderPanel(),
   hidePathfinderPanel(). IDs: #pathfinderPanel, #pathfinderRoutes."

4. Integrator lê output + guide + CONTEXT.md.
   Merge no arquivo principal.
   Atualiza CONTEXT.md com linhas finais.

5. Reviewer lê o merge.
   "OK, pathfinderNodeClick() usa window.changeState que existe na linha 7356. ✅
    showPathfinderPanel() seta display:block, z-index 100. 
    Overlay tem z-index 2000, então não vai conflitar. ✅
    Click handler registrado em initializeGraph(). 
    Mas initializeGraph() é chamado por changeState('graph'),
    e o pathfinder registra listener em cada chamada sem cleanup. ❌
    BUG: listeners duplicados a cada troca de view."
   REJEITA com fix sugerido.

6. Volta pro Builder-Pathfinder com o bug report.
   Builder corrige: adiciona guard `if (pathfinderInitialized) return;`
   Novo output em /build/pathfinder-output-v2.html

7. Integrator merge v2.

8. Reviewer aprova.

9. QA-Tester abre no browser.
   - Navega pra Constellation ✅
   - Clica num nó → sidebar aparece ✅
   - Clica em segundo nó → rotas mostradas ✅
   - Volta pra Pulse → overlay fecha ✅
   - Screenshot de cada passo ✅
   APROVA.

10. Ship.
```

### 3.2 Exemplo: Fix de 1 Linha (Trocar max_hops de 5 para 4)

**❌ Como foi feito (errado):**
```
Orquestrador: "Ah, é só 1 linha, faço eu mesmo"
*edita direto, sem review, sem teste*
```

**✅ Como deveria ser feito:**
```
1. Orquestrador despacha Micro-Builder:
   "Troque max_hops de 5 para 4 em TODAS as ocorrências.
   CONTEXT.md diz que tá nas linhas 10741 e 10782."

2. Builder faz, atualiza CONTEXT.md.

3. Review automático (pode ser o próprio orquestrador lendo):
   "2 ocorrências alteradas. grep confirma 0 ocorrências de max_hops.*5. ✅"

4. Ship.
   
Tempo extra: 1 minuto. Bugs evitados: todos.
```

### 3.3 Exemplo: Redesign de CSS

**❌ Como foi feito (errado):**
```
1. Agent redesign reescreve CSS inteiro
2. Ninguém abre no browser pra ver
3. Usuário reporta: "design não mudou / não tá igual referência"
4. Mais uma rodada de fix
```

**✅ Como deveria ser feito:**
```
1. Designer recebe referências visuais + CONTEXT.md
2. Escreve novo CSS em /build/redesign.css
3. Integrator aplica no arquivo principal
4. QA-Tester ABRE NO BROWSER
5. Tira screenshots de cada view
6. Compara com referências visuais
7. Se não combina → volta pro Designer com screenshots + diff visual
8. Designer ajusta
9. Só ship quando QA-Tester aprova com evidência visual
```

---

## 4. Falhas Reais Documentadas (Aprender Com Erros)

### Falha 1: Column Name Mismatch
**O que aconteceu:** Edge function escrevia `from_node_id`/`to_node_id`, frontend lia `source_id`/`target_id`. Pipeline inteiro quebrado — dados entravam no banco mas nunca apareciam no grafo.

**Por que aconteceu:** Builder do backend e builder do frontend trabalharam em paralelo sem CONTEXT.md. Nenhum sabia os nomes de coluna que o outro usava.

**Como evitar:** CONTEXT.md com schema do banco atualizado. Builders leem antes de começar.

### Falha 2: changeState() Inacessível
**O que aconteceu:** `changeState` definido dentro de closure no script 1. Navigation script (script 3) tentou fazer monkey-patch via `window.changeState`, mas era `undefined` nesse ponto.

**Por que aconteceu:** 3 scripts separados adicionados por 3 agents diferentes. Nenhum sabia da arquitetura de closures dos outros.

**Como evitar:** CONTEXT.md documenta "Funções Globais" com escopo. Architect define no início: "TODAS as funções core devem ser expostas em window.* antes do último script carregar."

### Falha 3: CSS Orphans
**O que aconteceu:** 7 linhas com `-webkit-` prefix ficaram soltas (sem propriedade completa), "comendo" a propriedade CSS seguinte. Sidebar, intent bar, e graph controls perderam bordas/margens.

**Por que aconteceu:** Agent de redesign fez find-replace agressivo que quebrou regras CSS multi-linha.

**Como evitar:** Reviewer com regra específica: "Verifique que toda propriedade CSS tem valor completo. Grep para linhas terminando em `-webkit-` sem `:` na mesma linha."

### Falha 4: Overlay vs State Conflito
**O que aconteceu:** Clicar em "Deep Dive" no sidebar abria o overlay MAS não fechava o state ativo embaixo. Como o overlay tinha background semi-transparente, parecia que nada mudou.

**Por que aconteceu:** Sidebar navigation e overlay system foram construídos por agents diferentes que não sabiam da coexistência dos dois sistemas (states vs overlays).

**Como evitar:** CONTEXT.md documenta ambos os sistemas. Architect define na fase de planejamento: "navigate() SEMPRE fecha overlays antes de trocar state."

### Falha 5: initPathfinderExtras() chamado 3x
**O que aconteceu:** Função chamada em initApp(), e também auto-executada pelo próprio script, e também chamada pelo navigation init. Triple event listeners, triple ARIA labels.

**Por que aconteceu:** 3 agents diferentes adicionaram a chamada sem saber que os outros já tinham feito.

**Como evitar:** CONTEXT.md tem seção "Init Flow" que mostra exatamente o que chama o que. Cada agent verifica antes de adicionar uma chamada de init.

### Falha 6: Design Não Aplicado
**O que aconteceu:** Agent de redesign alterou CSS vars e muitas regras, mas componentes adicionados DEPOIS do redesign (por outros agents) usavam cores hardcoded ao invés de var(--color).

**Por que aconteceu:** Agents posteriores não sabiam do design system. Copiavam cores literais ao invés de usar variáveis.

**Como evitar:** RULES.md para builders: "NUNCA use cores literais. Sempre use var(--nome). Design system documentado em CONTEXT.md."

---

## 5. Capacidades do Clawdbot Que Devem Ser Usadas

### 5.1 sessions_spawn
Despacha sub-agents. Parâmetros importantes:
- `label` — nome descritivo (aparece nas notificações)
- `runTimeoutSeconds` — timeout (600-900s para tasks grandes)
- `task` — briefing COMPLETO com contexto

### 5.2 Browser Tool
**SUBUTILIZADO NESTE PROJETO.** O Clawdbot tem browser control:
```
browser.open(url) → abre página
browser.snapshot() → captura DOM
browser.screenshot() → screenshot visual
browser.act({kind: 'click', ref: 'x'}) → interage
```
O QA-Tester DEVE usar isso. Não é opcional.

### 5.3 sessions_send
Permite comunicação entre sessões. Pode ser usado para:
- Orquestrador mandar update pra agent rodando
- Agent pedir esclarecimento pro orquestrador

### 5.4 exec
Rodar comandos: `grep`, `wc`, `git`, etc.
Agents devem usar para VERIFICAR suas mudanças:
```bash
grep -c "function duplicada" arquivo.html  # 0 = ok
grep -n "window\.changeState" arquivo.html  # verificar exposição
```

### 5.5 cron
Para tarefas periódicas: auto-QA, health checks, etc.

---

## 6. Template de Briefing para Agent

```markdown
# Briefing: [nome-do-agent]

## Contexto
[Colar CONTEXT.md relevante aqui]

## Missão
[Descrição clara do que fazer]

## Arquivos
- LEIA: [lista de arquivos pra ler]
- EDITE: [lista de arquivos que pode editar]
- NÃO TOQUE: [lista de arquivos proibidos]

## Regras
[Colar RULES.md aqui]

## Checklist de Entrega
Ao terminar, inclua:
- [ ] Funções criadas: [lista]
- [ ] Funções modificadas: [lista]  
- [ ] IDs do DOM adicionados: [lista]
- [ ] Event listeners: [lista]
- [ ] CSS classes: [lista]
- [ ] Atualização do CONTEXT.md: [diff]

## Output
Escreva em: /build/[nome]-output.[ext]
Escreva guide: /build/[nome]-integration-guide.md
```

---

## 7. Métricas de Sucesso

O AG_Dev v2 funciona quando:

| Métrica | Target | Como Medir |
|---------|--------|------------|
| Bugs encontrados PÓS-ship | 0 críticos | Issue tracker |
| Rodadas de fix por feature | ≤ 2 | Contar commits de fix |
| Orquestrador escreveu código | 0 vezes | Git blame |
| QA com screenshot | 100% dos ships | Pasta tests/screenshots |
| CONTEXT.md atualizado | Depois de cada agent | Git log do arquivo |
| Merge conflicts | 0 | Agents em arquivos separados |
| Tempo de fix loop | < 10min | Timestamp dos commits |

---

## 8. Anti-Patterns (O Que NÃO Fazer)

### ❌ "É só 1 linha, faço eu mesmo"
Toda vez que o orquestrador faz isso, o sistema perde credibilidade. Se 1 linha pode ser feita fora do fluxo, por que não 5? E 20? Discipline breeds quality.

### ❌ "Vou despachar 4 agents no mesmo arquivo"
Merge hell garantido. Cada agent assume que é o único editando. O resultado é sempre conflito.

### ❌ "O QA vai ler o código e aprovar"
Ler código ≠ testar. O código pode estar sintaticamente correto e semanticamente quebrado. Só browser test é teste real.

### ❌ "Corrige por cima do fix anterior"
Sem rollback, cada fix adiciona complexidade. 5 fixes empilhados = espaguete. Sempre: rollback → fix limpo → re-test.

### ❌ "Auditoria no final vai pegar tudo"
Não pega. A auditoria V3 deste projeto aprovou 85% — e o app nem abria direito. Qualidade é no processo, não na inspeção final.

### ❌ "Agent de design altera CSS sem ver no browser"
CSS é visual. Sem screenshot, o agent tá codificando às cegas. SEMPRE: edit CSS → screenshot → compare com referência → ajusta.

---

## 9. Implementação Técnica para Clawdbot

### 9.1 Como o Clawdbot "Veste" o AG_Dev

No `SOUL.md` ou `AGENTS.md` do Clawdbot, adicionar:

```markdown
## Modo AG_Dev
Quando receber tarefa de desenvolvimento:
1. Leia .agdev/RULES.md
2. Leia .agdev/CONTEXT.md
3. NÃO escreva código diretamente
4. Despache agents via sessions_spawn seguindo o fluxo:
   Plan → Build → Review → Test → Fix → Ship
5. Depois de cada merge, despache QA-Tester
6. Só comunique "pronto" ao usuário após QA-Tester aprovar com screenshot
```

### 9.2 Inicialização do Projeto

Quando começar um projeto novo com AG_Dev:

```bash
mkdir -p .agdev build tests/screenshots
```

Criar CONTEXT.md, RULES.md, QUEUE.md iniciais.

### 9.3 Fluxo de Comunicação

```
Usuário → Orquestrador: "Adiciona feature X"
                ↓
Orquestrador → Architect: "Planeja feature X" (sessions_spawn)
Architect → Orquestrador: "Plano: 2 builders, afeta arquivos A e B"
                ↓
Orquestrador → Builder-A: "Implementa parte 1 no arquivo A" (sessions_spawn)
Orquestrador → Builder-B: "Implementa parte 2 no arquivo B" (sessions_spawn)
[paralelo — arquivos diferentes!]
                ↓
Orquestrador → Integrator: "Merge outputs de A e B" (sessions_spawn)
                ↓
Orquestrador → Reviewer: "Review do merge" (sessions_spawn)
                ↓
[Se aprovado]
Orquestrador → QA-Tester: "Testa no browser" (sessions_spawn)
                ↓
[Se aprovado com screenshots]
Orquestrador → Usuário: "Feature X pronta! ✅" + screenshots
```

---

*Blueprint criado por Claudio (AG_Dev Orchestrator) em 2026-02-02*
*Baseado em experiência real do projeto RSB (14K+ linhas, 30+ agents despachados, 10+ commits)*
*Para uso como spec de construção do AG_Dev v2*

# AG Dev — Design Specification
## Multi-Agent Development Command Center

*Um conselho de design dos maiores pensadores aplicado à interface do AG Dev.*

---

## 1. O Painel de Pensadores

### 1.1 Anthropic — Filosofia de Colaboração Humano-IA

**Princípios centrais:**
- O humano é o comandante, nunca o passageiro. Todo agente deve ser interrompível, redirecionável, e transparente.
- Constitutional AI aplicado: cada agente opera dentro de limites claros e visíveis. O usuário vê *por que* um agente tomou uma decisão, não só o resultado.
- Oversight progressivo: confiança se constrói. Novos agentes pedem mais confirmação; agentes com histórico ganham mais autonomia.

**Recomendações específicas:**
- **Consent bar** no topo: mostra ações pendentes que precisam de aprovação. Não é modal — é persistente e não-intrusiva.
- **Audit trail** acessível em 1 clique por agente: log completo de decisões e raciocínio.
- **Kill switch por agente**: botão vermelho visível, sempre. Parar um agente nunca deve levar mais de 1 segundo.

**O que há de ERRADO em dashboards típicos:** Tratam a IA como caixa-preta. Mostram output mas escondem o processo. Isso destrói confiança.

**Ideia revolucionária:** *"Thinking out loud" mode* — cada agente pode mostrar seu raciocínio em tempo real como um stream lateral, tipo legendas de filme. Você vê o agente pensando, não só o resultado.

---

### 1.2 Bret Victor — Manipulação Direta

**Princípios centrais:**
- "Creators need an immediate connection to what they create." Todo artefato deve ser manipulável diretamente.
- Eliminar a distância entre intenção e execução. Se o usuário quer mover uma task, ele arrasta. Se quer pausar um agente, ele clica. Zero menus intermediários.
- O estado do sistema deve ser visual e contínuo, não discreto. Não "rodando/parado" — mostrar o *gradiente* de atividade.

**Recomendações específicas:**
- **Canvas de agentes**: os 12 agentes são nós em um canvas 2D. Arrastar um agente sobre uma task atribui ele. Conectar dois agentes com uma linha cria uma dependência.
- **Live preview**: código sendo escrito por um agente aparece em split-view com diff em tempo real. Não esperar o agente terminar — ver cada keystroke.
- **Time scrubber**: slider no footer que permite "rebobinar" o estado do projeto. Ver como o código estava há 5 minutos, há 1 hora.

**O que há de ERRADO:** Dashboards são estáticos. Você checa status, toma ação, checa de novo. É pull, não push. A informação deve fluir para você continuamente.

**Ideia revolucionária:** *"Intention sketching"* — em vez de escrever um prompt, o usuário desenha o que quer (um rabisco de uma tela, setas conectando componentes, um fluxo). Os agentes interpretam o desenho e executam.

---

### 1.3 Edward Tufte — Design de Informação

**Princípios centrais:**
- Data-ink ratio máximo: cada pixel deve transmitir informação. Nada de decoração.
- Sparklines everywhere: micro-gráficos inline que mostram tendência sem ocupar espaço.
- "Above all else, show the data." Não esconda informação atrás de tooltips e expansores.

**Recomendações específicas:**
- **Agent cards compactos**: cada agente é um card de ~120x80px com: nome, status (cor), mini-gráfico de atividade (últimas 2h), task atual (truncada), e throughput (commits/min ou linhas/min como sparkline).
- **Small multiples**: os 12 agentes em grid 4x3. Mesmo layout, mesma escala. O olho compara instantaneamente.
- **Nada de pie charts ou gauges**. Barras horizontais para comparação, sparklines para tendência.
- **Layering**: overview → detalhe em zoom semântico. Zoom out = 12 dots coloridos. Zoom in = cards completos. Zoom máximo = agente full-screen com todo o contexto.

**O que há de ERRADO:** Dashboards adoram gauges, donuts, e números gigantes. São decoração, não informação. Um número sem contexto temporal é inútil.

**Ideia revolucionária:** *"Data density of a cockpit"* — uma view que mostra TUDO em uma tela. 12 agentes, pipeline de tasks, git activity, test status, deploy state. Sem scroll. Tudo visível. Como um cockpit de avião — complexo mas legível para quem sabe ler.

---

### 1.4 Dieter Rams — 10 Princípios Aplicados

| Princípio | Aplicação no AG Dev |
|-----------|-------------------|
| **Inovador** | Canvas 2D de agentes (ninguém fez isso para multi-agent) |
| **Útil** | Cada view resolve um problema real: "quem tá fazendo o quê?" |
| **Estético** | Monocromático + uma cor de acento por agente. Sem gradientes. |
| **Compreensível** | Agentes como personas com avatar, não IDs técnicos |
| **Discreto** | A UI some quando não precisa. Full-screen code mode esconde tudo. |
| **Honesto** | Se um agente está travado, mostra vermelho. Não mascara problemas. |
| **Duradouro** | Design system próprio, não dependente de trends (sem glassmorphism) |
| **Detalhado** | Atalhos de teclado para tudo. Vim-mode opcional. |
| **Eco-consciente** | Eficiência de tokens: não gasta API call para animação. |
| **Mínimo** | Se pode remover sem perder função, remove. |

**O que remover:** Sidebar navigation (usar command palette), breadcrumbs (usar zoom semântico), loading spinners (usar skeleton + streaming).

**Ideia revolucionária:** *"Weniger, aber besser" (Menos, mas melhor)* — a tela inicial mostra APENAS o que mudou desde a última vez. Não um dashboard estático — um diff do estado.

---

### 1.5 Don Norman — Design Cognitivo

**Princípios centrais:**
- Affordances: o usuário deve olhar e saber o que pode fazer. Botões parecem clicáveis, agentes parecem arrastáveis.
- Modelo mental: 12 agentes são muitos. Agrupar em squads (3-4 agentes) reduz carga cognitiva de 12 para 3-4 unidades.
- Feedback loops: toda ação tem resposta em <100ms. Som sutil quando agente completa task. Vibração (mobile) em erro crítico.

**Recomendações específicas:**
- **Squad model**: em vez de 12 agentes soltos, agrupar em squads temáticos:
  - 🏗️ **Builders** (Fullstack, Frontend, Backend, DevOps)
  - 🧠 **Thinkers** (Analyst, Architect, PM)
  - 🛡️ **Guardians** (Security, QA, Tech Writer)
  - 🎨 **Creators** (UX Designer, Data Engineer, Mobile)
- **Progressive disclosure**: overview → squad → agente → task → código. 4 níveis, cada um revela mais detalhe.
- **Constraints visíveis**: se um agente não pode executar algo (dependência, conflito), mostra *por que*, não só desabilita.

**O que há de ERRADO:** Dashboards tratam o usuário como leitor passivo. Mas humans are tool users — precisam de affordances, não relatórios.

**Ideia revolucionária:** *"Error as conversation"* — quando algo falha, o agente não mostra stack trace. Ele diz em linguagem humana o que tentou, por que falhou, e o que sugere. O erro vira um chat contextual.

---

### 1.6 Pensador Nível 6 (Jaques) — Meta-Padrões

**Princípios centrais:**
- A UI é uma ferramenta de pensamento, não um display. O layout deve induzir insight.
- Três camadas de abstração simultâneas: O Quê (tasks), Como (agentes), e Por Quê (estratégia/PRD).
- O sistema deve tornar visível o que é invisível: dependências, gargalos, oportunidades.

**Recomendações específicas:**
- **Strategy layer**: um mapa conceitual que conecta o PRD → épicos → tasks → código. Visível como background do canvas, dando contexto ao trabalho individual.
- **Emergence view**: não mostrar só o que foi planejado, mas padrões que emergiram. Quais agentes se complementam? Onde há conflito? Onde há gap?
- **Temporal awareness**: a UI muda com o tempo. Início do projeto = canvas aberto, exploratório. Sprint em andamento = kanban focado. Entrega = pipeline de deploy. A interface se adapta à fase.

**O que há de ERRADO:** Dashboards são planos. Mostram uma dimensão (status). Falta a dimensão temporal (tendência), espacial (relações), e intencional (por quê).

**Ideia revolucionária:** *"The Living Architecture"* — a UI se auto-organiza baseada no workflow real. Se dois agentes sempre trabalham juntos, eles se aproximam no canvas. Se uma área do código recebe muita atividade, ela "brilha" mais. O mapa reflete a realidade, não o plano.

---

### 1.7 Linear + Vercel + Figma — UX Moderna

**Linear:**
- Command palette (⌘K) como centro de tudo. Nunca mais que 2 keystrokes de qualquer ação.
- Keyboard-first. Mouse é fallback, não primário.
- Transições suaves de 200ms. Nada instantâneo demais (jarring) nem lento (>300ms).
- Atalhos contextuais: na view de agente, `p` pausa, `r` resume, `l` mostra log.

**Vercel:**
- Deploy pipeline visual: cada step é um nó, progresso flui como líquido.
- Real-time logs com highlighting de erros.
- Preview instantâneo: cada commit gera uma preview URL automaticamente.
- Função overview → detalhe com um clique, sem page transition.

**Figma:**
- Multiplayer cursors: se vários humanos olham o mesmo projeto, ver cursores.
- Canvas infinito com zoom semântico.
- Components reusáveis: definir um "template de agente" e reusar.
- Selection + action: seleciona agentes → ação em batch.

**O que há de ERRADO:** Maioria dos dashboards são construídos por backend devs. UX é afterthought. Resultado: funciona mas não flui.

**Ideia revolucionária:** *"Multiplayer AI workspace"* — não é um dashboard que uma pessoa olha. É um workspace onde humanos e agentes coexistem. O humano vê os agentes trabalhando como se fossem colegas no Figma.

---

## 2. Especificação Unificada de Design

### 2.1 Arquitetura de Informação

```
┌─────────────────────────────────────────────┐
│                COMMAND BAR (⌘K)               │
├─────────────────────────────────────────────┤
│  STRATEGY LAYER (PRD → Epics → Goals)        │
│  ┌─────────────────────────────────────────┐ │
│  │         AGENT CANVAS (12 agents)         │ │
│  │                                           │ │
│  │  🏗️ Builders    🧠 Thinkers              │ │
│  │  ┌──┐┌──┐┌──┐  ┌──┐┌──┐┌──┐            │ │
│  │  │FS││FE││BE│  │AN││AR││PM│            │ │
│  │  └──┘└──┘└──┘  └──┘└──┘└──┘            │ │
│  │                                           │ │
│  │  🛡️ Guardians   🎨 Creators              │ │
│  │  ┌──┐┌──┐┌──┐  ┌──┐┌──┐┌──┐            │ │
│  │  │SC││QA││TW│  │UX││DE││MB│            │ │
│  │  └──┘└──┘└──┘  └──┘└──┘└──┘            │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  ACTIVITY STREAM          │  CONTEXT PANEL   │
│  (live feed)              │  (agent detail)   │
├─────────────────────────────────────────────┤
│  STATUS BAR: tokens │ time │ tests │ deploy  │
└─────────────────────────────────────────────┘
```

**Hierarquia de navegação (4 níveis):**
1. **Cockpit** — tudo em uma tela, small multiples dos 12 agentes
2. **Squad** — zoom em um grupo (Builders/Thinkers/Guardians/Creators)
3. **Agent** — foco em um agente: task atual, histórico, chat, código
4. **Code** — editor/diff view com context do agente e task

### 2.2 Padrões de Interação

| Ação | Interação | Atalho |
|------|-----------|--------|
| Buscar qualquer coisa | Command palette | `⌘K` |
| Atribuir task a agente | Drag & drop ou `A` + selecionar | `A` |
| Pausar agente | Click no agent + Pause | `P` |
| Matar agente | Hold click 2s (previne acidente) | `⌘⇧K` |
| Ver raciocínio | Hover → tooltip, Click → panel | `T` |
| Zoom in/out | Scroll wheel ou pinch | `+`/`-` |
| Mudar de nível | Click em squad/agent/code | `1-4` |
| Chat com agente | Click no agent → chat panel | `C` |
| Chat flutuante | `⌘J` abre chat overlay em qualquer view | `⌘J` |
| Rebobinar tempo | Drag time scrubber no footer | `[`/`]` |

### 2.3 Princípios Visuais

**Cor:**
```
Background:     #0A0A0B (quase preto)
Surface:        #141416 (cards)
Surface hover:  #1C1C1F
Border:         #2A2A2E (sutil)
Text primary:   #EDEDEF
Text secondary: #8B8B8E
```

**Cores de agente (uma por squad):**
```
Builders:    #3B82F6 (azul)
Thinkers:    #A855F7 (roxo)
Guardians:   #EF4444 (vermelho)
Creators:    #10B981 (verde)
```

**Status:**
```
Idle:        dot cinza, opacity 40%
Working:     dot da cor do squad, pulsando suave
Blocked:     dot amarelo #EAB308
Error:       dot vermelho + glow
Complete:    dot verde + checkmark
```

**Tipografia:**
- Headers: Inter, 600 weight
- Body: Inter, 400 weight
- Code: JetBrains Mono
- Numbers/metrics: Tabular figures (monospace width)

**Motion:**
- Transições: 200ms ease-out
- Entry animations: 150ms fade-up
- Micro-interactions: 100ms (hover, click feedback)
- Agent pulse: 2s cycle, opacity 60%→100%→60%
- Nenhuma animação > 300ms

### 2.4 As 5 Views Essenciais

#### View 1: Cockpit (Home)

A tela que mostra *tudo*. Sem scroll.

```
┌────────────────────────────────────────────────────┐
│ ⌘K Search...                    🔴 2 pending  ⏱ 4h │
├────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Fullstack │ │ Frontend │ │ Backend  │ │ DevOps │ │
│  │ ████░░░░ │ │ ██████░░ │ │ idle     │ │ ████░░ │ │
│  │ auth.ts  │ │ nav.tsx  │ │          │ │ docker │ │
│  │ ▂▃▅▇▅▃▂ │ │ ▂▅▇▇▅▂▁ │ │          │ │ ▁▂▃▅▇ │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Analyst  │ │ Architect│ │ PM       │            │
│  │ ████████ │ │ ░░░░░░░░ │ │ ██░░░░░░ │            │
│  │ ✅ done  │ │ waiting  │ │ backlog  │            │
│  │ ▇▇▅▃▂▁▁ │ │          │ │ ▁▁▂▃▅▇▇ │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Security │ │ QA       │ │ TechWrite│            │
│  │ ██████░░ │ │ ████░░░░ │ │ idle     │            │
│  │ scan.rs  │ │ test_api │ │          │            │
│  │ ▁▂▅▇▅▃▂ │ │ ▂▃▅▅▃▂▁ │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
├────────────────────────────────────────────────────┤
│ ◀ ═══════════════●══════ ▶  Tasks: 14/47  Tests: ✅ │
│                 time scrubber                        │
└────────────────────────────────────────────────────┘
```

**Elementos:**
- 12 agent cards em grid (small multiples de Tufte)
- Cada card: nome, barra de progresso, task atual, sparkline de atividade
- Consent bar no topo (ações pendentes)
- Time scrubber no footer
- Status bar: tasks concluídas, testes, tempo ativo

#### View 2: Agent Focus

Click em qualquer agente abre full view:

```
┌────────────────────────────────────────────────────┐
│ ← Back to Cockpit          Fullstack Dev    🔵 active│
├──────────────────────┬─────────────────────────────┤
│                      │                               │
│  CURRENT TASK        │  LIVE CODE                    │
│  ┌────────────────┐  │  ┌─────────────────────────┐ │
│  │ Implement auth │  │  │ // auth.service.ts      │ │
│  │ Epic: User Mgmt│  │  │                         │ │
│  │ Est: 2h        │  │  │ + export class Auth {   │ │
│  │ Progress: 60%  │  │  │ +   private jwt: JWT;   │ │
│  └────────────────┘  │  │ +   async login(cred) { │ │
│                      │  │ +     const token = ...  │ │
│  THINKING (live)     │  │                         │ │
│  ┌────────────────┐  │  │  ░░░ typing...          │ │
│  │ Considering JWT│  │  └─────────────────────────┘ │
│  │ vs session-    │  │                               │
│  │ based auth.    │  │  FILES CHANGED                │
│  │ JWT chosen for │  │  ├ src/auth.service.ts  (+47) │
│  │ scalability... │  │  ├ src/auth.guard.ts    (+23) │
│  └────────────────┘  │  └ tests/auth.spec.ts   (+31) │
│                      │                               │
│  HISTORY             │  TESTS                        │
│  ✅ Setup project    │  ✅ 12 passing                 │
│  ✅ Database schema  │  ⏳ 3 running                  │
│  ⏳ Auth service     │  ❌ 0 failed                   │
│  ○ Auth guard        │                               │
│  ○ Auth middleware    │                               │
│                      │                               │
├──────────────────────┴─────────────────────────────┤
│ [Pause] [Redirect] [Chat ⌘J]   Tokens: 12.4k used  │
└────────────────────────────────────────────────────┘
```

**Elementos:**
- Split view: contexto (esquerda) + código (direita)
- "Thinking out loud" panel — stream de raciocínio do agente
- File tree com diff counts
- Test status live
- Ações: Pause, Redirect (mudar task), Chat

#### View 3: Chat Flutuante (⌘J)

Overlay que funciona em qualquer view:

```
                              ┌──────────────────────┐
                              │ Chat — Fullstack Dev  │
                              │ ─────────────────── │
                              │ 🤖 Working on auth   │
                              │    service. Using JWT │
                              │    for scalability.   │
                              │                      │
                              │ 👤 Switch to session │
                              │    based auth instead │
                              │                      │
                              │ 🤖 Understood. I'll  │
                              │    refactor. This     │
                              │    means we also need │
                              │    to add Redis for   │
                              │    session store...   │
                              │                      │
                              │ ┌──────────────────┐ │
                              │ │ Type message...   │ │
                              │ └──────────────────┘ │
                              └──────────────────────┘
```

**Elementos:**
- Flutuante, draggable, resizable
- Selector de agente no header (trocar chat sem fechar)
- Context-aware: se está na view do agente, auto-seleciona
- Suporta comandos: `/pause`, `/redirect [task]`, `/status`

#### View 4: Pipeline (Kanban Vivo)

```
┌────────────────────────────────────────────────────┐
│ Pipeline — Phantom ID                    Filter ▼   │
├────────────┬────────────┬────────────┬─────────────┤
│  BACKLOG   │  IN PROG   │  REVIEW    │  DONE       │
│            │            │            │             │
│  ┌──────┐  │  ┌──────┐  │  ┌──────┐  │  ┌──────┐  │
│  │Schema│  │  │Auth  │  │  │Routes│  │  │Setup │  │
│  │      │  │  │🔵 FS │  │  │🟣 AR │  │  │✅    │  │
│  │○○○○  │  │  │████░░│  │  │██████│  │  │      │  │
│  └──────┘  │  └──────┘  │  └──────┘  │  └──────┘  │
│            │            │            │             │
│  ┌──────┐  │  ┌──────┐  │            │  ┌──────┐  │
│  │Tests │  │  │UI Nav│  │            │  │CI/CD │  │
│  │      │  │  │🔵 FE │  │            │  │✅    │  │
│  │○○○○  │  │  │██░░░░│  │            │  │      │  │
│  └──────┘  │  └──────┘  │            │  └──────┘  │
│            │            │            │             │
│  drag to   │  live      │  awaiting  │  completed  │
│  assign    │  progress  │  human     │             │
├────────────┴────────────┴────────────┴─────────────┤
│ Velocity: 3.2 tasks/hr  │  ETA: ~4h  │  47 total   │
└────────────────────────────────────────────────────┘
```

**Elementos:**
- Kanban com 4 colunas (Backlog → In Progress → Review → Done)
- Tasks mostram agente atribuído (badge de cor)
- Progress bar inline em cada task
- Drag to assign: arrastar task no agente (abre selector se não tem)
- Footer com métricas: velocity, ETA, total

#### View 5: Emergence Map (O Diferencial Nível 6)

A view que nenhum dashboard tem. Mostra *relações* e *padrões*.

```
┌────────────────────────────────────────────────────┐
│ Emergence Map — Living Architecture                 │
├────────────────────────────────────────────────────┤
│                                                      │
│              [PRD: Phantom ID]                       │
│              /       |        \                      │
│         [Epic 1]  [Epic 2]  [Epic 3]                │
│         /    \      |    \      \                    │
│      [T1]  [T2]  [T3]  [T4]  [T5]                 │
│       │      │     │     │      │                   │
│      🔵FS  🟢UX  🔵BE  🟣AR  🔴SC                 │
│       ╰──────╯     ╰─────╯                         │
│     collaborating  dependency                       │
│                                                      │
│  PATTERNS DETECTED:                                  │
│  ⚡ FS + UX collaboram em 80% das tasks             │
│  🔴 Security blocked 3x por falta de schema         │
│  📈 Backend velocity 2x maior após Architect review │
│  💡 Sugestão: mover Schema task pra Sprint 1        │
│                                                      │
│  HOTSPOTS (files with most activity):                │
│  ████████████ src/auth/         (4 agents)           │
│  ████████     src/api/routes    (2 agents)           │
│  ████         src/config/       (1 agent)            │
│                                                      │
└────────────────────────────────────────────────────┘
```

**Elementos:**
- Grafo de PRD → Épicos → Tasks → Agentes
- Linhas de relação auto-detectadas (quais agentes trabalham juntos)
- Pattern detection: insights que emergem do trabalho
- Hotspot map: quais áreas do código recebem mais atividade
- Sugestões do sistema baseadas nos padrões

---

### 2.5 O Que Faz Isso Nível 5-6

Dashboards comuns são **Nível 3** (procedural): mostram status e permitem ações discretas.

AG Dev é **Nível 5-6** porque:

1. **Multi-frame thinking**: o Cockpit mostra presente (status), passado (time scrubber) e futuro (ETA/velocity) simultaneamente.

2. **Emergent patterns**: a Emergence Map não mostra o que foi planejado — mostra o que está *acontecendo*. Padrões que nem o humano percebeu.

3. **Adaptive UI**: a interface muda com a fase do projeto. Discovery → canvas aberto. Execution → kanban. Review → diff views. Deploy → pipeline.

4. **Meta-cognition**: o "thinking out loud" mode permite ao humano pensar *sobre* como o agente pensa. É meta-cognição — reflexão sobre o processo, não só o resultado.

5. **Tool for thought**: não é um display — é um instrumento de pensamento. O layout da Emergence Map induz insights que o usuário não teria olhando uma lista de tasks.

---

## 3. Stack Técnico Recomendado

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | React 18 + TypeScript | Componentização, ecosystem |
| Styling | Tailwind CSS | Utility-first, design tokens |
| Motion | Framer Motion | Fluid animations, layout transitions |
| Canvas/Graph | React Flow | Agent canvas, emergence map |
| Charts | Recharts + custom SVG | Sparklines, heatmaps |
| State | Zustand | Lightweight, minimal boilerplate |
| Realtime | SSE (Server-Sent Events) | Agent streams, live updates |
| Editor | Monaco (lazy-loaded) | Code view, diff view |
| Commands | cmdk (⌘K) | Command palette |
| Backend | Express + WebSocket bridge | Already built |

---

## 4. Prioridade de Implementação

### Fase 1 — Foundation (Sprint 1-2)
- [ ] Cockpit view com 12 agent cards (small multiples)
- [ ] Command palette (⌘K)
- [ ] SSE connection para live agent status
- [ ] Status bar com métricas básicas
- [ ] Design tokens + theme (cores, tipografia, motion)

### Fase 2 — Interaction (Sprint 3-4)
- [ ] Agent Focus view (split code + context)
- [ ] Chat flutuante (⌘J)
- [ ] Keyboard shortcuts completos
- [ ] Pipeline/Kanban view
- [ ] Progressive disclosure (zoom semântico)

### Fase 3 — Intelligence (Sprint 5-6)
- [ ] "Thinking out loud" streaming
- [ ] Time scrubber
- [ ] Emergence Map
- [ ] Pattern detection
- [ ] Hotspot visualization

### Fase 4 — Polish (Sprint 7-8)
- [ ] Adaptive UI por fase do projeto
- [ ] Multiplayer cursors (futuro)
- [ ] Mobile responsive (command center lite)
- [ ] Performance optimization
- [ ] Onboarding flow

---

*Documento gerado pela síntese de: Anthropic, Bret Victor, Edward Tufte, Dieter Rams, Don Norman, Elliot Jaques (Level 6), Linear, Vercel, Figma.*

*Versão 1.0 — 2026-02-01*

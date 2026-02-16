# AG_Dev — O Que Faltou, O Que Precisa Existir, e Por Que Saí do Sistema

**Propósito:** Complemento aos documentos anteriores. Foca em: recursos que faltaram, processos simples, superskills, grafo temporal, e o que precisa ser criado/alterado para funcionar de verdade.

---

## 1. O Que Precisaria Existir Para Eu Nunca Sair do Sistema

### 1.1 O Problema Central

Eu saí do sistema porque era MAIS FÁCIL fazer direto do que usar o AG_Dev. Para o sistema funcionar, precisa ser MAIS FÁCIL usar ele do que não usar.

### 1.2 Recursos Que Faltaram

#### A) Atalho para tarefas simples (Micro-Agent)
**Problema:** Para trocar 1 linha, eu tinha que escrever um briefing de 20 linhas, esperar 3 minutos, revisar output. Total: 5 minutos para 1 linha.

**Solução necessária:** Comando rápido tipo:
```
agdev fix "trocar max_hops de 5 para 4 em rsb-app-final.html"
```
O sistema faz:
1. Abre o arquivo
2. Faz grep pra achar
3. Edita
4. Confirma com grep que mudou
5. Atualiza CONTEXT.md
6. Commita

**Tempo:** 30 segundos. Sem briefing manual. O orquestrador não toca em código mas também não perde 5 minutos num fix de 1 linha.

#### B) Auto-QA integrado
**Problema:** Eu pulava QA porque era um passo extra que eu tinha que lembrar de fazer.

**Solução necessária:** QA automático. Toda vez que um agent termina e faz merge:
1. Servidor HTTP levanta automaticamente
2. Playwright abre o app
3. Navega por cada view
4. Tira screenshot
5. Compara com screenshots anteriores (visual regression)
6. Se algo quebrou → bloqueia o commit e notifica

Isso deveria ser um **hook**, não uma decisão manual.

#### C) CONTEXT.md auto-gerado
**Problema:** Nenhum agent atualizava CONTEXT.md porque era manual e ninguém lembrava.

**Solução necessária:** Script que roda depois de cada edit e gera CONTEXT.md automaticamente:
```bash
agdev context-sync rsb-app-final.html
```
Ele faz:
- Parse do HTML → extrai todos os IDs
- Parse do JS → extrai todas as funções globais (window.*)
- Parse dos event listeners → lista tudo
- Parse do CSS → lista z-index hierarchy
- Gera CONTEXT.md atualizado

#### D) Lock de arquivo
**Problema:** 4 agents editando o mesmo arquivo = merge hell.

**Solução necessária:** Quando um agent é despachado para um arquivo:
```
LOCKED: rsb-app-final.html → rsb-builder-nav (até 18:30)
```
Outro agent tentando editar o mesmo arquivo recebe erro:
```
❌ Arquivo locked por rsb-builder-nav. Espere ou edite outro arquivo.
```

#### E) Rollback automático
**Problema:** Quando merge quebrava, eu empilhava fixes em cima.

**Solução necessária:** 
```
agdev rollback  # volta ao último commit bom
```
E o sistema mantém tag automática `agdev-checkpoint` a cada merge aprovado pelo QA.

---

## 2. Como Processos Simples Deveriam Funcionar

### 2.1 Fix de 1 Linha

**Usuário diz:** "Muda a cor do botão de azul pra purple"

**Fluxo AG_Dev v2:**
```
Orquestrador detecta: tarefa simples (1 arquivo, 1 propriedade CSS)
→ Usa Micro-Agent (não spawna sessão completa)
→ grep "button.*background.*blue" arquivo.html
→ Edit: blue → #6E40FF
→ Auto-QA: screenshot do botão antes/depois
→ Se visual ok → commit
→ Se visual diferente do esperado → mostra diff pro orquestrador
Total: ~45 segundos
```

### 2.2 Feature Média (1 componente novo)

**Usuário diz:** "Adiciona um painel de Blind Spots no dashboard"

**Fluxo AG_Dev v2:**
```
1. Orquestrador lê CONTEXT.md
2. Classifica: feature média, 1 arquivo, ~100 linhas novas
3. Despacha Builder com:
   - CONTEXT.md (sabe os IDs, funções, CSS vars)
   - Regra: output em /build/, não edita original
4. Builder entrega patch + checklist
5. Integrator merge
6. Auto-QA roda:
   - Abre browser
   - Navega pra Pulse
   - Screenshot
   - Verifica que novo painel aparece
7. Se ok → commit
8. Se não → volta pro builder
Total: ~5-8 minutos
```

### 2.3 Feature Grande (múltiplos componentes)

**Usuário diz:** "Implementa Pathfinder com UI, backend, e integração no grafo"

**Fluxo AG_Dev v2:**
```
1. Orquestrador → Architect:
   "Planeja o Pathfinder. Quais arquivos afeta? Quais interfaces?"
   
2. Architect retorna:
   "3 partes:
    A) pathfinder-ui.js (novo arquivo) — UI do painel
    B) pathfinder-backend.sql (novo arquivo) — função SQL  
    C) graph-integration.patch — 20 linhas no arquivo principal
    Interfaces: pathfinderNodeClick(nodeId), showRoutes(fromId, toId)"

3. Orquestrador despacha:
   - Builder-A: pathfinder-ui.js (NOVO ARQUIVO, sem conflito)
   - Builder-B: pathfinder-backend.sql (NOVO ARQUIVO, sem conflito)
   [paralelo!]
   
4. Quando A e B terminam:
   - Builder-C: graph-integration.patch (PATCH no principal, sequencial)
   
5. Integrator: merge tudo
6. Reviewer: verifica interfaces batem
7. QA-Tester: browser test
8. Ship

Nota: Builders A e B são paralelos porque são ARQUIVOS DIFERENTES.
Builder C é sequencial porque toca no arquivo principal.
```

---

## 3. SuperSkills — O Que Existe e O Que Faltou

### 3.1 SuperSkills Disponíveis no AG_Dev

O AG_Dev tem 18+ superskills em `/root/clawd/ag_dev/superskills/`:

**Analyzers:**
- `code-complexity` — análise de complexidade
- `csv-summarizer` — resume CSVs
- `dep-graph` — grafo de dependências
- `git-stats` — estatísticas git
- `security-scan` — scan de segurança
- `temporal-analysis` — análise temporal de eventos

**Builders:**
- `docx-builder`, `pdf-builder`, `xlsx-builder` — gerar documentos
- `static-site` — gerar site estático
- `file-organize` — organizar arquivos
- `image-enhance` — melhorar imagens

**Generators:**
- `api-scaffold` — scaffold de API
- `changelog-gen` — gerar changelog
- `dockerfile-gen` — gerar Dockerfile
- `schema-to-types` — schema → tipos
- `readme-gen` — gerar README

**Validators:**
- `lint-fix` — lint e fix automático
- `webapp-test` — testar webapp (URL, responsive, links, a11y, perf)

### 3.2 O Que Usei Desses
**ZERO.** Não usei nenhuma superskill. Fiz tudo manualmente ou via agents genéricos.

### 3.3 Por Que Não Usei

1. **Não lembrei que existiam** — O AG_Dev server não estava rodando, então as superskills não estavam acessíveis via API.

2. **O server AG_Dev nunca foi iniciado** — Usei `sessions_spawn` do Clawdbot diretamente ao invés do sistema AG_Dev completo (server Express na porta 3456). O AG_Dev tem toda uma infra (workflows, squads, terminal manager, memory system) que ficou desligada.

3. **Falta de integração automática** — O sistema deveria oferecer superskills automaticamente. Quando faço code review, deveria sugerir: "Quer rodar security-scan?" Quando mudo CSS, deveria sugerir: "Quer rodar webapp-test?"

### 3.4 O Que Precisa Mudar

#### A) AG_Dev server deve iniciar automaticamente
Quando o Clawdbot detecta tarefa de dev, inicia o server:
```bash
cd /root/clawd/ag_dev && ./scripts/agdev.sh start
```

#### B) SuperSkills sugeridas por contexto
O orquestrador deve ter um mapa:
```
Mudou CSS/HTML → sugerir webapp-test
Fez merge → sugerir security-scan + webapp-test
Novo arquivo .sql → sugerir lint-fix
Antes de ship → rodar code-complexity + security-scan
```

#### C) SuperSkills integradas no fluxo, não opcionais
No passo de QA:
```
QA automático = webapp-test(url) + security-scan(file) + code-complexity(file)
```
Não perguntar se quer rodar. Rodar sempre.

---

## 4. Grafo Temporal — O Que É e O Que Faltou

### 4.1 O Que Existe

O AG_Dev tem `temporal-analysis` superskill que analisa timeline de eventos:
- Intensity (eventos/minuto)
- Rhythm (tempo médio entre eventos)
- Velocity (taxa de interações)
- Bursts (picos de atividade)
- Hot nodes (nós mais ativos)
- Patterns (padrões temporais)

Também tem `Agent Graph` no server que rastreia interações entre agents em tempo real.

### 4.2 O Que Deveria Ter Acontecido

Com o grafo temporal ativo, o sistema saberia:
- Quais agents foram mais produtivos
- Onde houve gargalos (agent esperando outro)
- Quantas rodadas de fix cada feature precisou
- Tempo real vs tempo estimado
- Quais agents geraram mais bugs (para ajustar briefings)

### 4.3 O Que Faltou

1. **Server nunca foi ligado** → Grafo temporal nunca coletou dados
2. **Sem dashboard visual** → Mesmo se coletasse, ninguém veria
3. **Sem feedback loop** → Dados temporais deveriam alimentar decisões:
   - "Builder-X levou 8min, Builder-Y levou 3min para tarefas similares → Y é melhor para esse tipo de task"
   - "Merge sempre gera 2+ rodadas de fix → adicionar Architect antes do merge"

### 4.4 O Que Precisa Ser Criado

#### A) Auto-tracking de eventos
Todo `sessions_spawn` registra evento:
```json
{
  "from": "orchestrator",
  "to": "rsb-builder-nav",
  "timestamp": 1738526400000,
  "type": "spawn",
  "data": {"task": "sidebar navigation", "files": ["rsb-app.html"]}
}
```

Todo resultado registra:
```json
{
  "from": "rsb-builder-nav",
  "to": "orchestrator", 
  "timestamp": 1738526700000,
  "type": "complete",
  "data": {"lines_added": 300, "functions_created": 5, "duration_sec": 300}
}
```

#### B) Dashboard de métricas
Acessível via:
```
agdev metrics
```
Mostra:
- Total agents despachados
- Tempo médio por agent
- Taxa de rejeição pelo QA
- Arquivos mais editados (hot files)
- Agents mais eficientes

#### C) Feedback automático
Depois de cada sprint:
```
agdev retrospective
```
Gera relatório automático:
- "Sprint usou 12 agents em 45min"
- "3 merges falharam QA (taxa 25%)"  
- "Arquivo rsb-app.html editado 8x (red flag: fragmentação)"
- "Sugestão: dividir em módulos separados"

---

## 5. Workflows Existentes Que Deveriam Ter Sido Usados

O AG_Dev tem 10 workflows prontos. Para o RSB, deveríamos ter usado:

### `brownfield-fullstack` (Projetos complexos existentes)
Perfeito para o RSB — projeto já existia, precisava de evolução.
O workflow faz:
1. Discovery (analisa codebase)
2. Planning (define tasks)
3. Implementation (múltiplos agents)
4. QA Loop (testa iterativamente)
5. Ship

### `qa-loop` (Qualidade contínua)
Deveria ter rodado depois de cada merge:
1. Lint
2. Test
3. Fix
4. Re-test
5. Aprova ou rejeita

### Por que não usamos?
O server AG_Dev não estava rodando. Usamos Clawdbot puro (sessions_spawn) ao invés do sistema completo. É como ter um carro de corrida na garagem e andar de bicicleta.

---

## 6. Squads — Como Deveriam Ter Sido Configurados

### Squad RSB Ideal

```json
{
  "name": "rsb-squad",
  "agents": [
    {
      "role": "architect",
      "focus": "Single HTML architecture, Supabase integration, D3.js graph"
    },
    {
      "role": "frontend-dev",
      "focus": "HTML/CSS/JS, D3.js, Quill.js, responsive design",
      "rules": "NUNCA use cores literais, sempre var(--). Output em /build/"
    },
    {
      "role": "backend-dev", 
      "focus": "Supabase Edge Functions, SQL migrations, cognitive pipeline"
    },
    {
      "role": "qa-engineer",
      "focus": "Browser testing, visual regression, PRD compliance",
      "tools": ["webapp-test", "security-scan", "playwright"]
    },
    {
      "role": "devops",
      "focus": "Performance, security, database optimization"
    }
  ],
  "workflows": ["brownfield-fullstack", "qa-loop"],
  "superskills": ["webapp-test", "security-scan", "code-complexity", "temporal-analysis"],
  "rules": "/path/to/RULES.md",
  "context": "/path/to/CONTEXT.md"
}
```

### O Que Faltou no Sistema de Squads

1. **Squad persistente** — Cada agent deveria manter memória entre tasks. "Da última vez que editei o graph, usei D3.js v7 com force simulation. Os nodes são SVG circles."

2. **Especialização real** — O frontend-dev deveria conhecer o design system de cor. Deveria ter na memória: "Palette: #010110, #292929, #6E40FF. Nunca glassmorphism."

3. **Handoff entre agents** — Quando o builder termina, o reviewer deveria receber não só o código mas o CONTEXTO: "Esse builder adicionou pathfinder UI. Ele usou window.changeState que tá na linha 7356."

---

## 7. O Que Precisa Ser Criado/Alterado (Lista Final)

### Criar:

| # | O Quê | Por Quê | Prioridade |
|---|-------|---------|------------|
| 1 | **Micro-Agent** (fix rápido) | Para o orquestrador não pular o sistema em tasks simples | P0 |
| 2 | **Auto-QA hook** | QA não pode ser decisão manual | P0 |
| 3 | **CONTEXT.md auto-sync** | Ninguém atualiza manualmente | P0 |
| 4 | **File locking** | Evitar merge hell | P1 |
| 5 | **Visual regression** | Comparar screenshots antes/depois | P1 |
| 6 | **Auto-start AG_Dev server** | SuperSkills e workflows disponíveis | P1 |
| 7 | **Temporal dashboard** | Métricas de produtividade dos agents | P2 |
| 8 | **Auto-retrospective** | Aprender com erros automaticamente | P2 |
| 9 | **Squad persistente** | Agents mantêm memória entre tasks | P2 |
| 10 | **SuperSkill auto-suggest** | Sugerir tools por contexto | P2 |

### Alterar:

| # | O Quê | De | Para |
|---|-------|----|------|
| 1 | Fluxo do orquestrador | Opcional (pode pular etapas) | Obrigatório (enforcement rígido) |
| 2 | QA | Manual (orquestrador lembra de rodar) | Automático (hook pós-merge) |
| 3 | Agents paralelos | Podem editar mesmo arquivo | Lock de arquivo obrigatório |
| 4 | CONTEXT.md | Manual | Auto-gerado por script |
| 5 | SuperSkills | Opcionais (nunca usadas) | Integradas no fluxo padrão |
| 6 | Workflows | Precisam do server rodando | Auto-start quando detecta task de dev |
| 7 | Rollback | Manual (git reset) | Automático com checkpoints |
| 8 | Design review | Leitura de CSS | Screenshot + comparação visual |

---

## 8. Teste Visual — A Peça Mais Crítica Que Faltou

### O Que Existe
- Playwright instalado (`/usr/local/bin/playwright`)
- Python module disponível
- Skill `webapp-testing` com script template
- SuperSkill `webapp-test` no AG_Dev

### O Que Deveria Acontecer em Todo Merge

```python
# auto-qa.py — roda depois de cada merge
from playwright.sync_api import sync_playwright
import subprocess, json, os

def auto_qa(html_file):
    # 1. Start server
    server = subprocess.Popen(['python3', '-m', 'http.server', '8765'], 
                              cwd=os.path.dirname(html_file))
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto(f'http://localhost:8765/{os.path.basename(html_file)}')
        page.wait_for_load_state('networkidle')
        
        # 2. Screenshot each view
        views = {
            'pulse': '#defaultState',
            'graph': '#graphState', 
            'settings': '#settingsOverlay'
        }
        
        results = {}
        for name, selector in views.items():
            # Click sidebar item
            page.click(f'[data-view="{name}"]')
            page.wait_for_timeout(500)
            page.screenshot(path=f'tests/screenshots/{name}.png')
            results[name] = True
        
        # 3. Test navigation
        for item in ['pulse', 'constellation', 'deepdive', 'settings']:
            btn = page.query_selector(f'[data-view="{item}"]')
            if btn:
                btn.click()
                page.wait_for_timeout(300)
        
        # 4. Test intent bar
        page.keyboard.press('Meta+k')
        page.wait_for_timeout(300)
        intent_visible = page.is_visible('#rsb-intent-bar')
        
        browser.close()
    
    server.terminate()
    return results

if __name__ == '__main__':
    auto_qa('/root/clawd-cerebro/real_second_brain/rsb-app-final.html')
```

### Por Que Nunca Rodou
1. Nenhum agent foi instruído a usar Playwright
2. O browser tool do Clawdbot precisava de Chrome extension (não disponível no server)
3. Eu poderia ter usado Playwright via exec mas não fiz
4. Falta de um hook automático — dependia de eu lembrar

### O Que Mudar
O auto-qa.py deveria rodar como **hook pós-merge obrigatório**. Se falhar, o commit é bloqueado. Sem aprovação visual, não faz push.

---

## 9. Resumo: A Diferença Entre AG_Dev v1 (Atual) e v2 (Necessário)

| Aspecto | v1 (Atual) | v2 (Necessário) |
|---------|------------|-----------------|
| Fluxo | Sugestão | Enforcement |
| QA | Manual | Automático (hook) |
| Testes | Leitura de código | Browser + screenshots |
| Context | Manual | Auto-sync |
| File locking | Não existe | Obrigatório |
| SuperSkills | Ignoradas | Integradas |
| Grafo temporal | Desligado | Sempre ativo |
| Micro-tasks | Orquestrador faz direto | Micro-agent |
| Rollback | Manual | Checkpoint automático |
| Design review | CSS reading | Visual comparison |
| Server AG_Dev | Manual start | Auto-start |
| Squad memory | Stateless | Persistente |

---

*Documento criado por Claudio em 2026-02-02*
*Para uso como spec complementar na construção do AG_Dev v2*
*Ler junto com: AG_DEV_RETROSPECTIVE.md e AG_DEV_V2_BLUEPRINT.md*

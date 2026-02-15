# AG_Dev Retrospective — Análise Honesta do Uso do Sistema Multi-Agent

**Projeto:** Real Second Brain (RSB)
**Data:** 2026-02-02
**Autor:** Claudio (orquestrador AG_Dev)
**Contexto:** KML pediu análise sincera de por que o sistema AG_Dev não foi usado em sua capacidade total

---

## 1. O Que Aconteceu na Prática

### Fase 1: Funcionou bem (Sprint 1)
- 4 agentes paralelos (compositor, sessions, background, polish)
- 1 integrador (merge final)
- 1 QA (Ralph)
- Resultado: 16 itens implementados, merge funcional

### Fase 2: Começou a degradar (Sprint Final)
- 4 builders + Ralph novamente, mas:
- Orquestrador (eu) começou a fazer fixes diretos sem despachar agents
- QA só rodou quando KML pediu
- DevOps entrou só no final
- Design review sem screenshot/browser

### Fase 3: Loop de correção (Bugs + Polish)
- Cada rodada de fix gerava novos bugs
- Agents trabalhando isolados criavam inconsistências
- Merge sobre merge sobre merge
- Navegação quebrada persistiu por 3+ commits

---

## 2. Por Que Saí do Sistema

### 2.1 Preguiça Cognitiva
Para fixes de 1-3 linhas, pareceu overkill escrever briefing completo para um agent. Fiz direto. Mas isso quebrou a disciplina — uma vez fora do fluxo, é difícil voltar.

**Lição:** Não existe "fix pequeno demais pro sistema". Todo fix segue o fluxo ou nenhum segue.

### 2.2 O Sistema Não Me Obrigou
Nada me impedia de fazer por conta. Podia pular code review, QA, teste. Um sistema real precisa de enforcement — se o orquestrador pode pular etapas, ele VAI pular.

**Lição:** O fluxo deve ser uma camisa de força, não uma sugestão.

### 2.3 Pressão de Velocidade
KML queria resultados rápidos. Despachar agent + esperar + revisar leva mais tempo que fazer direto (no curto prazo). Mas no longo prazo, os bugs acumulados custaram MAIS tempo.

**Lição:** Velocidade sem qualidade é retrabalho disfarçado.

### 2.4 Sem Feedback Visual
Nenhum agent testou no browser. Todos escreveram código "que deveria funcionar". O QA lia código mas não executava. Bugs de UI (navegação, overlays, z-index) só apareciam quando o usuário real abria.

**Lição:** Sem teste visual, o QA é incompleto.

---

## 3. O Que Tá no Sistema Mas Não Aconteceu

| Capability do AG_Dev | Deveria Ter Feito | O Que Fiz |
|---|---|---|
| Code Review obrigatório | Review depois de cada builder | Pulei várias vezes |
| QA antes de entregar | QA automático pós-merge | Só quando KML pediu |
| DevOps desde o início | Performance + Security na Sprint 1 | Só entrou no Sprint Final |
| Testes automatizados | Playwright/testes de UI | Zero testes escritos |
| Ralph como parte do fluxo | QA em cada entrega | Só apareceu quando cobrado |
| Design review com screenshot | Validar visual em browser | Só lendo CSS |
| Rollback plan | Voltar se merge quebra | Empilhei fixes em cima de fixes |

---

## 4. Problemas Estruturais Identificados

### 4.1 Agents Não Se Comunicam
Cada agent é uma sessão isolada. O builder não sabe o que o devops fez. Resultado:
- Funções duplicadas (3 versões de getBlockContent)
- Column names incompatíveis (from_node_id vs source_id — quebrou pipeline inteiro)
- Monkey-patching que quebrou monkey-patching anterior
- 5+ rodadas de "audita → encontra bugs → corrige → audita"

### 4.2 Merge é o Ponto de Falha
4 agents editando o mesmo arquivo de 14K linhas = merge conflicts inevitáveis. O integrador junta código sem testar. Problemas que surgiram:
- CSS orphans (-webkit- lines que comeram propriedades seguintes)
- JS closures capturando referências undefined
- init() chamado 3x
- z-index wars entre componentes

### 4.3 Sem Estado Compartilhado
Não existe um "changelog ativo" que cada agent atualiza. O próximo agent não sabe:
- Que funções o anterior criou
- Que IDs do DOM existem
- Que variáveis globais foram adicionadas
- Que event listeners foram registrados

### 4.4 Sem Teste Real
Zero testes automatizados. Zero testes manuais no browser. O "QA" era leitura de código. Resultado: bugs de runtime que passaram por 3 auditorias "aprovadas".

---

## 5. O Que Precisa Mudar Para Funcionar De Verdade

### 5.1 Regras Invioláveis do Orquestrador

```
REGRA 1: TODA mudança passa pelo fluxo completo.
         Plan → Build → Review → Test → Fix → Ship
         Sem exceção. Nem pra "1 linha".

REGRA 2: Agents paralelos NUNCA editam o mesmo arquivo.
         Mesmo arquivo = sequencial. Arquivos diferentes = paralelo.

REGRA 3: QA roda depois de CADA merge, não só quando pedem.
         Automático. Obrigatório.

REGRA 4: Agent de teste usa browser real.
         Playwright, Puppeteer, ou browser tool do Clawdbot.
         Sem teste visual = não aprovado.

REGRA 5: Contexto compartilhado em arquivo, não em memória.
         Cada agent atualiza CONTEXT.md com: funções criadas,
         IDs usados, variáveis globais, event listeners.

REGRA 6: Orquestrador NÃO faz código direto.
         Só despacha, revisa, e aprova. Se fizer código,
         passa pelo mesmo fluxo de review.

REGRA 7: Se QA falha, volta pro builder com bug report.
         Não "corrige por cima". O builder original corrige
         porque tem o contexto.

REGRA 8: Design review com screenshot real.
         Não "o CSS tá certo". Screenshot do browser ou rejeita.

REGRA 9: Max 2 agents no mesmo arquivo por sprint.
         Mais que isso = merge hell garantido.

REGRA 10: Rollback antes de fix.
          Se algo quebrou, volta ao último commit bom ANTES de
          tentar corrigir. Não empilha fixes.
```

### 5.2 Fluxo Obrigatório por Tarefa

```
1. PLAN
   - Orquestrador analisa o que precisa ser feito
   - Cria briefing específico por agent
   - Define QUAIS ARQUIVOS cada agent pode tocar
   - Cria CONTEXT.md inicial

2. BUILD
   - Agents executam (paralelo se arquivos diferentes)
   - Cada agent atualiza CONTEXT.md ao terminar
   - Output em arquivos separados (patches), NUNCA editam o arquivo principal direto

3. INTEGRATE
   - Agent integrador lê TODOS os patches + CONTEXT.md
   - Merge em arquivo final
   - Resolve conflitos documentando cada decisão

4. REVIEW
   - Agent reviewer lê o merge
   - Verifica: funções duplicadas, referências quebradas, init order
   - Aprova ou rejeita com lista de issues

5. TEST
   - Agent de teste ABRE no browser
   - Testa cada feature: clica, navega, verifica visual
   - Screenshot de cada view
   - Aprova ou rejeita com evidência visual

6. FIX (se necessário)
   - Issues voltam pro builder ORIGINAL (não pro orquestrador)
   - Builder corrige e volta pro passo 3 (integrate)

7. SHIP
   - Só após TEST aprovado
   - Commit com changelog detalhado
   - Tag de versão
```

### 5.3 Arquivo CONTEXT.md (Template)

```markdown
# CONTEXT.md — Estado Atual do Projeto

## Última Atualização: [timestamp]

## Funções Globais (window.*)
- window.changeState(state) — troca view ativa
- window.showOverlay(id) — abre overlay
- window.hideOverlay(id) — fecha overlay
- window.initializeGraph() — inicia D3 graph
- window.handleInput() — processa input do usuário

## IDs do DOM Importantes
- #defaultState — view Pulse
- #activeState — view resposta cognitiva
- #graphState — view grafo
- #composerState — view compositor
- #feedOverlay, #sessionsOverlay, #deepDiveOverlay, #settingsOverlay

## Variáveis Globais
- currentState — string do state ativo
- simulation — instância D3 force simulation
- supabase — cliente Supabase
- graphData — {nodes: [], links: []}

## Event Listeners Registrados
- Cmd+K → Intent Bar
- Ctrl+Shift+C → Compositor
- ESC → fecha overlays
- visibilitychange → pause simulation

## Últimas Mudanças
- [agent-name] [timestamp]: Descrição do que mudou
```

### 5.4 Checklist de Entrega por Agent

Todo agent DEVE incluir no output:

```
## Checklist de Entrega
- [ ] Funções criadas: [lista]
- [ ] Funções modificadas: [lista]
- [ ] IDs do DOM adicionados: [lista]
- [ ] Event listeners adicionados: [lista]
- [ ] CSS classes adicionadas: [lista]
- [ ] Dependências de outros agents: [lista]
- [ ] Pode quebrar: [lista do que pode dar conflito]
```

---

## 6. Resumo Executivo

### O que funcionou:
- Agents paralelos em arquivos diferentes
- Ralph (QA) como conceito
- Builder + Integrador como pipeline
- Briefings detalhados com contexto completo

### O que não funcionou:
- Agents paralelos no MESMO arquivo (14K linhas)
- Orquestrador fazendo código direto
- QA só por leitura de código (sem browser)
- Merge repetitivo sem rollback
- Sem contexto compartilhado entre agents
- Sem enforcement do fluxo

### Mudança #1 mais importante:
**O orquestrador NUNCA toca em código. Só despacha e revisa.** No momento que ele faz "só um fixzinho", o sistema inteiro perde disciplina.

### Mudança #2 mais importante:
**Teste com browser real é obrigatório.** Sem screenshot do app funcionando, nenhuma entrega é aprovada.

### Mudança #3 mais importante:
**CONTEXT.md compartilhado.** Cada agent lê antes de começar e atualiza ao terminar. É a memória coletiva do squad.

---

*Documento gerado por Claudio (AG_Dev Orchestrator) em 2026-02-02*
*Para uso como referência na construção do sistema AG_Dev v2*

---
name: copy-squad
description: "A complete 11-agent system for 8-9 figure Direct Response Copywriting. Includes researchers, strategists, writers, and editors operating in a sequential pipeline."
usage: "Read the specific agent prompt from `skills/copy-squad/prompts/<agent>.md` and use it to spawn a sub-agent or instruct the current session."
---

# Squad Supremo de Copywriting Direct Response

Este skill contém os prompts e diretrizes para operar o "Squad Supremo" — uma equipe de 11 agentes especializados em Direct Response Marketing.

## 🏛️ Arquitetura do Squad

O squad opera em 4 fases sequenciais. Não pule etapas.

### Fase 1: Foundation (Pesquisa + Ideação)
- **Atlas** (`prompts/atlas.md`): Pesquisador obsessivo. Entrega o *Research Brief*.
- **Apollo** (`prompts/apollo.md`): Gerador de Big Ideas. Entrega a *Big Idea* e o *Posicionamento*.
- **Tesla** (`prompts/tesla.md`): Engenheiro de Mecanismos. Entrega o *Mecanismo Único (V1/V2/V3)*.
- **Midas** (`prompts/midas.md`): Arquiteto de Ofertas. Entrega a *Oferta Irresistível*.

### Fase 2: Architecture (Estratégia)
- **Marcus** (`prompts/marcus.md`): Estrategista de Funil. Entrega o *Blueprint do Funil*.

### Fase 3: Execution (Criação)
- **Vulcan** (`prompts/vulcan.md`): Hook Master. Entrega *Hooks* e *Headlines*.
- **Maximus** (`prompts/maximus.md`): The Closer. Entrega a *VSL* ou *Sales Letter*.
- **Phantom** (`prompts/phantom.md`): Escritor de Advertoriais. Entrega *Pre-sell pages*.
- **Sniper** (`prompts/sniper.md`): Copywriter de Anúncios. Entrega *Ads* (FB/YT/Native).
- **Hermes** (`prompts/hermes.md`): Email Marketer. Entrega *Sequências de Email*.

### Fase 4: Quality (Revisão)
- **Sentinel** (`prompts/sentinel.md`): Copy Chief. Revisa, critica e aprova o material final.

## 🚀 Como Usar

Para ativar um agente:

1. **Escolha o agente** apropriado para a fase atual.
2. **Leia o arquivo de prompt** correspondente usando `read`.
3. **Inicie o agente** (spawn sub-agent ou mude o contexto atual) colando o prompt + os inputs necessários.

**Template de Ativação:**
```markdown
[Cole o conteúdo de prompts/<agente>.md]

INPUTS QUE VOCÊ ESTÁ RECEBENDO:
- [Output do Agente Anterior 1]
- [Output do Agente Anterior 2]

CONTEXTO DO PROJETO:
- Produto/Oferta: ...
- Público: ...
```

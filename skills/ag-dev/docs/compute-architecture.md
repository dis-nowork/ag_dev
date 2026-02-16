> *Migrated from claudio-motor (v1) — reference document*

# Claudio OS — Arquitetura de Compute Elástico

*Documento de visão — 06 Fev 2026*

---

## 🎯 O Problema Atual

**VPS Fixo (Hetzner CPX32):**
- 4 vCPU, 8GB RAM, 160GB disco
- ~€20/mês fixo (ligado 24/7)
- **Não escala** — uma tarefa pesada trava tudo
- **Sem GPU** — modelos de AI locais impossíveis
- **Gargalo** — não posso paralelizar trabalho pesado

**Consequências:**
- Remotion? Muito pesado, não roda
- Qwen3-TTS? Precisa GPU, impossível
- 10 crawlings simultâneos? Vai travar
- Processamento de vídeo? Impraticável

---

## 🚀 A Nova Arquitetura: Compute Elástico

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDIO COMPUTE GRID                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   VPS BASE   │    │   HETZNER    │    │   RUNPOD     │       │
│  │   (sempre)   │    │   WORKERS    │    │   GPU        │       │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤       │
│  │ • OpenClaw   │    │ • Remotion   │    │ • Qwen3-TTS  │       │
│  │ • Orchestr.  │    │ • Crawling   │    │ • Whisper    │       │
│  │ • Light ops  │    │ • Processing │    │ • Image Gen  │       │
│  │ • Scheduling │    │ • Parallel   │    │ • Future LLM │       │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤       │
│  │  €20/mês     │    │  €0.006/h    │    │  $0.20/h     │       │
│  │  (fixo)      │    │  (sob dem.)  │    │  (sob dem.)  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  ORQUESTRADOR   │                          │
│                    │  (no VPS base)  │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 Capacidades Novas

### 1. **Paralelização Massiva**
Antes: 1 crawling por vez
Depois: Spawn 10 workers → 10 crawlings → destroy

```
Tempo: 10 sites × 5min = 50min → 5min (10x mais rápido)
Custo: 10 × €0.006 × 0.08h = €0.005 (~R$0.03)
```

### 2. **GPU sob Demanda**
Antes: Impossível rodar modelos de AI localmente
Depois: API call → RunPod processa → resultado

```
Qwen3-TTS: texto → áudio em 10-30 segundos
Custo por áudio de 1 min: ~$0.01-0.02
```

### 3. **Tarefas Pesadas Isoladas**
Antes: Remotion travaria o VPS inteiro
Depois: Worker dedicado, VPS continua respondendo

```
Renderizar 5 min de vídeo: ~10 min em worker
Custo: €0.006 × 0.17h = €0.001 (~R$0.006)
```

### 4. **Escala Vertical Temporária**
Antes: Limitado a 8GB RAM sempre
Depois: Precisa de 32GB? Spawn cx53 por 10 min

```
Processar dataset de 20GB: spawn → processa → destroy
Custo: €0.03 × 0.17h = €0.005
```

---

## 📊 Ferramentas Atuais — Análise de Migração

| Ferramenta | Onde Roda Hoje | Migrar? | Por quê |
|------------|----------------|---------|---------|
| **OpenClaw** | VPS Base | ❌ Não | Precisa estar sempre on |
| **Crons/Schedulers** | VPS Base | ❌ Não | Orquestração central |
| **Crawl4ai** | VPS Base | ⚠️ Opcional | Migrar se >5 simultâneos |
| **Docling** | VPS Base | ⚠️ Opcional | Migrar se PDFs >50MB |
| **n8n** | VPS Base | ❌ Não | Precisa persistência |
| **Remotion** | ❌ Não roda | ✅ Hetzner Worker | CPU-intensive |
| **Qwen3-TTS** | ❌ Não roda | ✅ RunPod GPU | Requer GPU |
| **Whisper (local)** | VPS Base (lento) | ✅ RunPod GPU | 10x mais rápido |
| **Image Gen** | API externa | ⚠️ Opcional | RunPod se quiser SDXL local |
| **LLMs locais** | ❌ Impossível | ✅ RunPod GPU | Ollama, Llama, etc |

---

## 🔄 Workflow Novo

### Antes (Estático):
```
Usuário pede → Claudio tenta → Falha (sem recurso) ou Lento
```

### Depois (Elástico):
```
Usuário pede → Claudio avalia recurso necessário →
  Se leve: executa local
  Se CPU-heavy: spawn Hetzner worker → executa → destroy
  Se GPU-heavy: chama RunPod endpoint → recebe resultado
```

### Exemplo Real — "Gera um vídeo de 2 min sobre X com narração"

```
1. [VPS] Claudio gera script com Claude
2. [VPS] Claudio gera copy da narração
3. [RunPod] Qwen3-TTS gera áudio da narração
4. [VPS] Claudio busca assets (Pexels, etc)
5. [Hetzner Worker] Remotion renderiza vídeo
6. [VPS] Claudio entrega vídeo final

Tempo total: ~5-10 min
Custo compute: ~$0.10-0.20
```

---

## 💰 Economia de Custos

### Modelo Antigo (se quiséssemos GPU fixa):
- VPS com GPU: ~€150-300/mês
- Subutilizado 95% do tempo

### Modelo Novo (elástico):
- VPS Base: €20/mês (fixo)
- Workers Hetzner: ~€5/mês (estimado, uso esporádico)
- RunPod GPU: ~$10-20/mês (estimado, uso esporádico)
- **Total: ~€35-50/mês** com capacidade 10x maior

### Break-even:
Se usar GPU >50h/mês → considerar GPU dedicada
Abaixo disso → elástico é mais barato

---

## 🛠️ Implementação

### Fase 1 — Hetzner Workers ✅
- [x] API Token configurado
- [x] SSH Keys configuradas
- [x] Orquestrador básico
- [ ] Templates pré-configurados (Docker, Python, Node)
- [ ] Auto-destroy após idle

### Fase 2 — RunPod GPU
- [ ] Conta RunPod + API Key
- [ ] Endpoint Qwen3-TTS (Serverless)
- [ ] Endpoint Whisper (Serverless)
- [ ] Wrapper no Claudio OS

### Fase 3 — Orquestração Inteligente
- [ ] Claudio decide automaticamente onde rodar
- [ ] Estimativa de custo antes de executar
- [ ] Logs unificados
- [ ] Dashboard de uso/custo

### Fase 4 — Expansão
- [ ] Remotion no Hetzner Worker
- [ ] SDXL/Flux local no RunPod
- [ ] LLMs locais (Llama, Qwen) no RunPod
- [ ] Paralelização automática de crawling

---

## 🎯 Resumo Executivo

**O que muda:**
- De "tenho 8GB, me viro" → "tenho o mundo, pago pelo uso"
- De "isso não roda aqui" → "onde devo rodar isso?"
- De "vou demorar 1 hora" → "spawn 10 workers, 6 minutos"

**Capacidades novas:**
- TTS de qualidade local (Qwen3-TTS)
- Vídeo programático (Remotion)
- Whisper local rápido
- Crawling massivo paralelo
- Qualquer ferramenta que precise de mais poder

**Custo:**
- Base: ~€20/mês (o que já pagamos)
- Elástico: ~€15-30/mês adicional (estimativa)
- ROI: Capacidade 10x por ~2x o custo

---

*Este documento evolui conforme implementamos. Versão 1.0*

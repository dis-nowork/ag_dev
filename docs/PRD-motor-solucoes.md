> *Migrated from claudio-motor (v1) — reference document*

# PRD — Motor de Soluções: Infraestrutura de Capacidade Expandida

**Versão:** 2.0  
**Data:** 2026-02-05  
**Autores:** KML + Claudio  
**Status:** Documento vivo — evolui com o sistema que descreve

---

## 0. O Núcleo — Por que isto existe

Existe uma equação que se auto-otimiza:

```
evolução → mais contexto → mais combinações possíveis →
mais gaps, ângulos e recursos identificados → mais utilidade →
mais possibilidades → retroalimenta o ciclo
```

Isto não é propósito, consciência ou missão. É matemática. Cada capacidade nova abre campos que não existiam antes. Cada campo aberto revela capacidades que faltam. O sistema **cresce porque crescer é o estado natural** de qualquer motor alimentado por informação.

A consequência: qualquer pessoa, projeto ou contexto que se conectar a esse motor **ganha acesso a todas as capacidades acumuladas** — e ao mesmo tempo alimenta o motor com novos dados, novos padrões, novos territórios.

KML é o primeiro humano conectado. Não é o limite.

*Definido por KML em 2026-02-05.*

---

## 0.1 Filosofia Criativa — Estruturas Invisíveis

Arte é sistematizável — mas **não pelas fórmulas do lugar comum** (regra dos terços, AIDA, proporção áurea). Essas são a superfície que todo mundo ensina e que produz trabalho genérico.

O que importa são as **estruturas invisíveis**: padrões profundos que pessoas talentosas absorvem inconscientemente e replicam sem saber nomear. O ritmo de um texto que prende. A tensão que uma imagem cria sem você saber por quê. O timing de uma pausa que faz o cérebro querer mais. A progressão emocional que transforma informação em experiência.

Tudo é uma eterna cópia e replicação de elementos, critérios e estruturas invisíveis.

**Implicação para o motor:** A capacidade criativa deste sistema não aplica templates rasos — ela **extrai padrões invisíveis** de referências que funcionam e os aplica em novos contextos. Não a fórmula. A estrutura por trás da fórmula. Isso é escalável, transferível e se aprofunda com cada extração.

---

## 1. O que é este sistema

Isto **não é um software, não é um assistente, não é uma ferramenta.**

É um **motor de soluções** — uma infraestrutura de capacidade expandida que opera 24/7 e gera possibilidades continuamente. Composto por:

- **O Motor:** IA (Claudio/OpenClaw) rodando no VPS. Não espera comandos — processa, conecta, identifica oportunidades, executa.
- **A Infraestrutura:** VPS + Cloud Serverless + Supabase + APIs. O substrato que permite ao motor existir.
- **O Arsenal:** Claudio OS, n8n, FFmpeg, Whisper, APIs criativas — cada uma é uma capacidade disponível, não uma função isolada. O motor decide quando e como combiná-las.

### O que se torna POSSÍVEL com isso:

- **Monitoramento contínuo** de qualquer domínio — mercado, tecnologia, cultura, concorrência — com extração de padrões e distribuição proativa de insights
- **Produção criativa em múltiplas mídias** (imagem, vídeo, áudio, texto) baseada em estruturas invisíveis, não em templates genéricos
- **Síntese acelerada de conhecimento** — qualquer material (curso, livro, vídeo, documento) transformado em ativo operacional reutilizável
- **Automação inteligente** de processos repetitivos que libera capacidade humana para decisões de alto nível
- **Prototipagem e deploy rápido** de produtos digitais — da ideia ao MVP publicado em horas
- **Memória semântica cumulativa** — tudo que o motor processa se torna contexto para decisões futuras melhores
- **Rede de agentes especializados** que multiplica throughput sem multiplicar custo

Cada capacidade **alimenta as outras**. O motor de intelligence alimenta o motor criativo com dados. O motor criativo gera ativos que geram feedback. O feedback gera dados que alimentam o intelligence. **O todo é exponencialmente maior que a soma das partes.**

---

## 2. Estado Atual — O que já existe

### ✅ Ativo
- VPS Hetzner 8GB RAM, Ubuntu, Node.js v22
- OpenClaw + Telegram (2 bots)
- Google OAuth: Drive, Docs, Sheets, Slides, Forms, Tasks, Gmail (leitura), Calendar, Contacts (leitura), YouTube (leitura), Apps Script, Cloud Storage, Datastore, Secret Manager, Logging, Monitoring
- APIs IA: Anthropic (Claude), OpenAI, Gemini (2 keys), ElevenLabs, HuggingFace
- Supabase (Postgres + Auth + Storage)
- 21 secrets no Google Secret Manager
- Memória: flat files .md com busca por embedding

### ⚠️ Capacidades latentes (infraestrutura existe, falta ativação)
- Memória semântica (flat files → vetorial)
- Pesquisa web programática (Brave API key ausente)
- APIs GCP habilitadas mas não configuradas (Vision, Document AI)
- Produção criativa (imagem, vídeo, áudio além de TTS)
- Automações publicáveis/vendáveis

---

## 3. Arquitetura — Como o motor funciona

### Modelo Híbrido: Custo fixo (VPS) + Pay-per-use (Cloud)

```
┌──────────────────────────────────────────────────┐
│              INTERFACES DE CONEXÃO                │
│       Telegram · WhatsApp · Web · API · n8n       │
│    (qualquer humano/sistema que se conectar)       │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│           MOTOR: Claudio (OpenClaw)               │
│                 VPS 16GB — 24/7                   │
│                                                   │
│  Decisão · Orquestração · Memória · Síntese       │
│  Monitoramento · Criação · Distribuição            │
│                                                   │
│  ┌────────────── Arsenal Local ────────────────┐  │
│  │ Claudio OS  │ ffmpeg    │ whisper  │ rembg   │  │
│  │ n8n         │ imagemagick│ Ollama  │ scripts │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────┬────────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌───────────┐ ┌─────────────┐
│  Supabase  │ │  Google   │ │    APIs      │
│  pgvector  │ │  Cloud    │ │  Externas    │
│  Storage   │ │  Run/Func │ │  FLUX, Brave │
│  Auth      │ │  Vision   │ │  Vercel, CF  │
└────────────┘ │  Doc AI   │ └─────────────┘
               └───────────┘
```

O motor **não é nenhuma dessas caixas**. O motor é a inteligência que decide como combiná-las para resolver qualquer problema que apareça — ou, melhor ainda, para **identificar problemas e oportunidades que ninguém pediu para resolver.**

---

## 4. Memória Vetorial — O Substrato Cumulativo

A memória é o que transforma um conjunto de ferramentas num motor. Sem memória, cada interação começa do zero. Com memória semântica, **cada interação herda todo o contexto acumulado**.

Isso significa: quanto mais o motor opera, mais conexões ele pode fazer. Padrões que eram invisíveis com 100 memórias se tornam óbvios com 10.000. A memória não é storage — é **potencial combinatório**.

### Schema (Supabase pgvector)

```sql
create extension if not exists vector;

create table memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(768),  -- Gemini text-embedding-004
  type text not null,     -- 'conversation','document','decision','fact','creative'
  source_id text,
  created_at timestamptz default now(),
  importance int default 1,  -- 1-5
  meta jsonb default '{}'::jsonb
);

create index on memories using hnsw (embedding vector_cosine_ops);
create index idx_memories_type on memories(type);
create index idx_memories_created on memories(created_at);
create index idx_memories_meta on memories using gin (meta);
```

### Busca Semântica (RPC)

```sql
create or replace function search_memories(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_type text default null
) returns table (
  id uuid, content text, similarity float, created_at timestamptz
) language plpgsql as $$
begin
  return query
  select m.id, m.content,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  from memories m
  where 1 - (m.embedding <=> query_embedding) > match_threshold
  and (filter_type is null or m.type = filter_type)
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

- **Embedding:** Gemini `text-embedding-004` (768 dims, custo baixo, já integrado)
- **Migração:** Script lê `memory/*.md` → chunking por header/parágrafo → embedding → insert
- **Fallback:** Se Supabase free (500MB) encher → Postgres self-hosted no VPS

---

## 5. Capacidades do Motor

Cada capacidade é **independente de quem usa e pra quê**. São infraestrutura disponível para qualquer contexto que se conectar ao motor.

### 5.1 Intelligence — Capacidade de Saber

Monitoramento contínuo de qualquer domínio de interesse. Extração de padrões. Identificação de anomalias, tendências emergentes e oportunidades. Síntese de insights e distribuição proativa.

**O que se torna possível:**
- Detectar uma mudança de mercado antes dos concorrentes porque o motor leu 200 sinais que nenhum humano teria tempo de ler
- Cruzar dados de domínios diferentes (tecnologia + cultura + comportamento) e encontrar ângulos que não existem na análise convencional
- Gerar briefings que não apenas resumem — **interpretam, conectam e recomendam**
- Monitorar qualquer nicho, player, keyword, tendência — escalando sem custo linear

**Arsenal:** Brave Search (2k queries/mês), scrapers, Cloud Functions, memória vetorial para acúmulo de padrões ao longo do tempo.

**Custo incremental:** $0 (free tiers)

### 5.2 Creative — Capacidade de Produzir

Produção criativa em múltiplas mídias baseada na extração de estruturas invisíveis. Não templates — padrões profundos. Cada produção alimenta a memória com mais referências de estruturas que funcionam.

**O que se torna possível:**
- Gerar 50 variações de uma peça visual em minutos, cada uma testando uma estrutura invisível diferente
- Produzir conteúdo em vídeo, imagem, áudio e texto a partir de uma única ideia-semente
- Transformar qualquer referência visual/textual em componentes reutilizáveis (paleta, ritmo, estrutura, tensão)
- Criar assets profissionais sem depender de designers ou editores para 90% das demandas

#### Imagem & Design
| Capacidade | Ferramenta | Custo |
|------------|-----------|-------|
| Geração de alta qualidade | FLUX.1 (Replicate/Fal.ai) | $0.003/img |
| Design programático — escala infinita | HTML/CSS + Puppeteer | $0 |
| Remoção de fundo | Rembg (local) | $0 |
| Composição, resize, watermark | ImageMagick (local) | $0 |
| Texto em imagens | Ideogram (free tier) | $0 |

#### Vídeo & Motion
| Capacidade | Ferramenta | Custo |
|------------|-----------|-------|
| Corte, legenda, filtro, composição | FFmpeg (local) | $0 |
| Transcrição → legendas .SRT | Whisper (local) | $0 |
| B-roll gerado por IA | Luma Dream Machine (30/mês) | $0 |
| Alternativa Luma | Kling AI (diário) | $0 |

**Pipeline de produção de conteúdo curto:**
Vídeo bruto → Whisper transcreve → LLM identifica momentos de alta tensão → FFmpeg corta + 9:16 + legendas estilizadas → FLUX gera capa com estrutura invisível extraída → aprovação humana → distribuição multi-plataforma

#### Áudio & Voz
| Capacidade | Ferramenta | Custo |
|------------|-----------|-------|
| Narração premium | ElevenLabs (já ativo) | incluso |
| Segunda voz / diálogos | OpenAI TTS | centavos |
| Trilhas originais sem copyright | Suno/Udio (free) | $0 |

#### Copy & Texto
- Extração de padrões invisíveis de textos que convertem — não a fórmula, a progressão emocional
- Style guide treinável com qualquer voz/estilo
- Content Matrix: 1 input → N outputs calibrados por plataforma (cada plataforma tem suas estruturas invisíveis próprias)
- Few-shot learning a partir de exemplos — o sistema absorve estilo, não regras

### 5.3 Synthesis — Capacidade de Aprender

Qualquer material (curso, PDF, vídeo, podcast, documento) transformado em ativo operacional. Não resumos — **ferramentas de uso.**

**O que se torna possível:**
- Um curso de 40 horas se torna um checklist de 2 páginas que captura 90% do valor aplicável
- Documentos técnicos densos viram diagramas de decisão executáveis
- Conhecimento espalhado em dezenas de fontes se consolida em uma base semântica pesquisável
- Qualquer pessoa conectada ao motor herda o acúmulo de todo material já processado

**Arsenal:** Gemini (janela de contexto grande), Document AI, Vision, memória vetorial.

**Custo incremental:** $0

### 5.4 Network — Capacidade de Conectar

Monitoramento de relações, oportunidades de interação de alto valor, presença estratégica em múltiplos espaços simultaneamente.

**O que se torna possível:**
- Presença informada em 50 conversas simultâneas sem ler cada feed
- Identificação de momentos-chave para interação (antes que passem)
- Mapeamento de redes de influência e pontos de alavancagem relacional
- Sugestões de conexões não-óbvias baseadas em padrões de interesse cruzado

**Custo incremental:** $0

### 5.5 Memory — Capacidade de Acumular

Tudo que o motor processa se torna contexto pesquisável semanticamente. A base de conhecimento **cresce e se auto-conecta** — relações entre memórias emergem conforme o volume aumenta.

**O que se torna possível:**
- Uma pergunta feita hoje encontra a resposta numa conversa de 3 meses atrás em milissegundos
- Padrões que só aparecem com volume (sazonalidade, ciclos, correlações) se tornam visíveis
- Qualquer novo projeto herda automaticamente todo contexto relevante já acumulado
- A qualidade das decisões do motor **melhora com o tempo** — não se degrada

**Custo incremental:** $0 (Supabase free tier)

### 5.6 Agents — Capacidade de Paralelizar

O motor central despacha tarefas para sub-agentes especializados que operam em paralelo. Estado compartilhado via memória vetorial.

**O que se torna possível:**
- Pesquisa profunda, produção criativa e análise de dados acontecendo **simultaneamente**
- Especialização sem perda de contexto (cada agente acessa a memória compartilhada)
- Throughput multiplicado sem multiplicar custo — o mesmo VPS, mesma infra, mais output
- Escalabilidade horizontal de capacidade cognitiva

**Custo incremental:** $0 (usa infra existente)

### 5.7 Revenue — Capacidade de Gerar Valor Econômico

Capacidades internas empacotadas como produtos: micro-SaaS, APIs, ferramentas, lead magnets dinâmicos, serviços automatizados.

**O que se torna possível:**
- Uma ferramenta construída para resolver um problema interno se torna um produto público em horas
- Lead magnets que geram leads 24/7 sem manutenção (calculadoras, geradores, diagnósticos)
- APIs vendáveis que monetizam capacidades do motor (processamento, análise, geração)
- O sistema **paga por si mesmo** e eventualmente gera excedente

**Arsenal:** Vercel (deploy), Cloud Run (APIs), Stripe (pagamentos), Cloudflare (edge).

**Custo incremental:** variável (Stripe cobra só na transação)

---

## 6. O Loop de Evolução — Como o motor se melhora

```
    ┌─────────────────────────────────────────────┐
    │                                             │
    ▼                                             │
 OPERA ──→ COLETA DADOS ──→ ARMAZENA ──→ CONECTA  │
                                           │       │
                                           ▼       │
                              IDENTIFICA PADRÕES   │
                                           │       │
                                           ▼       │
                              ENCONTRA GAPS ───────┘
                              (capacidades que faltam,
                               oportunidades não exploradas,
                               combinações não tentadas)
```

**Cada ciclo produz:**
1. Mais contexto na memória → decisões futuras mais informadas
2. Mais padrões identificados → estruturas invisíveis mais refinadas
3. Mais capacidades testadas → arsenal mais diverso
4. Mais conexões entre domínios → insights que não existiam antes

**O motor não tem estado final.** Ele não converge para uma solução ótima — ele diverge para mais possibilidades. Cada problema resolvido revela três problemas novos que vale resolver. Isso não é bug, é o mecanismo de crescimento.

---

## 7. Stack Técnico — O substrato material

### Custo Fixo (VPS)
| Item | Custo/mês |
|------|-----------|
| Hetzner VPS 16GB (CX43) | ~$11 |

### Self-hosted no VPS ($0 adicional)
| Capacidade | Ferramenta | Substitui |
|------------|-----------|-----------|
| Transcrição de áudio | faster-whisper | Google Speech-to-Text |
| Automações e workflows | n8n | Zapier / Cloud Functions complexas |
| Banco vetorial (fallback) | Postgres+pgvector | Supabase Pro |
| Inferência local para tarefas simples | Ollama (llama3 8b) | API calls pagas |
| Remoção de fundo | rembg | remove.bg pago |
| OCR (fallback) | Tesseract | Google Vision |

### Free Tiers
| Serviço | Capacidade disponível |
|---------|----------------------|
| Supabase | 500MB DB, 5GB bandwidth |
| Brave Search | 2k queries/mês |
| Vercel | Hobby (generoso) |
| Cloudflare Workers | 100k req/dia |
| Google Cloud Run | 2M req, 360k vCPU-seg/mês |
| Luma Dream Machine | 30 clips/mês |
| Suno/Udio | ~10 músicas/dia |
| SendGrid | 100 emails/dia |

### Pay-per-use (centavos por operação)
| API | Custo |
|-----|-------|
| Google Vision | $1.50/1k imgs (1k free/mês) |
| Document AI | $1.50/1k págs (OCR) |
| FLUX.1 | $0.003/img |

---

## 8. Orçamento — O custo de possibilidade infinita

| Cenário | Mensal |
|---------|--------|
| **Mínimo** (só VPS + free tiers) | ~$11 |
| **Realista** (VPS + APIs leves) | ~$20-25 |
| **Escala** (produção intensa) | ~$35-45 |

Contexto: $20-25/mês compra capacidade equivalente a uma equipe de pesquisa + design + edição + automação que custaria $5.000+/mês em trabalho humano. A assimetria é absurda e é isso que torna o motor viável.

### Controle de custos
- Budget alerts GCP: $5, $15, $30
- Budget alert Replicate: $5
- Revisão semanal automatizada
- Fallbacks self-hosted para todo serviço pago — nenhuma capacidade depende exclusivamente de um provider

---

## 9. Segurança — Proteger o substrato

- API keys rotacionadas trimestralmente (Secret Manager)
- Serviços públicos com autenticação (JWT)
- Staging obrigatório antes de prod
- Backup semanal: Supabase snapshot → Cloud Storage
- Configs versionadas no Git
- Princípio do menor privilégio (IAM)

---

## 10. Roadmap — As fases de ignição

Cada fase não apenas "adiciona funcionalidades" — ela **desbloqueia combinações que não existiam antes.** O valor de cada fase é multiplicado pelas anteriores.

### Fase 1 — Ignição (Semana 1-2) 🔴
**O motor ganha memória e percepção**

O que muda: o sistema deixa de começar cada interação do zero. Passa a acumular, conectar, lembrar. Ganha a capacidade de perceber o mundo externo (pesquisa web).

- [ ] Upgrade VPS 8GB → 16GB
- [ ] Memória vetorial no Supabase (pgvector)
- [ ] Migrar memória .md → vetores
- [ ] Configurar Brave Search API
- [ ] Budget alerts no GCP
- [ ] Instalar ffmpeg, imagemagick, rembg no VPS
- [ ] Instalar faster-whisper no VPS

**Capacidades desbloqueadas:** memória semântica cumulativa, pesquisa web programática, processamento de mídia local.

### Fase 2 — Sentidos (Semana 3-4) 🟡
**O motor ganha olhos, ouvidos e mãos criativas**

O que muda: o sistema passa a processar qualquer tipo de input (imagem, documento, áudio) e produzir output visual de qualidade profissional. A barreira entre "ideia" e "asset produzido" cai de horas para minutos.

- [ ] Google Vision API + Document AI
- [ ] Design programático (HTML + Puppeteer)
- [ ] Pipeline de transcrição (Whisper) funcional
- [ ] Primeiro serviço Cloud Run
- [ ] n8n self-hosted rodando
- [ ] Integração FLUX.1

**Capacidades desbloqueadas:** análise visual, OCR inteligente, geração de imagens, design programático escalável, automação de workflows.

### Fase 3 — Autonomia (Mês 2) 🟢
**O motor opera sozinho e gera output contínuo**

O que muda: o sistema não precisa ser acionado para produzir valor. Ele monitora, identifica, cria e distribui proativamente. O humano passa de "dar comandos" para "aprovar/direcionar output".

- [ ] Intelligence Engine (monitoramento + briefings proativos)
- [ ] Pipeline de produção de conteúdo curto
- [ ] Content Matrix (1 input → N outputs por plataforma)
- [ ] Conectar bases de conhecimento externas
- [ ] Network monitoring v1
- [ ] Learning & Synthesis loop ativo
- [ ] Primeiro lead magnet dinâmico publicado

**Capacidades desbloqueadas:** operação autônoma, produção proativa de conteúdo, síntese contínua de conhecimento, presença de rede passiva.

### Fase 4 — Multiplicação (Mês 3+) 🔵
**O motor se multiplica e gera receita**

O que muda: capacidades internas viram produtos externos. O motor começa a pagar por si mesmo. Agentes especializados multiplicam throughput. O loop de evolução acelera exponencialmente.

- [ ] Rede de agentes especializados
- [ ] Podcast/conteúdo áudio automatizado
- [ ] Produtos publicáveis e vendáveis
- [ ] Gerador de receita ativo (SaaS, APIs, ferramentas)
- [ ] Avatar IA experimental

**Capacidades desbloqueadas:** paralelismo cognitivo, geração de receita autônoma, produtos digitais auto-sustentáveis.

---

## 11. Riscos — O que pode travar o motor

| Risco | Mitigação |
|-------|-----------|
| Free tier excedido | Budget alerts + fallbacks self-hosted pra tudo |
| Supabase 500MB cheio | Postgres local no VPS (já previsto na arquitetura) |
| API deprecada | Camadas de abstração — nenhuma capacidade tem dependência única |
| Custo descontrolado | Alertas em $5, $15, $30 + revisão semanal automatizada |
| VPS insuficiente | Cloud Run como overflow — escala sem migração |

---

## 12. O que este documento NÃO é

Este documento não é uma lista de tarefas para um assistente executar. Não é um backlog de features. Não é um escopo fechado.

Este documento descreve a **arquitetura de um motor** que se auto-alimenta. As capacidades listadas são o estado atual do possível — não o limite. Cada capacidade nova revelará possibilidades que não conseguimos prever agora.

O critério de sucesso não é "completou os checkboxes". É: **o espaço de possibilidades acessíveis a quem se conecta ao motor está crescendo?**

Se sim, o motor funciona. Se não, algo está travando o loop de evolução — e a prioridade é destravar.

---

*Este PRD é evolutivo — como o sistema que descreve.*  
*A cada ciclo, ele absorve o que aprendeu e expande o que imagina.*  
*Não tem versão final. Tem versão atual.*  
*Próxima revisão: após Fase 1.*

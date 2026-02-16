# Copywriter

> Gera textos de alta conversão: headlines, CTAs, descrições, posts para social media.

## Descrição

Esta skill transforma pedidos vagos em copy profissional usando frameworks de Direct Response Marketing. Não é um gerador de texto genérico — é um **copywriter especialista** que conhece AIDA, PAS, power words, e as melhores práticas de cada plataforma.

## Triggers

Palavras que ativam esta skill:
- "escreve", "cria texto", "copy", "headline"
- "descrição", "CTA", "call to action"
- "post para", "legenda", "bio"
- "email", "assunto", "subject line"
- "anúncio", "ad copy"

## Requirements

### API Keys
- `GOOGLE_API_KEY_GEMINI`: Para Gemini Flash/Pro (primário)
- `OPENAI_API_KEY`: Para GPT-4o-mini (fallback)

### Dependencies
- Python 3.8+
- lib/text.py, lib/keys.py, lib/cost.py

## Tipos de Copy

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `headline` | Título impactante, máx 10 palavras | "7 Dias Para Dobrar Suas Vendas" |
| `cta` | Botão de ação, máx 5 palavras | "Quero Vender Mais" |
| `description` | Texto curto PAS, 2-4 frases | Problema → Agitação → Solução |
| `social_post` | Post completo com hook + CTA | Para Instagram, LinkedIn, etc |
| `email_subject` | Assunto de email, máx 50 chars | "a coisa que ninguém te conta" |
| `ad_copy` | Copy para anúncios | Facebook, Google, YouTube |
| `bio` | Bio de perfil | Quem + O que + Para quem + CTA |

## Tons de Voz

| Tom | Uso | Exemplo |
|-----|-----|---------|
| `urgente` | Escassez, FOMO | "Últimas vagas HOJE" |
| `autoridade` | Expert, confiança | "Método comprovado por..." |
| `casual` | Conversa, próximo | "Olha, sabe o que funciona..." |
| `inspiracional` | Motivar, elevar | "Imagine alcançar..." |
| `provocativo` | Desafiar, polêmico | "Pare de fazer isso..." |

## Workflow

### 1. Dry-Run (OBRIGATÓRIO)
```bash
python skills/copywriter/scripts/generate.py \
  --prompt "headline pro meu café artesanal" \
  --type headline \
  --tone autoridade \
  --dry-run
```

Output mostra:
- Prompt otimizado que será usado
- Framework aplicado (estrutura + técnicas)
- Custo estimado (~$0.002)

### 2. Gerar Copy
```bash
python skills/copywriter/scripts/generate.py \
  --prompt "headline pro meu café artesanal" \
  --type headline \
  --tone autoridade \
  --output output/headline.txt
```

### 3. Iterar (Pilar 4)
```bash
python skills/copywriter/scripts/generate.py \
  --iterate-from "Café Artesanal Premium" \
  --iterate-instruction "mais urgente e com número" \
  --output output/headline_v2.txt
```

## Inteligência do Prompt (O Diferencial)

Esta skill NÃO usa templates genéricos. Cada tipo de copy tem:

### Headlines
- Estrutura: Máximo 10 palavras, um benefício claro
- Técnicas: Números específicos, palavras de poder, curiosidade
- Evita: Jargão, promessas vagas, múltiplas ideias

### CTAs
- Estrutura: Verbo imperativo + benefício
- Técnicas: Micro-compromisso, resultado implícito
- Evita: "Clique aqui", "Saiba mais", genéricos

### Social Posts
- Estrutura: Hook (1 linha) + Desenvolvimento + CTA + Hashtags
- Técnicas: Primeira linha para o scroll, quebras de linha, emojis estratégicos
- Plataformas: Regras específicas para Instagram, LinkedIn, Twitter

### Email Subjects
- Estrutura: Máximo 50 chars, curiosidade ou benefício
- Técnicas: Personalização, minúsculas, emoji no início
- Evita: CAPS, exclamações, spam triggers

## Composição

Quando usada sozinha, entrega copy pronto.

Quando parte de um pipeline:
- `content-pack`: Fornece copy para acompanhar imagem
- `landing-page`: Fornece headline + description + CTA
- `stories-pack`: Fornece sequência de textos

## Iteração (Pilar 4)

Para ajustar copy existente sem reescrever do zero:

```bash
# Original: "Café Artesanal Premium"
# Ajuste: "mais urgente"

python scripts/generate.py \
  --iterate-from "Café Artesanal Premium" \
  --iterate-instruction "adicione urgência e um número" \
  --output output/headline_v2.txt

# Resultado: "7 Dias: Seu Café Artesanal Premium Acaba Hoje"
```

## Custo

| Provider | Custo/1000 tokens | Uso típico |
|----------|-------------------|------------|
| Gemini Flash | ~$0.00015 | Padrão, rápido |
| Gemini Pro | ~$0.002 | Fallback |
| GPT-4o-mini | ~$0.0015 | Fallback final |

Custo médio por geração: **~$0.002** (menos de 1 centavo)

## Exemplos

### Básico: Headline
```bash
python scripts/generate.py \
  --prompt "loja de roupas femininas plus size" \
  --type headline \
  --dry-run

# Preview: Framework AIDA, tom autoridade
# Custo: ~$0.002

python scripts/generate.py \
  --prompt "loja de roupas femininas plus size" \
  --type headline

# Output:
# 1. "Moda Plus Size Que Abraça Seu Corpo"
# 2. "Vista-se Como Você Sempre Sonhou"
# 3. "5.000 Mulheres Já Encontraram Seu Estilo"
```

### Avançado: Post para Instagram
```bash
python scripts/generate.py \
  --prompt "lançamento de nova coleção primavera" \
  --type social_post \
  --platform instagram \
  --tone inspiracional \
  --brand-context "marca jovem, sustentável, cores vibrantes"

# Output:
# 🌸 A primavera chegou (e trouxe cor)
#
# Depois de meses criando peças que respeitam
# o planeta e celebram seu corpo...
#
# Nossa nova coleção está aqui.
#
# 12 peças. Tecidos sustentáveis.
# Cores que você nunca viu.
#
# 📱 Link na bio - primeiras 50 ganham frete grátis
#
# #modaconsciente #plussizebrasil #novacoleção
```

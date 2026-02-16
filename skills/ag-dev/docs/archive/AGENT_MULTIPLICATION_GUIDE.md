# AG Dev Agent Multiplication System 🚀

## 🎯 Overview

O AG Dev agora suporta **multiplicação de agents** para trabalho paralelo e maior produtividade. Você pode spawnar múltiplos instances do mesmo agent para dividir e acelerar o trabalho.

## 📡 API Endpoints

### 1. Terminal Multiplication

#### `POST /api/terminals`

```json
{
  "type": "agent",
  "name": "dev",
  "task": "Implementar sistema de autenticação",
  "count": 3  // NEW! Spawna 3 devs paralelos
}
```

**Características:**
- `count`: 1-4 (default: 1, max: 4)  
- Nomeia como "Dev #1", "Dev #2", etc.
- Retorna array para count > 1, objeto único para count = 1
- Task é contextualizada para trabalho paralelo

**Exemplo de resposta (count=3):**
```json
[
  {
    "id": "term_123",
    "name": "Dev #1", 
    "type": "agent",
    "task": "...\n[Instance 1 of 3] You are working in parallel...",
    "instance": 1,
    "totalInstances": 3
  },
  { "id": "term_124", "name": "Dev #2", ... },
  { "id": "term_125", "name": "Dev #3", ... }
]
```

### 2. Squad with Multiple Devs

#### `POST /api/squads/:id/activate`

```json
{
  "task": "Criar app de ecommerce completo",
  "devCount": 3  // NEW! Spawna 3 devs no squad
}
```

**Comportamento especial:**
- Quando um squad contém o agent "dev", automaticamente spawna múltiplos
- Default: 2 devs paralelos
- Configurável via `devCount` (1-4)
- Outros agents (analyst, qa, architect) permanecem únicos

**Exemplo: Squad fullstack-dev ativado:**
```
Squad: Full Stack Development
Agents spawned:
• Analyst #1          (único)
• Architect #1        (único) 
• Dev #1              (paralelo)
• Dev #2              (paralelo)
• QA #1               (único)

Total: 5 terminais para trabalho colaborativo
```

## 🧠 Como Funciona

### Contextualização Automática

Quando múltiplos agents são spawnados, eles recebem contexto adicional:

```
[DEV #2 of 3] You are working in parallel with 2 other dev agents.
Coordinate your work to avoid duplication and maximize efficiency.
Consider dividing the work by modules, features, or different aspects.
```

### Estratégias de Trabalho Paralelo

**Exemplo de divisão natural:**
- **Dev #1:** Frontend (React components, UI)
- **Dev #2:** Backend (APIs, database, auth)  
- **Dev #3:** DevOps (Docker, CI/CD, deployment)

**Ou por funcionalidades:**
- **Dev #1:** User management module
- **Dev #2:** Product catalog module
- **Dev #3:** Payment & orders module

## 📊 Monitoramento

### Status com Breakdown

```
POST /api/chat
{"message": "status"}

Response:
📊 Status do Sistema:
• Terminais ativos: 7
• Squads ativos: 1
• Agents únicos: 4
• Terminais de squads: 5
• Breakdown: dev×3, analyst×1, qa×1
• Nenhum workflow ativo
```

### Squad Statistics

```
GET /api/squads

Response:
{
  "squads": [...],
  "stats": {
    "totalSquads": 5,
    "activeSquads": 1, 
    "totalActiveAgents": 4,     // Tipos únicos
    "totalActiveTerminals": 5,   // Total running
    "agentBreakdown": {
      "dev": 3,
      "analyst": 1,
      "qa": 1
    }
  }
}
```

## 🎮 Exemplos de Uso

### 1. Squad com Múltiplos Devs

```bash
# Ativar squad fullstack com 3 devs
curl -X POST http://localhost:3456/api/squads/fullstack-dev/activate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Criar marketplace online completo",
    "devCount": 3
  }'
```

### 2. Spawnar Múltiplos Agents Diretamente

```bash
# Spawnar 4 QA agents para testes paralelos
curl -X POST http://localhost:3456/api/terminals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent",
    "name": "qa", 
    "task": "Testar todas as funcionalidades do app",
    "count": 4
  }'
```

### 3. Trabalho Especializado

```bash
# 2 devs backend + 2 devs frontend
curl -X POST http://localhost:3456/api/terminals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent",
    "name": "dev",
    "task": "Implementar APIs REST para ecommerce",
    "count": 2
  }'

curl -X POST http://localhost:3456/api/terminals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent", 
    "name": "dev",
    "task": "Criar interface React para ecommerce",
    "count": 2
  }'
```

## 🏗️ Casos de Uso Ideais

### ✅ Bom para Multiplicação
- **Desenvolvimento:** Módulos paralelos, frontend/backend
- **QA/Testing:** Diferentes browsers, cenários de teste
- **DevOps:** Múltiplos ambientes, diferentes clouds
- **Content:** Diferentes tipos de conteúdo, idiomas

### ❌ Não Ideal para Multiplicação  
- **Product Owner:** Decisões estratégicas (1 voz)
- **Architect:** Visão unificada da arquitetura
- **Scrum Master:** Coordenação central

## 🚫 Limitações

- **Máximo 4 instances** por agent type (evita chaos)
- **Squads únicos:** Não pode ativar o mesmo squad 2x
- **Recursos:** Cada terminal consome recursos do sistema
- **Coordenação:** Agents precisam ser monitorados para evitar conflitos

## 💡 Dicas de Produtividade

1. **Use squads** para trabalho estruturado com múltiplos devs automáticos
2. **Multiple terminals** para trabalho ad-hoc e especializado  
3. **Monitor o breakdown** com `POST /api/chat {"message": "status"}`
4. **Deative squads** quando terminar para liberar recursos
5. **Tasks específicas** ajudam agents a se coordenarem melhor

---

**🎯 Resultado:** Produtividade massivamente aumentada com trabalho paralelo inteligente!
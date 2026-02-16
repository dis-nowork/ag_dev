# Sequência de Inicialização

Quando você roda `node server/server.js`:

## Passo 1: Config
```
config.json → merge com env vars (AG_DEV_PORT, AG_DEV_HOST, AG_DEV_DATA_DIR)
```

## Passo 2: Módulos (ordem exata no server.js)
```
 1. TerminalManager(config.terminals)     → PTY manager (máx 16 terminais)
 2. StateManager()                         → Estado in-memory
 3. Orchestrator(terminal, state, config)  → Cérebro: agents + workflows
 4. SquadManager(orchestrator)             → Times de agents
 5. RalphLoop(terminal, options)           → Dev autônomo
 6. SuperSkillRegistry(superskillsDir)     → 31 ferramentas plugáveis
 7. AgentGraph(dataDir)                    → Grafo temporal (auto-save 30s)
 8. RuntimeLayer(config, callbacks)        → Clawdbot Gateway + fallback ✅ NEW
 9. MemorySystem(baseDir)                  → Memória hot/warm/cold
```

## Passo 3: Carregamento de Assets (automático)
- **14 Agent Definitions** de `core/agents/*.md` (parsing completo: role + expertise + behavior)
- **10 Workflows** de `core/workflows/*.yaml`
- **5 Squad Configs** de `core/squads/*.json`
- **31 SuperSkills** de `superskills/*/manifest.json`

## Passo 4: Server Express
- 56 endpoints API
- SSE para push real-time
- Health check `/health`
- Serve `ui-dist/` estático

## Output no Console:
```
  ℹ Runtime: clawdbot → ws://127.0.0.1:18789
  ✅ Runtime connected successfully
Loaded 5 squad definitions
Loaded 10 workflows
Loaded 14 agent definitions
  30 SuperSkills loaded across 6 categories
🚀 AG Dev server running on http://0.0.0.0:3456
```

---

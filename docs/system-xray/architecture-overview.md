# Visao Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AG Dev v2.1                                │
│              Multi-Agent Development Orchestration Platform          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌───────────┐    ┌────────────────────────┐        │
│  │  UI      │◄──►│  Express  │◄──►│  Módulos Ativos         │        │
│  │  React   │ SSE│  Server   │    │                        │        │
│  │  + Zustand│   │  :3456    │    │  ★ Orchestrator (841L) │        │
│  └──────────┘    │           │    │  ★ TerminalManager     │        │
│                  │  56 APIs  │    │    SquadManager         │        │
│                  │  + SSE    │    │    RalphLoop            │        │
│                  │  + Health │    │    AgentGraph           │        │
│                  └─────┬─────┘    │    MemorySystem         │        │
│                        │          │    StateManager         │        │
│                        │          │    SuperSkillRegistry   │        │
│                        │          │    RuntimeLayer ✅ NEW  │        │
│                        │          └────────────────────────┘        │
│                        │                                             │
│                        ▼          ┌────────────────────────┐        │
│                  ┌───────────┐    │  Core Assets            │        │
│                  │ Claude    │    │  • 14 Agent Personas    │        │
│                  │ Code CLI  │    │  • 10 Workflows YAML   │        │
│                  │ (via PTY) │    │  •  5 Squad Configs     │        │
│                  └───────────┘    │  • 31 SuperSkills       │        │
│                        │          │  • Template Engine      │        │
│                  ┌─────▼─────┐    └────────────────────────┘        │
│                  │ Clawdbot  │                                        │
│                  │ Gateway   │    ★ = Componentes centrais            │
│                  │ (ws:18789)│    Runtime Layer agora integrado       │
│                  └───────────┘    com fallback standalone             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Em uma frase:** AG Dev orquestra múltiplos agentes de IA (cada um com persona especializada completa) para construir software de forma autônoma, usando workflows YAML, squads, terminais PTY reais, grafo temporal, e memória em 3 camadas.

---

# API — 56 Endpoints

## Core (4)
`GET /health` · `GET /api/events` (SSE) · `GET /api/state` · `GET /api/metrics`

## Terminals (6)
`GET /api/terminals` · `POST /api/terminals` · `POST /:id/write` · `POST /:id/resize` · `DELETE /:id` · `GET /:id/buffer`

## Agents (1)
`GET /api/agents`

## Workflows (6)
`GET /api/workflows` · `GET /active` · `POST /active/stop` · `POST /:name/start` · `POST /:name/execute` · `POST /:id/stop`

## Squads (6)
`GET /api/squads` · `GET /active` · `POST /api/squads` · `POST /:id/activate` · `DELETE /:id` · `GET /:id`

## Ralph Loop (6)
`POST /api/ralph/prd` · `POST /start` · `POST /pause` · `POST /resume` · `POST /stop` · `GET /state`

## System (2)
`POST /api/system/pause-all` · `POST /resume-all`

## Chat (1)
`POST /api/chat`

## Project Context (4)
`GET /api/context` · `GET /:filename` · `PUT /:filename` · `POST /api/context`

## Temporal Graph (9)
`GET /api/graph/agents` · `/timeline` · `/heatmap` · `/network` · `/pulse` · `/agent/:id` · `/files` · `/stats` · `POST /events`

## SuperSkills (5)
`GET /api/superskills` · `/search` · `/stats` · `/:name` · `POST /:name/run`

## Runtime (1) NEW
`GET /api/runtime/status`

## Memory (4)
`GET /api/memory/stats` · `/agent/:agentId` · `POST /record` · `POST /fold/:agentId`

## Static (1)
`GET /` (UI)

---

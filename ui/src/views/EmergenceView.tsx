import { memo, useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAgentStore } from '../stores/agentStore'
import { AGENTS, SQUADS, getSquadColor, colors } from '../lib/theme'

function buildGraph(agents: Record<string, any>) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Center node — Project
  nodes.push({
    id: 'project',
    position: { x: 400, y: 50 },
    data: { label: '🎯 Project' },
    style: {
      backgroundColor: colors.bg.surfaceHover,
      color: colors.text.primary,
      border: `2px solid ${colors.accent}`,
      borderRadius: '12px',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: 600,
    },
    sourcePosition: Position.Bottom,
  })

  // Squad nodes
  const squadPositions = {
    builders: { x: 100, y: 200 },
    thinkers: { x: 350, y: 200 },
    guardians: { x: 600, y: 200 },
    creators: { x: 850, y: 200 },
  }

  Object.entries(SQUADS).forEach(([squadId, squad]) => {
    const sc = getSquadColor(squadId as any)
    nodes.push({
      id: `squad-${squadId}`,
      position: squadPositions[squadId as keyof typeof squadPositions],
      data: { label: `${squad.icon} ${squad.label}` },
      style: {
        backgroundColor: sc.bg,
        color: sc.main,
        border: `1.5px solid ${sc.main}40`,
        borderRadius: '10px',
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 600,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    })

    edges.push({
      id: `project-${squadId}`,
      source: 'project',
      target: `squad-${squadId}`,
      style: { stroke: sc.main + '40', strokeWidth: 1.5 },
      animated: false,
    })
  })

  // Agent nodes
  AGENTS.forEach((agent, i) => {
    const sc = getSquadColor(agent.squad)
    const state = agents[agent.id]
    const isActive = state?.status === 'working'
    const isDone = state?.status === 'done'
    const squadPos = squadPositions[agent.squad]
    const agentsInSquad = AGENTS.filter(a => a.squad === agent.squad)
    const indexInSquad = agentsInSquad.indexOf(agent)
    const xOffset = (indexInSquad - (agentsInSquad.length - 1) / 2) * 140

    nodes.push({
      id: `agent-${agent.id}`,
      position: { x: squadPos.x + xOffset, y: 350 },
      data: {
        label: `${agent.icon} ${agent.shortName}\n${state?.status || 'idle'}`,
      },
      style: {
        backgroundColor: isActive ? sc.bg : colors.bg.surface,
        color: isActive ? sc.main : isDone ? colors.status.complete : colors.text.secondary,
        border: `1.5px solid ${isActive ? sc.main : isDone ? colors.status.complete + '40' : colors.bg.border}`,
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '10px',
        fontWeight: 500,
        textAlign: 'center' as const,
        whiteSpace: 'pre-line' as const,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    })

    edges.push({
      id: `squad-${agent.squad}-agent-${agent.id}`,
      source: `squad-${agent.squad}`,
      target: `agent-${agent.id}`,
      style: { stroke: isActive ? sc.main : colors.bg.border, strokeWidth: isActive ? 2 : 1 },
      animated: isActive,
    })
  })

  // Detect collaboration patterns
  const activeAgents = AGENTS.filter(a => agents[a.id]?.status === 'working')
  for (let i = 0; i < activeAgents.length; i++) {
    for (let j = i + 1; j < activeAgents.length; j++) {
      if (activeAgents[i].squad !== activeAgents[j].squad) {
        edges.push({
          id: `collab-${activeAgents[i].id}-${activeAgents[j].id}`,
          source: `agent-${activeAgents[i].id}`,
          target: `agent-${activeAgents[j].id}`,
          style: { stroke: colors.status.blocked + '40', strokeWidth: 1, strokeDasharray: '4' },
          label: 'collaborating',
          labelStyle: { fontSize: 9, fill: colors.text.muted },
        })
      }
    }
  }

  return { nodes, edges }
}

export const EmergenceView = memo(function EmergenceView() {
  const { agents } = useAgentStore()

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildGraph(agents), [agents])
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Patterns
  const activeCount = Object.values(agents).filter(a => a.status === 'working').length
  const doneCount = Object.values(agents).filter(a => a.status === 'done').length
  const errorCount = Object.values(agents).filter(a => a.status === 'error').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
          🌐 Emergence Map
        </h2>
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.text.secondary }}>
          <span>⚡ {activeCount} active</span>
          <span>✅ {doneCount} done</span>
          {errorCount > 0 && <span style={{ color: colors.status.error }}>❌ {errorCount} errors</span>}
        </div>
      </div>

      <div className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: colors.bg.primary }}
        >
          <Background color={colors.bg.border} gap={20} size={1} />
          <Controls
            style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
          />
        </ReactFlow>
      </div>

      {/* Pattern insights */}
      <div className="px-6 py-3 border-t" style={{ borderColor: colors.bg.border }}>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: colors.text.muted }}>
          Patterns Detected
        </h4>
        <div className="flex gap-4 text-xs" style={{ color: colors.text.secondary }}>
          {activeCount > 2 && <span>⚡ High activity: {activeCount} agents working simultaneously</span>}
          {doneCount > 6 && <span>📈 Good progress: {doneCount}/12 agents completed</span>}
          {errorCount > 0 && <span>🔴 Attention: {errorCount} agent(s) with errors</span>}
          {activeCount === 0 && doneCount === 0 && <span>💤 All agents idle — start a task to see the map come alive</span>}
        </div>
      </div>
    </div>
  )
})

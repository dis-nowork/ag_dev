import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { AGENTS, getAgentMeta, getSquadColor, colors } from '../lib/theme'

interface TaskCard {
  id: string
  title: string
  agentId?: string
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  progress: number
}

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', icon: '📥' },
  { id: 'in_progress', label: 'In Progress', icon: '⚡' },
  { id: 'review', label: 'Review', icon: '👁️' },
  { id: 'done', label: 'Done', icon: '✅' },
] as const

export const PipelineView = memo(function PipelineView() {
  const { agents } = useAgentStore()

  // Derive tasks from agent states
  const tasks: TaskCard[] = AGENTS.map(a => {
    const state = agents[a.id] as AgentState | undefined
    if (!state) return null

    const status: TaskCard['status'] =
      state.status === 'done' ? 'done'
        : state.status === 'working' ? 'in_progress'
        : state.status === 'paused' ? 'review'
        : 'backlog'

    return {
      id: a.id,
      title: state.currentTask || a.role,
      agentId: a.id,
      status,
      progress: state.progress || 0,
    }
  }).filter(Boolean) as TaskCard[]

  // Also extract checklist items as subtasks
  const checklistTasks: TaskCard[] = []
  AGENTS.forEach(a => {
    const state = agents[a.id]
    if (!state?.checklist?.length) return
    state.checklist.forEach((item, i) => {
      checklistTasks.push({
        id: `${a.id}-check-${i}`,
        title: item.text,
        agentId: a.id,
        status: item.done ? 'done' : state.status === 'working' ? 'in_progress' : 'backlog',
        progress: item.done ? 100 : 0,
      })
    })
  })

  const allTasks = [...checklistTasks]
  const totalDone = allTasks.filter(t => t.status === 'done').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
          📋 Pipeline
        </h2>
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.text.secondary }}>
          <span>Total: {allTasks.length}</span>
          <span>Done: {totalDone}</span>
          <span>
            Velocity: {(totalDone / Math.max(1, allTasks.length) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {COLUMNS.map(col => {
          const colTasks = allTasks.filter(t => t.status === col.id)
          return (
            <div key={col.id} className="flex-1 min-w-[220px] flex flex-col">
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-t-lg border-b"
                style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
              >
                <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                  {col.icon} {col.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.bg.surfaceHover, color: colors.text.secondary }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div
                className="flex-1 overflow-y-auto space-y-2 p-2 rounded-b-lg border border-t-0"
                style={{ backgroundColor: colors.bg.primary + '80', borderColor: colors.bg.border }}
              >
                {colTasks.map(task => (
                  <TaskCardEl key={task.id} task={task} />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-[10px] text-center py-4" style={{ color: colors.text.muted }}>
                    No tasks
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

function TaskCardEl({ task }: { task: TaskCard }) {
  const meta = task.agentId ? getAgentMeta(task.agentId) : null
  const squadColor = meta ? getSquadColor(meta.squad) : null

  return (
    <motion.div
      className="rounded-lg border p-2.5"
      style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
      whileHover={{ borderColor: squadColor?.main + '40' || colors.bg.borderLight }}
      layout
    >
      <p className="text-xs font-medium mb-1.5 line-clamp-2" style={{ color: colors.text.primary }}>
        {task.title}
      </p>
      <div className="flex items-center justify-between">
        {meta && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: squadColor?.bg, color: squadColor?.main }}
          >
            {meta.icon} {meta.shortName}
          </span>
        )}
        {task.progress > 0 && task.progress < 100 && (
          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.border }}>
            <div className="h-full rounded-full" style={{ backgroundColor: squadColor?.main || colors.accent, width: `${task.progress}%` }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

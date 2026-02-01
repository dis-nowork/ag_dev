import { memo, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Edit3, Clock, AlertTriangle } from 'lucide-react'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { useUIStore } from '../stores/uiStore'
import { AGENTS, getAgentMeta, getSquadColor, colors } from '../lib/theme'

interface GanttTask {
  id: string
  agentId: string
  label: string
  startDay: number
  duration: number
  progress: number
  status: 'done' | 'active' | 'waiting' | 'blocked'
  dependencies: string[]
  directive?: string
}

const defaultState: AgentState = {
  status: 'idle', currentTask: null, checklist: [], progress: 0,
}

// Derive Gantt tasks from agent states + AIOS workflow
function deriveGanttTasks(agents: Record<string, AgentState>): GanttTask[] {
  const workflow: Omit<GanttTask, 'progress' | 'status'>[] = [
    { id: 'brief', agentId: 'analyst', label: 'Project Brief', startDay: 0, duration: 2, dependencies: [] },
    { id: 'prd', agentId: 'pm', label: 'PRD', startDay: 2, duration: 3, dependencies: ['brief'] },
    { id: 'ux-spec', agentId: 'ux-design-expert', label: 'UX Spec', startDay: 3, duration: 3, dependencies: ['prd'] },
    { id: 'architecture', agentId: 'architect', label: 'Architecture', startDay: 4, duration: 3, dependencies: ['prd'] },
    { id: 'validation', agentId: 'po', label: 'PO Validation', startDay: 7, duration: 1, dependencies: ['prd', 'ux-spec', 'architecture'] },
    { id: 'sharding', agentId: 'sm', label: 'Task Sharding', startDay: 8, duration: 2, dependencies: ['validation'] },
    { id: 'db-design', agentId: 'data-engineer', label: 'Database Design', startDay: 8, duration: 2, dependencies: ['architecture'] },
    { id: 'dev-sprint', agentId: 'dev', label: 'Development Sprint', startDay: 10, duration: 5, dependencies: ['sharding', 'db-design'] },
    { id: 'qa-review', agentId: 'qa', label: 'QA & Testing', startDay: 12, duration: 3, dependencies: ['dev-sprint'] },
    { id: 'devops-deploy', agentId: 'devops', label: 'CI/CD & Deploy', startDay: 14, duration: 2, dependencies: ['qa-review'] },
  ]

  return workflow.map(task => {
    const agentState = agents[task.agentId] || defaultState
    const isDone = agentState.status === 'done'
    const isWorking = agentState.status === 'working'
    const isError = agentState.status === 'error'

    const depsDone = task.dependencies.every(depId => {
      const depTask = workflow.find(t => t.id === depId)
      if (!depTask) return true
      const depAgent = agents[depTask.agentId]
      return depAgent?.status === 'done'
    })

    return {
      ...task,
      progress: isDone ? 100 : agentState.progress || 0,
      status: isDone ? 'done' as const
        : isError ? 'blocked' as const
        : isWorking ? 'active' as const
        : !depsDone ? 'blocked' as const
        : 'waiting' as const,
    }
  })
}

export const GanttView = memo(function GanttView() {
  const { agents } = useAgentStore()
  const { selectAgent } = useUIStore()
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const tasks = useMemo(() => deriveGanttTasks(agents), [agents])
  const maxDay = Math.max(...tasks.map(t => t.startDay + t.duration), 16)
  const dayWidth = 100 / maxDay

  const totalDone = tasks.filter(t => t.status === 'done').length
  const totalBlocked = tasks.filter(t => t.status === 'blocked').length
  const criticalPath = tasks.filter(t => t.status !== 'done').map(t => t.label).join(' → ')

  const handleEditDirective = async (taskId: string) => {
    if (!editValue.trim()) { setEditingTask(null); return }
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      await fetch(`/api/agents/${task.agentId}/directive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive: editValue }),
      })
    } catch {}
    setEditingTask(null)
    setEditValue('')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
          📊 Gantt — Dynamic Timeline
        </h2>
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.text.secondary }}>
          <span>✅ {totalDone}/{tasks.length} done</span>
          {totalBlocked > 0 && (
            <span style={{ color: colors.status.blocked }}>
              <AlertTriangle size={12} className="inline mr-1" />
              {totalBlocked} blocked
            </span>
          )}
          <span><Clock size={12} className="inline mr-1" />ETA: {maxDay} days</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="flex items-end mb-1 pl-40">
        {Array.from({ length: maxDay }, (_, i) => (
          <div
            key={i}
            className="text-center text-[9px] flex-shrink-0"
            style={{ width: `${dayWidth}%`, color: colors.text.muted }}
          >
            D{i + 1}
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {tasks.map(task => {
          const meta = getAgentMeta(task.agentId)
          const sc = meta ? getSquadColor(meta.squad) : { main: '#666', bg: 'transparent' }
          const barColor = task.status === 'done' ? colors.status.complete
            : task.status === 'active' ? sc.main
            : task.status === 'blocked' ? colors.status.blocked
            : colors.text.muted

          return (
            <div key={task.id} className="flex items-center group">
              {/* Label */}
              <div
                className="w-40 flex-shrink-0 flex items-center gap-2 pr-3 cursor-pointer hover:opacity-80"
                onClick={() => selectAgent(task.agentId)}
              >
                <span className="text-xs">{meta?.icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: colors.text.primary }}>
                    {task.label}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: colors.text.muted }}>
                    {meta?.shortName} · {task.status}
                  </p>
                </div>
              </div>

              {/* Timeline bar */}
              <div className="flex-1 relative h-8 flex items-center">
                {/* Grid lines */}
                {Array.from({ length: maxDay }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l"
                    style={{ left: `${i * dayWidth}%`, borderColor: colors.bg.border + '40' }}
                  />
                ))}

                {/* Bar */}
                <motion.div
                  className="absolute h-5 rounded-md flex items-center px-1.5 cursor-pointer"
                  style={{
                    left: `${task.startDay * dayWidth}%`,
                    width: `${task.duration * dayWidth}%`,
                    backgroundColor: barColor + '20',
                    border: `1px solid ${barColor}40`,
                  }}
                  whileHover={{ backgroundColor: barColor + '30' }}
                  onClick={() => {
                    setEditingTask(task.id)
                    setEditValue(task.directive || `Direct ${meta?.name || 'agent'}: `)
                  }}
                >
                  {/* Progress fill */}
                  <motion.div
                    className="absolute inset-0 rounded-md"
                    style={{ backgroundColor: barColor + '30', originX: 0 }}
                    animate={{ scaleX: task.progress / 100 }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative text-[9px] font-medium truncate" style={{ color: barColor }}>
                    {task.progress > 0 && task.progress < 100 ? `${task.progress}%` : ''}
                  </span>
                </motion.div>

                {/* Edit button on hover */}
                <button
                  className="absolute opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    left: `${(task.startDay + task.duration) * dayWidth + 0.5}%`,
                    color: colors.text.secondary,
                  }}
                  onClick={() => {
                    setEditingTask(task.id)
                    setEditValue('')
                  }}
                  title="Edit directive"
                >
                  <Edit3 size={10} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit directive panel */}
      {editingTask && (
        <motion.div
          className="border-t p-4"
          style={{ borderColor: colors.bg.border, backgroundColor: colors.bg.surface }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Edit3 size={14} style={{ color: colors.accent }} />
            <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
              Edit Directive — {tasks.find(t => t.id === editingTask)?.label}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditDirective(editingTask); if (e.key === 'Escape') setEditingTask(null) }}
              placeholder="Enter new directive for this agent..."
              className="flex-1 rounded-lg px-3 py-2 text-xs outline-none border"
              style={{ backgroundColor: colors.bg.primary, borderColor: colors.bg.border, color: colors.text.primary }}
              autoFocus
            />
            <button
              onClick={() => handleEditDirective(editingTask)}
              className="rounded-lg px-4 py-2 text-xs font-medium"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              Apply
            </button>
            <button
              onClick={() => setEditingTask(null)}
              className="rounded-lg px-3 py-2 text-xs"
              style={{ color: colors.text.secondary }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Footer — Critical Path */}
      <div className="mt-3 px-1">
        <p className="text-[10px]" style={{ color: colors.text.muted }}>
          ⚡ Critical Path: {criticalPath || 'All done!'}
        </p>
      </div>
    </div>
  )
})

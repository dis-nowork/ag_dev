import { memo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { getAgentMetaDynamic, getSquadColorDynamic, colors } from '../lib/theme'

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

type ColumnId = typeof COLUMNS[number]['id']

export const PipelineView = memo(function PipelineView() {
  const { agents, agentMetas } = useAgentStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, ColumnId>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Derive tasks from agent states
  const tasks: TaskCard[] = agentMetas.map(a => {
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
  agentMetas.forEach(a => {
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

  const allTasks = [...tasks, ...checklistTasks]
  const totalDone = allTasks.filter(t => t.status === 'done').length

  // Apply overrides
  const getTaskStatus = useCallback((task: TaskCard): ColumnId => {
    return overrides[task.id] || task.status
  }, [overrides])

  const getColumnTasks = useCallback((colId: ColumnId) => {
    return allTasks.filter(t => getTaskStatus(t) === colId)
  }, [allTasks, getTaskStatus])

  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = String(active.id)
    let targetCol: ColumnId | null = null

    const colIds: string[] = COLUMNS.map(c => c.id)
    if (colIds.includes(String(over.id))) {
      targetCol = String(over.id) as ColumnId
    } else {
      const overTask = allTasks.find(t => t.id === String(over.id))
      if (overTask) {
        targetCol = getTaskStatus(overTask)
      }
    }

    if (!targetCol) return
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return
    const currentStatus = getTaskStatus(task)
    if (currentStatus === targetCol) return

    setOverrides(prev => ({ ...prev, [taskId]: targetCol }))

    if (task.agentId) {
      const stateMap: Record<ColumnId, string> = {
        backlog: 'idle',
        in_progress: 'working',
        review: 'paused',
        done: 'done',
      }
      fetch(`/api/agents/${task.agentId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stateMap[targetCol] }),
      }).catch(() => {
        setOverrides(prev => {
          const next = { ...prev }
          delete next[taskId]
          return next
        })
      })
    }
  }

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

      {/* Kanban columns with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id)
            return (
              <DroppableColumn key={col.id} id={col.id} label={col.label} icon={col.icon} count={colTasks.length}>
                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map(task => (
                    <SortableTaskCard key={task.id} task={task} />
                  ))}
                </SortableContext>
                {colTasks.length === 0 && (
                  <p className="text-[10px] text-center py-4" style={{ color: colors.text.muted }}>
                    No tasks
                  </p>
                )}
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardEl task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
})

/** Droppable column wrapper */
function DroppableColumn({
  id,
  label,
  icon,
  count,
  children,
}: {
  id: string
  label: string
  icon: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex-1 min-w-[220px] flex flex-col" ref={setNodeRef}>
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg border-b"
        style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
      >
        <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
          {icon} {label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: colors.bg.surfaceHover, color: colors.text.secondary }}>
          {count}
        </span>
      </div>

      {/* Cards area */}
      <div
        className="flex-1 overflow-y-auto space-y-2 p-2 rounded-b-lg border border-t-0 transition-colors"
        style={{
          backgroundColor: isOver ? colors.accent + '08' : colors.bg.primary + '80',
          borderColor: isOver ? colors.accent + '40' : colors.bg.border,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Sortable card wrapper */
function SortableTaskCard({ task }: { task: TaskCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardEl task={task} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function TaskCardEl({
  task,
  isDragging,
  dragHandleProps,
}: {
  task: TaskCard
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}) {
  const { agentMetas } = useAgentStore()
  const meta = task.agentId ? getAgentMetaDynamic(task.agentId, agentMetas) : null
  const squadColor = meta ? getSquadColorDynamic(meta.squad) : null

  return (
    <motion.div
      className="rounded-lg border p-2.5 flex items-start gap-2"
      style={{
        backgroundColor: isDragging ? colors.bg.surfaceActive : colors.bg.surface,
        borderColor: isDragging ? colors.accent + '60' : colors.bg.border,
        boxShadow: isDragging ? `0 8px 24px ${colors.accent}20` : 'none',
      }}
      whileHover={!isDragging ? { borderColor: squadColor?.main + '40' || colors.bg.borderLight } : undefined}
      layout={!isDragging}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-0.5 opacity-40 hover:opacity-80 transition-opacity"
          {...dragHandleProps}
        >
          <GripVertical size={14} style={{ color: colors.text.muted }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
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
      </div>
    </motion.div>
  )
}

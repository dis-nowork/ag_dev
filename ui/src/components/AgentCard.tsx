import { memo } from 'react'
import { motion } from 'framer-motion'
import { Sparkline } from './Sparkline'
import { type AgentMeta, getSquadColor, colors } from '../lib/theme'
import { type AgentState } from '../stores/agentStore'

interface AgentCardProps {
  meta: AgentMeta
  state: AgentState
  onClick: () => void
}

function StatusDot({ status, color }: { status: AgentState['status']; color: string }) {
  if (status === 'working') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
    )
  }

  const dotColor = status === 'idle' ? colors.status.idle
    : status === 'done' ? colors.status.complete
    : status === 'error' ? colors.status.error
    : status === 'paused' ? colors.status.paused
    : colors.status.idle

  return (
    <span
      className="inline-flex h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: dotColor, opacity: status === 'idle' ? 0.4 : 1 }}
    />
  )
}

export const AgentCard = memo(function AgentCard({ meta, state, onClick }: AgentCardProps) {
  const squadColor = getSquadColor(meta.squad)
  const isActive = state.status === 'working'
  const isDone = state.status === 'done'
  
  // Generate fake sparkline data if none
  const sparkData = state.activityHistory?.length
    ? state.activityHistory
    : Array(20).fill(0).map(() => isActive ? Math.random() * 80 + 20 : isDone ? Math.random() * 10 : 0)

  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer w-full"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: isActive ? squadColor.main + '40' : colors.bg.border,
      }}
      whileHover={{
        backgroundColor: colors.bg.surfaceHover,
        borderColor: squadColor.main + '60',
        transition: { duration: 0.15 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header: icon, name, status */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm flex-shrink-0">{meta.icon}</span>
          <span className="text-xs font-semibold truncate" style={{ color: colors.text.primary }}>
            {meta.shortName}
          </span>
        </div>
        <StatusDot status={state.status} color={squadColor.main} />
      </div>

      {/* Progress bar */}
      {(isActive || isDone) && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.border }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: squadColor.main }}
            initial={{ width: 0 }}
            animate={{ width: `${state.progress || 0}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Current task */}
      <p className="text-[10px] leading-tight truncate w-full" style={{ color: colors.text.secondary }}>
        {state.currentTask || (isDone ? '✅ done' : state.status === 'idle' ? 'idle' : state.status)}
      </p>

      {/* Sparkline */}
      <Sparkline
        data={sparkData}
        width={120}
        height={20}
        color={squadColor.main}
      />
    </motion.button>
  )
})

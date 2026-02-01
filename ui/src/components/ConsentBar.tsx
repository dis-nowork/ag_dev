import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAgentStore } from '../stores/agentStore'
import { useToastStore } from '../stores/toastStore'
import { colors } from '../lib/theme'

export const ConsentBar = memo(function ConsentBar() {
  const { pendingActions, pendingActionDetails, clearPendingActions } = useAgentStore()
  const { addToast } = useToastStore()
  const [expanded, setExpanded] = useState(false)

  if (pendingActions <= 0) return null

  const handleApproveAll = async () => {
    try {
      const res = await fetch('/api/agents/approve-all', { method: 'POST' })
      if (res.ok) {
        clearPendingActions()
        addToast('success', 'All pending actions approved')
      } else {
        addToast('error', 'Failed to approve actions')
      }
    } catch {
      addToast('error', 'Failed to approve actions')
    }
  }

  const handleDismissAll = async () => {
    try {
      const res = await fetch('/api/agents/dismiss-all', { method: 'POST' })
      if (res.ok) {
        clearPendingActions()
        addToast('info', 'All pending actions dismissed')
      } else {
        addToast('error', 'Failed to dismiss actions')
      }
    } catch {
      addToast('error', 'Failed to dismiss actions')
    }
  }

  return (
    <motion.div
      className="border-b"
      style={{
        backgroundColor: colors.status.blocked + '10',
        borderColor: colors.status.blocked + '30',
      }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle size={14} style={{ color: colors.status.blocked }} />
          <span style={{ color: colors.status.blocked }}>
            {pendingActions} pending action{pendingActions > 1 ? 's' : ''} need approval
          </span>
          {pendingActionDetails.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 rounded hover:bg-white/5 transition-colors"
              style={{ color: colors.text.secondary }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-white/5"
            style={{ color: colors.status.complete }}
          >
            <Check size={12} /> Approve all
          </button>
          <button
            onClick={handleDismissAll}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-white/5"
            style={{ color: colors.status.error }}
          >
            <X size={12} /> Dismiss
          </button>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && pendingActionDetails.length > 0 && (
          <motion.div
            className="px-4 pb-2 space-y-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {pendingActionDetails.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-2 text-[11px] py-1 px-2 rounded"
                style={{ backgroundColor: colors.bg.surfaceHover, color: colors.text.secondary }}
              >
                <span style={{ color: colors.status.blocked }}>⚠</span>
                <span className="font-medium" style={{ color: colors.text.primary }}>
                  {action.agentId}
                </span>
                <span>→</span>
                <span>{action.type}</span>
                <span style={{ color: colors.text.muted }}>—</span>
                <span className="truncate flex-1">{action.description}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

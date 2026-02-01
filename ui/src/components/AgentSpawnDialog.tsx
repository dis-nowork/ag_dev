import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Rocket } from 'lucide-react'
import { AGENTS, colors } from '../lib/theme'
import { useToastStore } from '../stores/toastStore'

interface AgentSpawnDialogProps {
  open: boolean
  onClose: () => void
  /** Pre-select an agent (e.g. from AgentCard) */
  preselectedAgentId?: string
}

const MODELS = [
  { id: '', label: 'Default (server decides)' },
  { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-opus-4-5', label: 'Claude Opus 4.5' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
]

export function AgentSpawnDialog({ open, onClose, preselectedAgentId }: AgentSpawnDialogProps) {
  const { addToast } = useToastStore()
  const [agentId, setAgentId] = useState(preselectedAgentId || '')
  const [task, setTask] = useState('')
  const [model, setModel] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!agentId || !task.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/agents/${agentId}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.trim(),
          model: model || undefined,
        }),
      })

      if (res.ok) {
        addToast('success', `Agent ${agentId} spawned successfully`)
        setTask('')
        setModel('')
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        addToast('error', data.error || `Failed to spawn agent ${agentId}`)
      }
    } catch {
      addToast('error', 'Network error spawning agent')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden"
              style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: colors.bg.border }}>
                <div className="flex items-center gap-2">
                  <Rocket size={18} style={{ color: colors.accent }} />
                  <h2 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Spawn Agent
                  </h2>
                </div>
                <button onClick={onClose} className="p-1 rounded hover:bg-white/5 transition-colors">
                  <X size={16} style={{ color: colors.text.secondary }} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Agent selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: colors.text.secondary }}>
                    Agent
                  </label>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.bg.border,
                      color: colors.text.primary,
                    }}
                  >
                    <option value="">Select an agent...</option>
                    {AGENTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name} — {a.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: colors.text.secondary }}>
                    Task Description
                  </label>
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Describe the task for this agent..."
                    rows={4}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.bg.border,
                      color: colors.text.primary,
                    }}
                  />
                </div>

                {/* Model selector (optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: colors.text.secondary }}>
                    Model <span style={{ color: colors.text.muted }}>(optional)</span>
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.bg.border,
                      color: colors.text.primary,
                    }}
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: colors.bg.border }}>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{ color: colors.text.secondary }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!agentId || !task.trim() || submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: colors.accent, color: '#fff' }}
                >
                  <Rocket size={14} />
                  {submitting ? 'Spawning...' : 'Spawn'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

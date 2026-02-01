import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, History, RotateCcw, Save, Eye, Shield } from 'lucide-react'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { AGENTS, getAgentMeta, getSquadColor, colors } from '../lib/theme'

interface Directive {
  agentId: string
  text: string
  history: { text: string; timestamp: number }[]
}

const defaultState: AgentState = {
  status: 'idle', currentTask: null, checklist: [], progress: 0,
}

export const StrategyView = memo(function StrategyView() {
  const { agents } = useAgentStore()
  const [vision, setVision] = useState('')
  const [guardrails, setGuardrails] = useState('')
  const [directives, setDirectives] = useState<Record<string, Directive>>({})
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Load strategy from server
  useEffect(() => {
    fetch('/api/strategy')
      .then(r => r.json())
      .then(data => {
        if (data.vision) setVision(data.vision)
        if (data.guardrails) setGuardrails(data.guardrails)
        if (data.directives) setDirectives(data.directives)
      })
      .catch(() => {
        // Default values
        setVision('Define your project vision here...')
        setGuardrails('• Stack constraints\n• Quality requirements\n• Security policies')
      })
  }, [])

  const saveDirective = async (agentId: string) => {
    const prev = directives[agentId]
    const newDirective: Directive = {
      agentId,
      text: editText,
      history: [...(prev?.history || []), { text: prev?.text || '', timestamp: Date.now() }].slice(-10),
    }
    
    setDirectives(prev => ({ ...prev, [agentId]: newDirective }))
    setEditingAgent(null)

    try {
      await fetch(`/api/agents/${agentId}/directive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive: editText }),
      })
    } catch {}
  }

  const applyAll = async () => {
    try {
      await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision, guardrails, directives }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            🎯 Strategy Canvas
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <motion.span
                className="text-xs"
                style={{ color: colors.status.complete }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                ✅ Saved
              </motion.span>
            )}
            <button
              onClick={applyAll}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              <Save size={14} />
              Apply Changes
            </button>
          </div>
        </div>

        {/* Project Vision */}
        <Section title="🔭 Project Vision" icon={<Eye size={14} />}>
          <textarea
            value={vision}
            onChange={e => setVision(e.target.value)}
            className="w-full rounded-lg p-3 text-sm outline-none border resize-none min-h-[80px]"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.bg.border,
              color: colors.text.primary,
            }}
            placeholder="Define the project vision that guides all agents..."
          />
        </Section>

        {/* Agent Directives */}
        <Section title="📡 Agent Directives" icon={<Edit3 size={14} />}>
          <div className="space-y-3">
            {AGENTS.map(agentDef => {
              const agentState = agents[agentDef.id] || defaultState
              const directive = directives[agentDef.id]
              const sc = getSquadColor(agentDef.squad)
              const isEditing = editingAgent === agentDef.id

              return (
                <div
                  key={agentDef.id}
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: colors.bg.surface,
                    borderColor: agentState.status === 'working' ? sc.main + '40' : colors.bg.border,
                  }}
                >
                  {/* Agent header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{agentDef.icon}</span>
                      <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                        {agentDef.name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: agentState.status === 'working' ? sc.main + '15' : colors.bg.surfaceHover,
                          color: agentState.status === 'working' ? sc.main : colors.text.muted,
                        }}
                      >
                        {agentState.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingAgent(null)
                          } else {
                            setEditingAgent(agentDef.id)
                            setEditText(directive?.text || '')
                          }
                        }}
                        className="p-1 rounded hover:bg-white/5"
                        style={{ color: colors.text.secondary }}
                        title="Edit directive"
                      >
                        <Edit3 size={12} />
                      </button>
                      {directive?.history?.length ? (
                        <button
                          onClick={() => setShowHistory(showHistory === agentDef.id ? null : agentDef.id)}
                          className="p-1 rounded hover:bg-white/5"
                          style={{ color: colors.text.secondary }}
                          title="View history"
                        >
                          <History size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Directive text or editor */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full rounded-md p-2 text-xs outline-none border resize-none min-h-[60px]"
                        style={{
                          backgroundColor: colors.bg.primary,
                          borderColor: sc.main + '40',
                          color: colors.text.primary,
                        }}
                        autoFocus
                        placeholder={`Direct ${agentDef.name}: focus, priorities, constraints...`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveDirective(agentDef.id)}
                          className="text-[10px] px-3 py-1 rounded font-medium"
                          style={{ backgroundColor: sc.main + '20', color: sc.main }}
                        >
                          Save & Apply
                        </button>
                        <button
                          onClick={() => setEditingAgent(null)}
                          className="text-[10px] px-3 py-1 rounded"
                          style={{ color: colors.text.secondary }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: directive?.text ? colors.text.secondary : colors.text.muted }}>
                      {directive?.text || `No directive set. Click edit to guide ${agentDef.name}.`}
                    </p>
                  )}

                  {/* History dropdown */}
                  <AnimatePresence>
                    {showHistory === agentDef.id && directive?.history?.length ? (
                      <motion.div
                        className="mt-2 space-y-1 border-t pt-2"
                        style={{ borderColor: colors.bg.border }}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <span className="text-[9px] font-semibold uppercase" style={{ color: colors.text.muted }}>
                          Previous Directives
                        </span>
                        {directive.history.filter(h => h.text).map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-[10px]" style={{ color: colors.text.muted }}>
                            <span className="flex-shrink-0">
                              {new Date(h.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            </span>
                            <span>{h.text}</span>
                            <button
                              onClick={() => { setEditingAgent(agentDef.id); setEditText(h.text) }}
                              className="flex-shrink-0 hover:opacity-70"
                              title="Restore this directive"
                            >
                              <RotateCcw size={10} />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Guardrails */}
        <Section title="🛡️ Guardrails (apply to all agents)" icon={<Shield size={14} />}>
          <textarea
            value={guardrails}
            onChange={e => setGuardrails(e.target.value)}
            className="w-full rounded-lg p-3 text-xs outline-none border resize-none min-h-[100px] font-mono"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.bg.border,
              color: colors.text.primary,
            }}
            placeholder="Global rules all agents must follow..."
          />
        </Section>
      </div>
    </div>
  )
})

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: colors.accent }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

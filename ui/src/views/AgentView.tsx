import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Pause, Play, RotateCcw, Skull, MessageSquare, FileText, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Sparkline } from '../components/Sparkline'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { useUIStore } from '../stores/uiStore'
import { getAgentMeta, getSquadColor, colors } from '../lib/theme'

const defaultState: AgentState = {
  status: 'idle', currentTask: null, checklist: [], progress: 0,
  activityHistory: Array(20).fill(0),
}

export const AgentView = memo(function AgentView() {
  const { selectedAgentId, selectAgent, openChat } = useUIStore()
  const { agents } = useAgentStore()
  const [thinking, setThinking] = useState<string[]>([])
  const thinkingRef = useRef<HTMLDivElement>(null)

  const meta = selectedAgentId ? getAgentMeta(selectedAgentId) : null
  const state = selectedAgentId ? (agents[selectedAgentId] || defaultState) : defaultState
  const squadColor = meta ? getSquadColor(meta.squad) : { main: '#666', light: '#888', bg: 'transparent', glow: 'transparent' }

  // Simulated thinking stream (will be connected to SSE)
  useEffect(() => {
    if (state.thinking) {
      setThinking(prev => [...prev, state.thinking!].slice(-20))
      thinkingRef.current?.scrollTo({ top: thinkingRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [state.thinking])

  if (!meta || !selectedAgentId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.text.muted }}>
        Select an agent to view details
      </div>
    )
  }

  const agentAction = async (action: string) => {
    try {
      await fetch(`/api/agents/${selectedAgentId}/${action}`, { method: 'POST' })
    } catch {}
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.bg.border }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => selectAgent(null)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: colors.text.secondary }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>{meta.name}</h2>
              <p className="text-xs" style={{ color: colors.text.secondary }}>{meta.role}</p>
            </div>
          </div>
          {/* Status badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: state.status === 'working' ? squadColor.bg
                : state.status === 'done' ? colors.status.complete + '15'
                : state.status === 'error' ? colors.status.error + '15'
                : colors.bg.surfaceHover,
              color: state.status === 'working' ? squadColor.main
                : state.status === 'done' ? colors.status.complete
                : state.status === 'error' ? colors.status.error
                : colors.text.secondary,
            }}
          >
            {state.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {state.status === 'working' ? (
            <ActionBtn icon={<Pause size={14} />} label="Pause" color={colors.status.paused} onClick={() => agentAction('pause')} />
          ) : state.status === 'paused' ? (
            <ActionBtn icon={<Play size={14} />} label="Resume" color={colors.status.working} onClick={() => agentAction('resume')} />
          ) : null}
          <ActionBtn icon={<RotateCcw size={14} />} label="Restart" color={colors.text.secondary} onClick={() => agentAction('restart')} />
          <ActionBtn icon={<MessageSquare size={14} />} label="Chat" color={squadColor.main} onClick={() => openChat(selectedAgentId)} />
        </div>
      </div>

      {/* Split content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — context */}
        <div className="w-80 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4" style={{ borderColor: colors.bg.border }}>
          {/* Current task */}
          <Section title="Current Task">
            <div className="rounded-lg p-3" style={{ backgroundColor: colors.bg.surfaceHover }}>
              <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                {state.currentTask || 'No active task'}
              </p>
              {state.progress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: colors.text.secondary }}>
                    <span>Progress</span>
                    <span>{state.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.border }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: squadColor.main }}
                      animate={{ width: `${state.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Thinking out loud */}
          <Section title="💭 Thinking">
            <div
              ref={thinkingRef}
              className="rounded-lg p-3 max-h-40 overflow-y-auto space-y-1"
              style={{ backgroundColor: colors.bg.surfaceHover }}
            >
              {thinking.length > 0 ? thinking.map((t, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>
                  {t}
                </p>
              )) : (
                <p className="text-xs italic" style={{ color: colors.text.muted }}>
                  {state.status === 'working' ? 'Waiting for thoughts...' : 'Agent is not active'}
                </p>
              )}
            </div>
          </Section>

          {/* Checklist */}
          <Section title="Checklist">
            <div className="space-y-1.5">
              {state.checklist.length > 0 ? state.checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  {item.done ? (
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: colors.status.complete }} />
                  ) : (
                    <Circle size={14} className="mt-0.5 flex-shrink-0" style={{ color: colors.text.muted }} />
                  )}
                  <span className="text-xs" style={{ color: item.done ? colors.text.secondary : colors.text.primary }}>
                    {item.text}
                  </span>
                </div>
              )) : (
                <p className="text-xs" style={{ color: colors.text.muted }}>No checklist items</p>
              )}
            </div>
          </Section>

          {/* Activity */}
          <Section title="Activity">
            <Sparkline
              data={state.activityHistory || Array(20).fill(0)}
              width={240}
              height={40}
              color={squadColor.main}
            />
          </Section>
        </div>

        {/* Right panel — output/code */}
        <div className="flex-1 overflow-y-auto p-4">
          <Section title="Output">
            <div
              className="rounded-lg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap min-h-[200px]"
              style={{
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                border: `1px solid ${colors.bg.border}`,
              }}
            >
              {state.output || 'No output yet...'}
            </div>
          </Section>

          {/* Files changed */}
          {state.filesChanged && state.filesChanged.length > 0 && (
            <Section title="Files Changed" className="mt-4">
              <div className="space-y-1">
                {state.filesChanged.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <FileText size={12} style={{ color: colors.text.muted }} />
                    <span style={{ color: colors.text.primary }}>{f.path}</span>
                    {f.additions > 0 && <span style={{ color: colors.status.complete }}>+{f.additions}</span>}
                    {f.deletions > 0 && <span style={{ color: colors.status.error }}>-{f.deletions}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
})

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: colors.text.muted }}>
        {title}
      </h4>
      {children}
    </div>
  )
}

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5 border"
      style={{ borderColor: color + '30', color }}
    >
      {icon}
      {label}
    </button>
  )
}

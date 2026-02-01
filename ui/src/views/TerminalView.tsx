import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Pause, Play, SkipForward, Terminal, Send, Trash2 } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { getAgentMetaDynamic, getSquadColorDynamic, colors } from '../lib/theme'

interface TerminalLine {
  id: string
  timestamp: string
  type: 'exec' | 'write' | 'read' | 'thinking' | 'result' | 'error' | 'system' | 'inject'
  content: string
  detail?: string
}

const TYPE_ICONS: Record<TerminalLine['type'], string> = {
  exec: '🔧',
  write: '📝',
  read: '📖',
  thinking: '💭',
  result: '✅',
  error: '❌',
  system: '⚙️',
  inject: '💉',
}

const TYPE_COLORS: Record<TerminalLine['type'], string> = {
  exec: '#60A5FA',
  write: '#34D399',
  read: '#A78BFA',
  thinking: '#8B8B8E',
  result: '#10B981',
  error: '#EF4444',
  system: '#EAB308',
  inject: '#F59E0B',
}

const defaultState: AgentState = {
  status: 'idle', currentTask: null, checklist: [], progress: 0,
  sessionKey: null, model: null, tokens: null,
}

export const TerminalView = memo(function TerminalView() {
  const { selectedAgentId, selectAgent, setView } = useUIStore()
  const { agents, agentMetas } = useAgentStore()
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const meta = selectedAgentId ? getAgentMetaDynamic(selectedAgentId, agentMetas) : null
  const state = selectedAgentId ? (agents[selectedAgentId] || defaultState) : defaultState
  const squadColor = meta ? getSquadColorDynamic(meta.squad) : { main: '#666', light: '#888', bg: 'rgba(102,102,102,0.1)', glow: 'rgba(102,102,102,0.3)' }

  // SSE stream for agent events
  useEffect(() => {
    if (!selectedAgentId) return

    const es = new EventSource(`/api/agents/${selectedAgentId}/stream`)
    
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        const line: TerminalLine = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: data.type || 'system',
          content: data.content || data.message || JSON.stringify(data),
          detail: data.detail,
        }
        setLines(prev => [...prev.slice(-500), line])
      } catch {}
    }

    es.onerror = () => {}

    return () => es.close()
  }, [selectedAgentId])

  // Generate initial lines from agent state
  useEffect(() => {
    if (!selectedAgentId || !state) return
    
    const initialLines: TerminalLine[] = []
    
    if (state.output) {
      initialLines.push({
        id: 'output-0',
        timestamp: '--:--:--',
        type: 'result',
        content: state.output,
      })
    }
    
    state.checklist?.forEach((item, i) => {
      if (item.done) {
        initialLines.push({
          id: `check-${i}`,
          timestamp: '--:--:--',
          type: 'result',
          content: `✅ ${item.text}`,
        })
      }
    })

    if (state.status === 'working' && state.currentTask) {
      initialLines.push({
        id: 'current',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'system',
        content: `Working on: ${state.currentTask}`,
      })
    }

    if (initialLines.length > 0) {
      setLines(initialLines)
    }
  }, [selectedAgentId])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [lines, autoScroll])

  const sendCommand = async () => {
    if (!input.trim() || !selectedAgentId) return
    const text = input.trim()
    setInput('')

    setLines(prev => [...prev, {
      id: `inject-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'inject',
      content: `[YOU] → ${text}`,
    }])

    try {
      await fetch(`/api/agents/${selectedAgentId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
    } catch {
      setLines(prev => [...prev, {
        id: `err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'error',
        content: 'Failed to inject command',
      }])
    }
  }

  const agentAction = async (action: string) => {
    if (!selectedAgentId) return
    try { await fetch(`/api/agents/${selectedAgentId}/${action}`, { method: 'POST' }) } catch {}
  }

  if (!meta || !selectedAgentId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.text.muted }}>
        Select an agent to view terminal
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: colors.bg.border }}>
        <div className="flex items-center gap-3">
          <button onClick={() => selectAgent(null)} className="p-1 rounded hover:bg-white/5" style={{ color: colors.text.secondary }}>
            <ArrowLeft size={16} />
          </button>
          <Terminal size={16} style={{ color: squadColor.main }} />
          <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {meta.icon} {meta.name}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: state.status === 'working' ? squadColor.main + '15' : colors.bg.surfaceHover,
              color: state.status === 'working' ? squadColor.main : colors.text.secondary,
            }}
          >
            {state.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {state.status === 'working' ? (
            <SmallBtn icon={<Pause size={12} />} label="Pause" onClick={() => agentAction('pause')} />
          ) : (
            <SmallBtn icon={<Play size={12} />} label="Resume" onClick={() => agentAction('resume')} />
          )}
          <SmallBtn icon={<SkipForward size={12} />} label="Redirect" onClick={() => agentAction('redirect')} />
          <SmallBtn icon={<Trash2 size={12} />} label="Clear" onClick={() => setLines([])} />
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-0.5"
        style={{ backgroundColor: '#050506' }}
        onScroll={() => {
          if (!scrollRef.current) return
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
          setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
        }}
      >
        {lines.length === 0 && (
          <p className="text-center py-12" style={{ color: colors.text.muted }}>
            {state.status === 'working'
              ? '⏳ Waiting for agent activity...'
              : `Agent is ${state.status}. Start a task to see activity here.`}
          </p>
        )}
        {lines.map(line => (
          <div key={line.id} className="flex items-start gap-2 leading-relaxed py-0.5">
            <span style={{ color: colors.text.muted }} className="flex-shrink-0 select-none">
              [{line.timestamp}]
            </span>
            <span className="flex-shrink-0" style={{ color: TYPE_COLORS[line.type] }}>
              {TYPE_ICONS[line.type]}
            </span>
            <span style={{ color: line.type === 'error' ? colors.status.error : colors.text.primary }}>
              {line.content}
            </span>
          </div>
        ))}
        {state.status === 'working' && (
          <motion.div
            className="flex items-center gap-1 pt-1"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span style={{ color: squadColor.main }}>▌</span>
          </motion.div>
        )}
      </div>

      {/* Command input */}
      <div className="border-t p-3" style={{ borderColor: colors.bg.border, backgroundColor: colors.bg.surface }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: squadColor.main }}>$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendCommand() } }}
            placeholder="Intervene: redirect agent, inject command, or send instruction..."
            className="flex-1 bg-transparent text-xs font-mono outline-none"
            style={{ color: colors.text.primary }}
          />
          <button
            onClick={sendCommand}
            disabled={!input.trim()}
            className="p-1.5 rounded transition-colors disabled:opacity-20"
            style={{ color: squadColor.main }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
})

function SmallBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors hover:bg-white/5"
      style={{ color: colors.text.secondary }}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

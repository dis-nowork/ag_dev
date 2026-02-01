import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, X, Send, Pause, Play, Eye, ChevronDown,
  ChevronRight, Folder, FileText, GitBranch, GitCommit,
  LayoutDashboard, Users, FolderOpen, Zap, Search,
  Settings, Bell, Maximize2, Minimize2, Terminal,
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  ArrowRight, MoreVertical, PanelRightOpen, PanelRightClose
} from 'lucide-react'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface CheckItem { text: string; done: boolean }
interface AgentState {
  status: 'idle' | 'working' | 'paused' | 'done' | 'error'
  currentTask: string | null
  checklist: CheckItem[]
  progress: number
  output?: string
}
interface Agent {
  id: string; name: string; title: string; icon: string
  state: AgentState
}
interface ChatMessage {
  id: number; from: 'human' | 'bot'; text: string; time: string
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const PHASES = [
  { id: 'phase0', name: 'Bootstrap', icon: '⚡', description: 'Environment setup',
    steps: ['Git repo', 'AIOS install', 'Brainstorm (8 docs)'] },
  { id: 'phase1', name: 'Planning', icon: '🎯', description: 'Product definition',
    steps: ['Project Brief', 'PRD', 'UX Spec', 'Architecture', 'PO Validation'] },
  { id: 'phase2', name: 'Sharding', icon: '📦', description: 'Break into tasks',
    steps: ['Shard PRD', 'Source tree', 'Tech stack', 'Coding standards'] },
  { id: 'phase3', name: 'Development', icon: '🚀', description: 'Build & ship',
    steps: ['Create stories', 'Implement', 'QA review', 'Deploy'] },
]

const AGENT_META: Record<string, { color: string; gradient: string; phase: string; step: string }> = {
  'analyst':          { color: '#38bdf8', gradient: 'from-sky-500 to-cyan-400', phase: 'phase1', step: 'Project Brief' },
  'pm':               { color: '#a78bfa', gradient: 'from-violet-500 to-purple-400', phase: 'phase1', step: 'PRD' },
  'ux-design-expert': { color: '#e879f9', gradient: 'from-fuchsia-500 to-pink-400', phase: 'phase1', step: 'UX Spec' },
  'architect':        { color: '#34d399', gradient: 'from-emerald-500 to-green-400', phase: 'phase1', step: 'Architecture' },
  'po':               { color: '#fbbf24', gradient: 'from-amber-500 to-yellow-400', phase: 'phase1', step: 'PO Validation' },
  'sm':               { color: '#fb7185', gradient: 'from-rose-500 to-pink-400', phase: 'phase3', step: 'Create stories' },
  'dev':              { color: '#4ade80', gradient: 'from-green-500 to-emerald-400', phase: 'phase3', step: 'Implement' },
  'qa':               { color: '#f97316', gradient: 'from-orange-500 to-amber-400', phase: 'phase3', step: 'QA review' },
  'devops':           { color: '#94a3b8', gradient: 'from-slate-500 to-gray-400', phase: 'phase0', step: 'AIOS install' },
  'data-engineer':    { color: '#60a5fa', gradient: 'from-blue-500 to-sky-400', phase: 'phase3', step: 'Implement' },
  'aios-master':      { color: '#f43f5e', gradient: 'from-rose-600 to-red-500', phase: 'all', step: '' },
  'squad-creator':    { color: '#8b5cf6', gradient: 'from-violet-600 to-indigo-500', phase: 'all', step: '' },
}

const STATUS_CONFIG = {
  idle:    { label: 'Idle', icon: Circle, color: 'text-slate-500', bg: 'bg-slate-500/10', dot: 'bg-slate-500' },
  working: { label: 'Active', icon: Loader2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  paused:  { label: 'Paused', icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  done:    { label: 'Done', icon: CheckCircle2, color: 'text-indigo-400', bg: 'bg-indigo-500/10', dot: 'bg-indigo-400' },
  error:   { label: 'Error', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
}

// ═══════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════
function useSSE(onMessage: (data: any) => void) {
  useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (e) => { try { onMessage(JSON.parse(e.data)) } catch {} }
    return () => es.close()
  }, [])
}

function useApi<T>(url: string, interval = 15000): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null)
  const refresh = useCallback(() => {
    fetch(url).then(r => r.json()).then(setData).catch(() => {})
  }, [url])
  useEffect(() => { refresh(); const id = setInterval(refresh, interval); return () => clearInterval(id) }, [refresh, interval])
  return [data, refresh]
}

// ═══════════════════════════════════════
// AGENT CARD — The core kanban piece
// ═══════════════════════════════════════
function AgentCard({ agent, onSelect, isActive }: { agent: Agent; onSelect: () => void; isActive: boolean }) {
  const meta = AGENT_META[agent.id] || { color: '#94a3b8', gradient: 'from-gray-500 to-gray-400', phase: '', step: '' }
  const status = STATUS_CONFIG[agent.state?.status || 'idle']
  const StatusIcon = status.icon
  const checklist = agent.state?.checklist || []
  const done = checklist.filter(c => c.done).length
  const total = checklist.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={`
        relative rounded-xl p-3.5 cursor-pointer transition-all duration-200 group
        border backdrop-blur-sm
        ${isActive
          ? 'border-indigo-500/40 bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
          : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]'}
        ${agent.state?.status === 'working' ? 'ring-1 ring-emerald-500/20' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base shadow-lg`}
               style={{ boxShadow: `0 4px 12px ${meta.color}30` }}>
            {agent.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white/90 leading-tight truncate">{agent.name}</div>
            <div className="text-[10px] text-white/30 truncate">{agent.title}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg}`}>
          <StatusIcon className={`w-3 h-3 ${status.color} ${agent.state?.status === 'working' ? 'animate-spin' : ''}`} />
          <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Current task */}
      {agent.state?.currentTask && (
        <div className="text-[11px] text-white/40 bg-white/[0.03] rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">{agent.state.currentTask}</span>
        </div>
      )}

      {/* Checklist */}
      {total > 0 && (
        <div className="space-y-1 mb-2.5">
          {checklist.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              {item.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                : <Circle className="w-3.5 h-3.5 text-white/15 shrink-0" />}
              <span className={item.done ? 'text-white/25 line-through' : 'text-white/50'}>{item.text}</span>
            </div>
          ))}
          {total > 3 && <div className="text-[10px] text-white/20 pl-5">+{total - 3} more</div>}
        </div>
      )}

      {/* Progress */}
      {total > 0 && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)` }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-white/30 tabular-nums w-7 text-right">{pct}%</span>
        </div>
      )}

      {/* Hover action hint */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-b-xl flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-indigo-300/70 font-medium">Open Control Panel →</span>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════
// AGENT DETAIL PANEL (slide-in)
// ═══════════════════════════════════════
function AgentPanel({ agent, onClose, onOpenChat }: { agent: Agent; onClose: () => void; onOpenChat: (a: Agent) => void }) {
  const meta = AGENT_META[agent.id] || { color: '#94a3b8', gradient: 'from-gray-500 to-gray-400' }
  const status = STATUS_CONFIG[agent.state?.status || 'idle']

  const updateState = (patch: Partial<AgentState>) => {
    fetch(`/api/agents/${agent.id}/state`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
  }

  const togglePause = () => {
    if (agent.state?.status === 'working') fetch(`/api/agents/${agent.id}/pause`, { method: 'POST' })
    else if (agent.state?.status === 'paused') fetch(`/api/agents/${agent.id}/resume`, { method: 'POST' })
  }

  const toggleCheck = (i: number) => {
    const checklist = [...(agent.state?.checklist || [])]
    checklist[i] = { ...checklist[i], done: !checklist[i].done }
    updateState({ checklist })
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 bottom-0 w-[420px] z-40 bg-[#0c0c1d] border-l border-white/[0.06] shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${meta.gradient} p-5 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">{agent.name}</h2>
              <p className="text-sm text-white/60">{agent.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 p-4 border-b border-white/[0.04]">
        {(agent.state?.status === 'working' || agent.state?.status === 'paused') && (
          <button onClick={togglePause}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              agent.state?.status === 'working'
                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            }`}>
            {agent.state?.status === 'working' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
          </button>
        )}
        <button onClick={() => onOpenChat(agent)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 rounded-lg text-xs font-semibold transition-colors">
          <Terminal className="w-3.5 h-3.5" /> Command
        </button>
        <button onClick={() => {}}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] text-white/40 hover:bg-white/[0.08] rounded-lg text-xs font-semibold transition-colors ml-auto">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[agent.state?.status || 'idle'].dot} ${agent.state?.status === 'working' ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          {agent.state?.currentTask && (
            <span className="text-xs text-white/30 truncate">— {agent.state.currentTask}</span>
          )}
        </div>

        {/* Checklist */}
        {(agent.state?.checklist || []).length > 0 && (
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-white/20 font-semibold mb-3">Checklist</h3>
            <div className="space-y-1">
              {agent.state!.checklist.map((item, i) => (
                <label key={i}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors group">
                  <input type="checkbox" checked={item.done} onChange={() => toggleCheck(i)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer" />
                  <span className={`text-sm ${item.done ? 'text-white/20 line-through' : 'text-white/60'}`}>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        {agent.state?.output && (
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-white/20 font-semibold mb-3">Output</h3>
            <pre className="text-xs text-white/40 bg-black/30 rounded-xl p-4 max-h-48 overflow-auto font-mono whitespace-pre-wrap leading-relaxed border border-white/[0.04]">
              {agent.state.output}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════
// KANBAN BOARD
// ═══════════════════════════════════════
function KanbanBoard({ agents, selectedAgent, onSelect }: { agents: Agent[]; selectedAgent: Agent | null; onSelect: (a: Agent) => void }) {
  const grouped = useMemo(() => {
    const g: Record<string, Agent[]> = {}
    PHASES.forEach(p => g[p.id] = [])
    agents.forEach(a => {
      const meta = AGENT_META[a.id]
      if (meta?.phase && meta.phase !== 'all' && g[meta.phase]) g[meta.phase].push(a)
    })
    return g
  }, [agents])

  const getPhaseStatus = (phaseId: string) => {
    const pa = grouped[phaseId] || []
    if (pa.length === 0) return 'empty'
    if (pa.every(a => a.state?.status === 'done')) return 'done'
    if (pa.some(a => a.state?.status === 'working')) return 'active'
    return 'pending'
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2 px-1">
      {PHASES.map((phase, pi) => {
        const ps = getPhaseStatus(phase.id)
        const phaseAgents = grouped[phase.id] || []
        return (
          <div key={phase.id}
            className={`shrink-0 w-[300px] rounded-2xl border flex flex-col transition-colors ${
              ps === 'active' ? 'border-indigo-500/20 bg-indigo-950/5' :
              ps === 'done' ? 'border-emerald-500/15 bg-emerald-950/5' :
              'border-white/[0.03] bg-white/[0.01]'
            }`}>
            {/* Column header */}
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{phase.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white/80">{phase.name}</div>
                    <div className="text-[10px] text-white/25">{phase.description}</div>
                  </div>
                </div>
                {ps === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />}
                {ps === 'active' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />}
              </div>

              {/* Phase steps */}
              <div className="mt-3 space-y-0.5">
                {phase.steps.map((step, si) => {
                  const agentForStep = phaseAgents.find(a => AGENT_META[a.id]?.step === step)
                  const stepDone = agentForStep?.state?.status === 'done'
                  const stepActive = agentForStep?.state?.status === 'working'
                  return (
                    <div key={si} className="flex items-center gap-2 text-[11px] py-0.5">
                      {stepDone ? <CheckCircle2 className="w-3 h-3 text-emerald-400/50 shrink-0" /> :
                       stepActive ? <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0" /> :
                       <Circle className="w-3 h-3 text-white/10 shrink-0" />}
                      <span className={stepDone ? 'text-white/20 line-through' : stepActive ? 'text-indigo-300' : 'text-white/30'}>
                        {step}
                      </span>
                      {agentForStep && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">
                          {agentForStep.icon}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-white/[0.04]" />

            {/* Agent cards */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {phaseAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent}
                  isActive={selectedAgent?.id === agent.id}
                  onSelect={() => onSelect(agent)} />
              ))}
              {phaseAgents.length === 0 && (
                <div className="text-center text-white/10 text-xs py-8">No agents</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════
// CHAT WIDGET (Floating, expandable)
// ═══════════════════════════════════════
function ChatWidget({ agentId, agentName, agentIcon, onClose, onSwitchToMain }:
  { agentId?: string; agentName: string; agentIcon?: string; onClose?: () => void; onSwitchToMain?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const endpoint = agentId ? `/api/agents/${agentId}/chat` : '/api/chat'

  useEffect(() => {
    fetch(endpoint).then(r => r.json()).then(d => setMessages(d.messages || []))
  }, [agentId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useSSE((data: any) => {
    if (agentId && data.type === 'agent_chat' && data.agentId === agentId) {
      setMessages(prev => [...prev, data.message])
    } else if (!agentId && data.type === 'chat') {
      setMessages(prev => [...prev, data.message])
    }
  })

  const send = async () => {
    if (!input.trim()) return
    const text = input; setInput('')
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
    const d = await res.json()
    if (d.message) setMessages(prev => [...prev, d.message])
  }

  const sizeClass = fullscreen
    ? 'fixed inset-4 z-50'
    : expanded
      ? 'w-[380px] h-[500px]'
      : 'w-[320px] h-11'

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${sizeClass} flex flex-col rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0c0c1d] shadow-2xl shadow-black/50 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#12122a] to-[#0c0c1d] border-b border-white/[0.04] cursor-pointer select-none shrink-0"
           onClick={() => !fullscreen && setExpanded(!expanded)}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-white/80">
            {agentIcon && <span className="mr-1.5">{agentIcon}</span>}
            {agentName}
          </span>
          {agentId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">AGENT</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {agentId && onSwitchToMain && (
            <button onClick={(e) => { e.stopPropagation(); onSwitchToMain() }}
              className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
              title="Chat principal">
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setFullscreen(!fullscreen) }}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button onClick={(e) => { e.stopPropagation(); onClose() }}
              className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-white/15 text-xs mt-12">
                {agentId ? `Send commands to ${agentName}` : 'Chat with Claudio — your AI operator'}
              </div>
            )}
            {messages.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.from === 'human' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                  m.from === 'human'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white/[0.05] text-white/70 border border-white/[0.04] rounded-bl-md'
                }`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.04] shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={agentId ? `Command ${agentName}...` : 'Message Claudio...'}
                className="flex-1 bg-white/[0.04] rounded-xl px-4 py-2.5 text-sm border border-white/[0.06] focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 placeholder-white/20 text-white/80 transition-all" />
              <button onClick={send}
                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// DOCS VIEW
// ═══════════════════════════════════════
function DocsView() {
  const [docs, setDocs] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => { fetch('/api/docs').then(r => r.json()).then(d => setDocs(d.docs || [])) }, [])

  const open = async (doc: any) => {
    setSelected(doc); setEditing(false)
    const d = await fetch(`/api/docs/read?path=${encodeURIComponent(doc.path)}`).then(r => r.json())
    setContent(d.content || '')
  }

  const save = async () => {
    await fetch('/api/docs/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: selected.path, content }) })
    setEditing(false)
  }

  const grouped: Record<string, any[]> = {}
  docs.forEach(d => { if (!grouped[d.category]) grouped[d.category] = []; grouped[d.category].push(d) })

  return (
    <div className="flex gap-4 h-full">
      <div className="w-56 shrink-0 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-3 overflow-y-auto">
        {Object.entries(grouped).map(([cat, files]) => (
          <div key={cat} className="mb-4">
            <div className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-1.5 px-2">{cat}</div>
            {files.map((d: any) => (
              <button key={d.relativePath} onClick={() => open(d)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs mb-0.5 truncate transition-colors ${
                  selected?.relativePath === d.relativePath ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/35 hover:bg-white/[0.04] hover:text-white/50'}`}>
                <FileText className="w-3 h-3 inline mr-1.5 opacity-50" />{d.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-2xl border border-white/[0.04] bg-white/[0.01] flex flex-col overflow-hidden">
        {selected ? (<>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
            <span className="text-sm font-semibold text-white/70">{selected.name}</span>
            <button onClick={() => editing ? save() : setEditing(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                editing ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'}`}>
              {editing ? '✓ Save' : '✎ Edit'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {editing ? (
              <textarea value={content} onChange={e => setContent(e.target.value)}
                className="w-full h-full bg-transparent text-sm text-white/60 focus:outline-none resize-none font-mono leading-relaxed" />
            ) : (
              <pre className="text-sm text-white/50 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            )}
          </div>
        </>) : (
          <div className="flex-1 flex items-center justify-center text-white/10 text-sm">Select a document</div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// FILE EXPLORER
// ═══════════════════════════════════════
function FilesView() {
  const [tree, setTree] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  const [content, setContent] = useState('')

  useEffect(() => { fetch('/api/tree').then(r => r.json()).then(d => setTree(d.tree || [])) }, [])

  const open = async (n: any) => {
    if (n.type !== 'file' || !n.name.match(/\.(md|yaml|yml|json|js|ts|py|txt|env|sql|css|html|sh|toml)$/)) return
    setSel(n)
    const d = await fetch(`/api/docs/read?path=${encodeURIComponent(n.path)}`).then(r => r.json())
    setContent(d.content || '')
  }

  const TreeNode = ({ n, depth = 0 }: { n: any; depth?: number }) => {
    const [open, setOpen] = useState(depth < 1)
    if (n.type === 'dir') return (
      <div>
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 w-full py-1 hover:bg-white/[0.03] rounded text-[11px] transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}>
          {open ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronRight className="w-3 h-3 text-white/20" />}
          <FolderOpen className="w-3.5 h-3.5 text-indigo-400/50" />
          <span className="text-white/50">{n.name}</span>
        </button>
        {open && n.children?.map((c: any, i: number) => <TreeNode key={i} n={c} depth={depth + 1} />)}
      </div>
    )
    return (
      <button onClick={() => open(n)}
        className={`flex items-center gap-1.5 w-full py-1 hover:bg-white/[0.03] rounded text-[11px] transition-colors ${sel?.path === n.path ? 'bg-indigo-500/10 text-indigo-300' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <FileText className="w-3.5 h-3.5 text-white/20" />
        <span className="text-white/40 truncate">{n.name}</span>
      </button>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="w-64 shrink-0 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-2 overflow-y-auto">
        {tree.map((n, i) => <TreeNode key={i} n={n} />)}
      </div>
      <div className="flex-1 rounded-2xl border border-white/[0.04] bg-white/[0.01] overflow-hidden flex flex-col">
        {sel ? (<>
          <div className="px-4 py-3 border-b border-white/[0.04] text-xs font-mono text-white/30">{sel.name}</div>
          <pre className="flex-1 p-4 overflow-auto text-xs text-white/40 font-mono whitespace-pre-wrap leading-relaxed">{content}</pre>
        </>) : <div className="flex-1 flex items-center justify-center text-white/10 text-sm">Select a file</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// GIT VIEW
// ═══════════════════════════════════════
function GitView({ project }: { project: any }) {
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState<any>(null)
  const commit = async () => {
    if (!msg.trim()) return
    const r = await fetch('/api/git/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
    setResult(await r.json()); setMsg('')
  }
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4">
        <div className="flex gap-3">
          <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && commit()}
            placeholder="Commit message..."
            className="flex-1 bg-white/[0.04] rounded-xl px-4 py-2.5 text-sm border border-white/[0.06] focus:border-indigo-500/50 focus:outline-none placeholder-white/20 text-white/70" />
          <button onClick={commit} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors">Commit</button>
        </div>
        {result && <div className={`mt-2 text-xs p-2 rounded-lg ${result.success ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
          {result.success ? '✓ Committed!' : `✗ ${result.error}`}</div>}
      </div>
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4">
        <h3 className="text-[11px] uppercase tracking-wider text-white/20 font-semibold mb-3">History</h3>
        {(project?.commits || []).map((c: string, i: number) => {
          const [h, ...m] = c.split(' ')
          return <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
            <GitCommit className="w-3.5 h-3.5 text-indigo-400/40 shrink-0" />
            <code className="text-indigo-400/60 font-mono text-xs w-16 shrink-0">{h}</code>
            <span className="text-white/35 text-xs truncate">{m.join(' ')}</span>
          </div>
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [page, setPage] = useState<'kanban' | 'docs' | 'files' | 'git'>('kanban')
  const [agents, setAgents] = useState<Agent[]>([])
  const [project, setProject] = useState<any>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [chatAgent, setChatAgent] = useState<Agent | null>(null)

  const refresh = useCallback(async () => {
    const [p, a] = await Promise.all([
      fetch('/api/project').then(r => r.json()).catch(() => null),
      fetch('/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
    ])
    setProject(p)
    setAgents(a.agents || [])
  }, [])

  useEffect(() => { refresh(); const id = setInterval(refresh, 8000); return () => clearInterval(id) }, [refresh])

  useSSE((data: any) => {
    if (data.type === 'agent_update') {
      setAgents(prev => prev.map(a => a.id === data.agentId ? { ...a, state: data.state } : a))
    }
  })

  const tabs = [
    { id: 'kanban' as const, icon: LayoutDashboard, label: 'Command Center' },
    { id: 'docs' as const, icon: FileText, label: 'Documents' },
    { id: 'files' as const, icon: FolderOpen, label: 'Explorer' },
    { id: 'git' as const, icon: GitBranch, label: 'Git' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] bg-[#08080f] shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/25">P</div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white/90">PHANTOM ID</div>
              <div className="text-[10px] text-white/25">Command Center</div>
            </div>
          </div>
          <div className="h-6 w-px bg-white/[0.06]" />
          <nav className="flex gap-0.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setPage(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  page === t.id
                    ? 'bg-indigo-500/15 text-indigo-300 shadow-sm shadow-indigo-500/10'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'}`}>
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/20">{project?.branch || '...'}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400/60">Online</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden p-5">
        {page === 'kanban' && <KanbanBoard agents={agents} selectedAgent={selectedAgent} onSelect={setSelectedAgent} />}
        {page === 'docs' && <DocsView />}
        {page === 'files' && <FilesView />}
        {page === 'git' && <GitView project={project} />}
      </main>

      {/* Agent panel (slide-in from right) */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)}
            onOpenChat={(a) => { setChatAgent(a); setSelectedAgent(null) }} />
        )}
      </AnimatePresence>

      {/* Floating chat */}
      <ChatWidget
        agentId={chatAgent?.id}
        agentName={chatAgent?.name || 'Claudio'}
        agentIcon={chatAgent?.icon}
        onClose={chatAgent ? () => setChatAgent(null) : undefined}
        onSwitchToMain={chatAgent ? () => setChatAgent(null) : undefined}
      />

      {/* Quick switch to main chat when agent chat is open */}
      {chatAgent && (
        <button onClick={() => setChatAgent(null)}
          className="fixed bottom-4 right-[400px] z-50 w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-110 transition-transform"
          title="Main chat">
          <MessageSquare className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  )
}

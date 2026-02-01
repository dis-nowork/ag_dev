import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Trash2, Download } from 'lucide-react'
import { colors } from '../lib/theme'

interface LogEntry {
  type: string
  time: string
  agentId?: string
  from?: string
  preview?: string
  message?: string
  [key: string]: any
}

const TYPE_COLORS: Record<string, string> = {
  agent_status: '#3B82F6',
  agent_paused: '#F59E0B',
  agent_resumed: '#10B981',
  chat_message: '#A855F7',
  agent_command: '#60A5FA',
  doc_saved: '#34D399',
  git_commit: '#10B981',
  error: '#EF4444',
  system: '#EAB308',
}

const TYPE_ICONS: Record<string, string> = {
  agent_status: '🤖',
  agent_paused: '⏸',
  agent_resumed: '▶️',
  chat_message: '💬',
  agent_command: '⚡',
  doc_saved: '📝',
  git_commit: '📦',
  error: '❌',
  system: '⚙️',
}

export const LogsView = memo(function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Poll logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/timeline')
        const data = await res.json()
        setLogs(data.events || [])
      } catch {}
    }
    fetchLogs()
    const timer = setInterval(fetchLogs, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter(log => {
    if (typeFilter && log.type !== typeFilter) return false
    if (filter) {
      const text = JSON.stringify(log).toLowerCase()
      if (!text.includes(filter.toLowerCase())) return false
    }
    return true
  })

  const logTypes = [...new Set(logs.map(l => l.type))]

  const exportLogs = () => {
    const text = filteredLogs.map(l => `[${l.time}] ${l.type}: ${l.preview || l.message || JSON.stringify(l)}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ag-dev-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: colors.bg.border }}>
        <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
          📜 Logs
        </h2>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5" style={{ borderColor: colors.bg.border }}>
            <Search size={12} style={{ color: colors.text.muted }} />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="bg-transparent text-xs outline-none w-40"
              style={{ color: colors.text.primary }}
            />
          </div>
          {/* Type filter */}
          <select
            value={typeFilter || ''}
            onChange={e => setTypeFilter(e.target.value || null)}
            className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
            style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border, color: colors.text.primary }}
          >
            <option value="">All types</option>
            {logTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button onClick={exportLogs} className="p-1.5 rounded hover:bg-white/5" style={{ color: colors.text.secondary }} title="Export">
            <Download size={14} />
          </button>
          <button onClick={() => setLogs([])} className="p-1.5 rounded hover:bg-white/5" style={{ color: colors.text.secondary }} title="Clear">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Log entries */}
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
        {filteredLogs.length === 0 && (
          <p className="text-center py-12" style={{ color: colors.text.muted }}>
            {logs.length === 0 ? 'No log entries yet' : 'No entries match filter'}
          </p>
        )}
        {filteredLogs.map((log, i) => {
          const typeColor = TYPE_COLORS[log.type] || colors.text.secondary
          const icon = TYPE_ICONS[log.type] || '📌'
          const time = log.time ? new Date(log.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'

          return (
            <div key={i} className="flex items-start gap-2 leading-relaxed py-0.5 hover:bg-white/[0.02] rounded px-1">
              <span style={{ color: colors.text.muted }} className="flex-shrink-0 select-none">
                [{time}]
              </span>
              <span className="flex-shrink-0">{icon}</span>
              <span className="font-semibold flex-shrink-0" style={{ color: typeColor }}>
                {log.type}
              </span>
              {log.agentId && (
                <span className="flex-shrink-0 px-1 rounded text-[9px]" style={{ backgroundColor: typeColor + '15', color: typeColor }}>
                  {log.agentId}
                </span>
              )}
              <span style={{ color: colors.text.primary }}>
                {log.preview || log.message || (log.from ? `from: ${log.from}` : '')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: colors.bg.border, color: colors.text.muted }}>
        <span>{filteredLogs.length} entries{filter || typeFilter ? ` (filtered from ${logs.length})` : ''}</span>
        <span>{autoScroll ? '📍 Auto-scroll ON' : '⏸ Auto-scroll OFF (scroll to bottom to resume)'}</span>
      </div>
    </div>
  )
})

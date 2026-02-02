import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Square, X, RotateCcw, Maximize2 } from 'lucide-react'
import type { TerminalInfo } from '../store'

interface Props {
  terminal: TerminalInfo
  onKill: (id: string) => void
  onMaximize?: (id: string) => void
}

export function TerminalPane({ terminal, onKill, onMaximize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [input, setInput] = useState('')

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return

    const xterm = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#e2e8f0',
        cursor: '#00d4ff',
        selectionBackground: '#264f78',
        black: '#1e1e2e',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#94e2d5',
        white: '#cdd6f4',
      },
      fontFamily: 'Fira Code, JetBrains Mono, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(containerRef.current)
    
    // Small delay for DOM to settle
    setTimeout(() => {
      try { fitAddon.fit() } catch {}
    }, 100)

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Load existing buffer
    fetch(`/api/terminals/${terminal.id}/buffer?lines=500`)
      .then(r => r.json())
      .then(data => {
        if (data.buffer && data.buffer.length > 0) {
          xterm.write(data.buffer.join('\n'))
        }
      })
      .catch(() => {})

    // Handle resize
    const handleResize = () => {
      try { fitAddon.fit() } catch {}
    }
    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      xterm.dispose()
    }
  }, [terminal.id])

  // Listen for SSE terminal data
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.id === terminal.id && xtermRef.current) {
        xtermRef.current.write(detail.data)
      }
    }
    window.addEventListener('terminal-data', handler)
    return () => window.removeEventListener('terminal-data', handler)
  }, [terminal.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    fetch(`/api/terminals/${terminal.id}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input + '\n' })
    })
    setInput('')
  }

  const statusDot = terminal.status === 'running' ? '🟢' 
    : terminal.status === 'exited' ? '⚫' 
    : '🔴'

  const uptime = terminal.status === 'running' && terminal.startTime
    ? formatUptime(Date.now() - terminal.startTime)
    : '--'

  // Determine display info based on type
  const getDisplayInfo = () => {
    if (terminal.type === 'agent') {
      const role = terminal.name || 'Agent'
      return {
        title: `Agent: ${role}`,
        subtitle: `${uptime}${terminal.task ? ` • ${terminal.task.slice(0, 30)}...` : ''}`
      }
    } else if (terminal.type === 'claude') {
      return {
        title: 'Claude Code',
        subtitle: terminal.task ? `${terminal.task.slice(0, 40)}...` : `Shell • ${uptime}`
      }
    } else {
      return {
        title: terminal.name || terminal.command,
        subtitle: `${terminal.command} • ${uptime}`
      }
    }
  }

  const { title, subtitle } = getDisplayInfo()

  return (
    <div className="flex flex-col bg-bg-surface border border-bg-border rounded-lg overflow-hidden h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-surface/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{statusDot}</span>
          <div>
            <div className="text-sm font-medium text-text-primary">
              {title}
            </div>
            <div className="text-xs text-text-muted">
              {subtitle}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && (
            <button
              onClick={() => onMaximize(terminal.id)}
              className="p-1.5 rounded hover:bg-accent-primary/20 text-text-muted hover:text-accent-primary transition-colors"
              title="Maximize terminal"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            onClick={() => onKill(terminal.id)}
            className="p-1.5 rounded hover:bg-accent-error/20 text-text-muted hover:text-accent-error transition-colors"
            title="Kill terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div ref={containerRef} className="flex-1 min-h-0 bg-black" />

      {/* Input */}
      {terminal.status === 'running' && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-bg-border shrink-0">
          <span className="text-accent-primary text-sm font-bold">›</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send input..."
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </form>
      )}
    </div>
  )
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m${secs}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h${mins}m`
}
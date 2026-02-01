import { memo } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useUIStore, type ViewId } from '../stores/uiStore'
import { colors } from '../lib/theme'

const VIEW_LABELS: Record<ViewId, string> = {
  cockpit: '🎛️ Cockpit',
  agent: '🔍 Agent Focus',
  pipeline: '📋 Pipeline',
  emergence: '🌐 Emergence',
  terminal: '💻 Terminal',
  gantt: '📊 Gantt',
  strategy: '🎯 Strategy',
  docs: '📄 Docs',
  diagrams: '📐 Diagrams',
  logs: '📜 Logs',
}

export const StatusBar = memo(function StatusBar() {
  const { agents, totalTasks, completedTasks, projectName, bridge } = useAgentStore()
  const { currentView } = useUIStore()

  const agentList = Object.values(agents)
  const working = agentList.filter(a => a.status === 'working').length
  const done = agentList.filter(a => a.status === 'done').length
  const errors = agentList.filter(a => a.status === 'error').length

  // Calculate total tokens across all agents
  const totalTokens = agentList.reduce(
    (acc, a) => {
      if (a.tokens) {
        acc.input += a.tokens.input
        acc.output += a.tokens.output
        acc.cost += a.tokens.cost
      }
      return acc
    },
    { input: 0, output: 0, cost: 0 }
  )
  const hasTokens = totalTokens.input > 0 || totalTokens.output > 0

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-[11px] border-t"
      style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.bg.border,
        color: colors.text.secondary,
      }}
    >
      <div className="flex items-center gap-4">
        <span style={{ color: colors.text.muted }}>{VIEW_LABELS[currentView]}</span>
        <span>{projectName}</span>
        {/* Bridge status indicator */}
        <span className="flex items-center gap-1" title={bridge.connected ? `Connected to ${bridge.gatewayUrl} (${bridge.latency}ms)` : 'Disconnected from Clawdbot'}>
          <span>{bridge.connected ? '🟢' : '🔴'}</span>
          <span style={{ color: bridge.connected ? colors.status.working : colors.status.error }}>
            {bridge.connected ? 'Bridge' : 'Offline'}
          </span>
          {bridge.connected && bridge.latency > 0 && (
            <span style={{ color: colors.text.muted }}>{bridge.latency}ms</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {working > 0 && (
          <span>
            <span style={{ color: colors.status.working }}>●</span> {working} active
          </span>
        )}
        {errors > 0 && (
          <span>
            <span style={{ color: colors.status.error }}>●</span> {errors} error
          </span>
        )}
        <span>Tasks: {completedTasks}/{totalTasks}</span>
        <span>Agents: {done}✅ {working}⚡ {agentList.length > 0 ? agentList.length - done - working : 0}💤</span>
        {hasTokens && (
          <span title={`In: ${totalTokens.input.toLocaleString()} | Out: ${totalTokens.output.toLocaleString()} | $${totalTokens.cost.toFixed(4)}`}>
            🪙 {((totalTokens.input + totalTokens.output) / 1000).toFixed(1)}k tokens
          </span>
        )}
        <span className="flex items-center gap-1">
          <kbd className="px-1 rounded border text-[9px]"
            style={{ borderColor: colors.bg.borderLight, color: colors.text.muted }}>
            ⌘K
          </kbd>
          <span style={{ color: colors.text.muted }}>search</span>
        </span>
      </div>
    </div>
  )
})

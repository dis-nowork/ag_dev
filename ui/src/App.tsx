import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, GitBranch, Network, Search, Terminal, BarChart3, Target, Wifi, WifiOff } from 'lucide-react'

// Stores
import { useUIStore, type ViewId } from './stores/uiStore'
import { useAgentStore } from './stores/agentStore'

// Hooks
import { useSSE, usePolling } from './hooks/useSSE'
import { useKeyboard } from './hooks/useKeyboard'

// Components
import { CommandPalette } from './components/CommandPalette'
import { ChatFloat } from './components/ChatFloat'
import { ConsentBar } from './components/ConsentBar'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/Toast'

// Views
import { CockpitView } from './views/CockpitView'
import { AgentView } from './views/AgentView'
import { PipelineView } from './views/PipelineView'
import { EmergenceView } from './views/EmergenceView'
import { TerminalView } from './views/TerminalView'
import { GanttView } from './views/GanttView'
import { StrategyView } from './views/StrategyView'

import { colors } from './lib/theme'

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'cockpit', label: 'Cockpit', icon: <LayoutDashboard size={15} />, shortcut: '1' },
  { id: 'pipeline', label: 'Pipeline', icon: <GitBranch size={15} />, shortcut: '2' },
  { id: 'gantt', label: 'Gantt', icon: <BarChart3 size={15} />, shortcut: '3' },
  { id: 'emergence', label: 'Emergence', icon: <Network size={15} />, shortcut: '4' },
  { id: 'strategy', label: 'Strategy', icon: <Target size={15} />, shortcut: '5' },
  { id: 'terminal', label: 'Terminal', icon: <Terminal size={15} />, shortcut: '6' },
]

/** Small indicator in the header showing bridge connection status */
function BridgeIndicator() {
  const { bridge } = useAgentStore()

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]"
      title={bridge.connected
        ? `Connected to Clawdbot gateway (${bridge.latency}ms)`
        : 'Disconnected from Clawdbot gateway'
      }
      style={{
        color: bridge.connected ? colors.status.working : colors.status.error,
        backgroundColor: bridge.connected ? colors.status.working + '10' : colors.status.error + '10',
      }}
    >
      {bridge.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
      <span className="hidden sm:inline">{bridge.connected ? 'Connected' : 'Offline'}</span>
    </div>
  )
}

export default function App() {
  const { currentView, setView, selectedAgentId } = useUIStore()
  const { openCommandPalette } = useUIStore()

  // Connect to server
  useSSE()
  usePolling('/api/state', 15000)
  useKeyboard()

  // Determine which view to render
  const activeView = selectedAgentId && (currentView === 'agent' || currentView === 'cockpit')
    ? 'agent'
    : selectedAgentId && currentView === 'terminal'
    ? 'terminal'
    : currentView

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.primary }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0"
        style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
      >
        {/* Logo + Nav */}
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5" style={{ color: colors.text.primary }}>
            <span className="text-base">⚡</span> AG Dev
          </h1>

          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = currentView === item.id || (item.id === 'cockpit' && activeView === 'agent')
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? colors.bg.surfaceActive : 'transparent',
                    color: isActive ? colors.text.primary : colors.text.secondary,
                  }}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right side: bridge indicator + search */}
        <div className="flex items-center gap-2">
          <BridgeIndicator />

          <button
            onClick={openCommandPalette}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] transition-colors hover:border-white/20"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.bg.border,
              color: colors.text.secondary,
            }}
          >
            <Search size={13} />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="text-[9px] px-1 py-px rounded border ml-2"
              style={{ borderColor: colors.bg.borderLight, color: colors.text.muted }}>
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      {/* Consent bar */}
      <ConsentBar />

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            className="flex-1 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {activeView === 'cockpit' && <CockpitView />}
            {activeView === 'agent' && <AgentView />}
            {activeView === 'pipeline' && <PipelineView />}
            {activeView === 'gantt' && <GanttView />}
            {activeView === 'emergence' && <EmergenceView />}
            {activeView === 'terminal' && <TerminalView />}
            {activeView === 'strategy' && <StrategyView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Status bar */}
      <StatusBar />

      {/* Floating elements */}
      <CommandPalette />
      <ChatFloat />
      <ToastContainer />
    </div>
  )
}

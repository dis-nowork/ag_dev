import { useState, useEffect } from 'react'
import { Plus, Pause, Play, Wifi, WifiOff, Zap, Grid3X3, Users, Workflow, RotateCcw, FileText, Bolt } from 'lucide-react'
import { useStore, Squad } from './store'
import { useSSE } from './hooks/useSSE'
import { TerminalPane } from './components/TerminalPane'
import { NewAgentDialog } from './components/NewAgentDialog'
import { SquadSelector } from './components/SquadSelector'
import { WorkflowView } from './components/WorkflowView'
import { RalphView } from './components/RalphView'
import { ProjectContext } from './components/ProjectContext'
import { OrchestratorChat } from './components/OrchestratorChat'
import { SuperSkillsView } from './components/SuperSkillsView'

function getGridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 2) return 'grid-cols-1 lg:grid-cols-2'
  if (count <= 4) return 'grid-cols-1 md:grid-cols-2'
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
}

export default function App() {
  const { 
    terminals, 
    agents, 
    connected, 
    currentView, 
    activeSquad, 
    workflowState,
    chatSidebarOpen,
    setTerminals, 
    setAgents, 
    setView,
    setWorkflowState,
    setActiveSquad
  } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [maximizedTerminal, setMaximizedTerminal] = useState<string | null>(null)

  // Connect SSE
  useSSE()

  // Load initial data
  useEffect(() => {
    fetch('/api/terminals').then(r => r.json()).then(setTerminals).catch(() => {})
    fetch('/api/agents').then(r => r.json()).then(setAgents).catch(() => {})
    useStore.getState().fetchSquads()
  }, [])

  // Refresh terminals periodically (fallback to SSE)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/terminals').then(r => r.json()).then(setTerminals).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleNewAgent = async (config: any) => {
    try {
      const res = await fetch('/api/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const terminal = await res.json()
      if (terminal.id) {
        setView('grid')
      }
    } catch (e) {
      console.error('Failed to create terminal:', e)
    }
  }

  const handleSquadSelect = async (squad: Squad, task: string) => {
    try {
      const res = await fetch(`/api/squads/${squad.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      })
      const result = await res.json()
      
      if (result.error) {
        console.error('Squad activation failed:', result.error)
        return
      }
      
      // Set active squad
      setActiveSquad(squad.id)
      
      // Create workflow state from server response
      if (result.workflow && result.workflow.steps) {
        setWorkflowState({
          active: true,
          name: result.workflow.name || `${squad.name} Workflow`,
          currentStep: result.workflow.steps[0]?.agent || '',
          steps: result.workflow.steps.map((step: any, i: number) => ({
            id: `step-${i}`,
            agent: step.agent || step.name,
            task: step.task || '',
            status: i === 0 ? 'working' : 'waiting'
          }))
        })
      } else if (result.agents && result.agents.length > 0) {
        // Fallback to agent-based workflow if no workflow was started
        setWorkflowState({
          active: true,
          name: `${squad.name} Workflow`,
          currentStep: result.agents[0]?.name || squad.agents[0],
          steps: result.agents.map((agent: any, i: number) => ({
            id: `step-${i}`,
            agent: agent.name || agent,
            task: '',
            status: i === 0 ? 'working' : 'waiting'
          }))
        })
      }
      
      // Switch to workflow view
      setView('workflow')
      
      // Refresh terminals
      fetch('/api/terminals').then(r => r.json()).then(setTerminals).catch(() => {})
    } catch (e) {
      console.error('Failed to deploy squad:', e)
    }
  }

  const handleKill = async (id: string) => {
    try {
      await fetch(`/api/terminals/${id}`, { method: 'DELETE' })
    } catch (e) {
      console.error('Failed to kill terminal:', e)
    }
  }

  const handleMaximize = (id: string) => {
    setMaximizedTerminal(maximizedTerminal === id ? null : id)
  }

  const handlePauseAll = async () => {
    const endpoint = paused ? '/api/system/resume-all' : '/api/system/pause-all'
    try {
      await fetch(endpoint, { method: 'POST' })
      setPaused(!paused)
    } catch (e) {
      console.error('Failed to toggle pause:', e)
    }
  }

  const activeCount = terminals.filter(t => t.status === 'running').length
  const totalCount = terminals.length
  const activeSquadName = activeSquad ? 
    (useStore.getState().squads.find(s => s.id === activeSquad)?.name || 'Unknown Squad') : 
    'None'

  const navItems = [
    { id: 'grid', label: 'Grid', icon: Grid3X3 },
    { id: 'squads', label: 'Squads', icon: Users },
    { id: 'workflow', label: 'Workflow', icon: Workflow },
    { id: 'ralph', label: 'Ralph', icon: RotateCcw },
    { id: 'context', label: 'Context', icon: FileText },
    { id: 'superskills', label: 'SuperSkills', icon: Bolt }
  ]

  const renderMainContent = () => {
    switch (currentView) {
      case 'squads':
        return <SquadSelector onSquadSelect={handleSquadSelect} />

      case 'workflow':
        return <WorkflowView />

      case 'ralph':
        return <RalphView />

      case 'context':
        return <ProjectContext />

      case 'superskills':
        return <SuperSkillsView />

      case 'grid':
      default:
        if (maximizedTerminal) {
          const terminal = terminals.find(t => t.id === maximizedTerminal)
          if (terminal) {
            return (
              <div className="h-full">
                <TerminalPane
                  terminal={terminal}
                  onKill={handleKill}
                  onMaximize={handleMaximize}
                />
              </div>
            )
          }
        }

        if (terminals.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">No Agents Running</h2>
              <p className="text-sm text-text-secondary mb-6 max-w-md">
                Deploy a squad or launch individual agents to get started.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setView('squads')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-accent-primary text-bg-primary hover:brightness-110 transition-all"
                >
                  <Users size={16} />
                  Deploy Squad
                </button>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold border border-bg-border text-text-primary hover:bg-bg-surface transition-all"
                >
                  <Plus size={16} />
                  Single Agent
                </button>
              </div>
            </div>
          )
        }

        return (
          <div className={`grid ${getGridCols(terminals.length)} gap-4 h-full`}>
            {terminals.map(terminal => (
              <TerminalPane
                key={terminal.id}
                terminal={terminal}
                onKill={handleKill}
                onMaximize={handleMaximize}
              />
            ))}
          </div>
        )
    }
  }

  return (
    <div className="h-screen flex bg-bg-primary overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-bg-border bg-bg-surface shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-accent-primary" />
              <h1 className="text-sm font-bold text-text-primary tracking-tight">AG Dev</h1>
            </div>
            
            {/* Navigation */}
            <nav className="flex gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentView === id
                      ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surfaceHover'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
              connected ? 'text-accent-success bg-accent-success/10' : 'text-accent-error bg-accent-error/10'
            }`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{connected ? 'Connected' : 'Offline'}</span>
            </div>

            {/* Pause/Resume all */}
            {terminals.length > 0 && currentView === 'grid' && (
              <button
                onClick={handlePauseAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
                {paused ? 'Resume All' : 'Pause All'}
              </button>
            )}

            {/* New Agent */}
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-primary text-bg-primary hover:brightness-110 transition-all"
            >
              <Plus size={14} />
              New Agent
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 min-h-0">
          {renderMainContent()}
        </main>

        {/* Status bar */}
        <footer className="flex items-center justify-between px-4 py-1.5 border-t border-bg-border bg-bg-surface text-xs text-text-muted shrink-0">
          <span>AG Dev v2.0 • Mission Control</span>
          <span>
            Status: {activeCount} agents | Squad: {activeSquadName}
            {workflowState?.active && ` | Workflow: ${workflowState.name}`}
          </span>
        </footer>
      </div>

      {/* Orchestrator Chat */}
      <OrchestratorChat />

      {/* Dialog */}
      <NewAgentDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleNewAgent}
      />
    </div>
  )
}
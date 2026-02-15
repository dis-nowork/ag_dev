import { useEffect, useState } from 'react'
import { 
  Pause, Square, Play, Clock, CheckCircle2, XCircle, AlertCircle, Timer,
  BarChart3, Kanban, List, ArrowRight, ChevronDown, ChevronRight, 
  Users, Zap, Activity, TrendingUp, LayoutGrid, Eye, X, Terminal
} from 'lucide-react'
import { useStore, WorkflowStep } from '../store'
import { getAgentMeta } from '../lib/theme'

type ViewMode = 'board' | 'timeline' | 'stats'

export function WorkflowView() {
  const { workflowState, setWorkflowState, setView } = useStore()
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [stepOutput, setStepOutput] = useState<string[]>([])

  // Update current time every second for working steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch terminal buffer when a step is selected
  useEffect(() => {
    if (selectedStep === null) return
    const step = workflowState?.steps[selectedStep]
    if (!step?.terminalId) return
    
    // Fetch terminal buffer
    fetch(`/api/terminals/${step.terminalId}/buffer?lines=50`)
      .then(r => r.json())
      .then(data => setStepOutput(data.buffer || []))
      .catch(() => {})
    
    // Poll every 3 seconds for live updates
    const interval = setInterval(() => {
      fetch(`/api/terminals/${step.terminalId}/buffer?lines=50`)
        .then(r => r.json())
        .then(data => setStepOutput(data.buffer || []))
        .catch(() => {})
    }, 3000)
    
    return () => clearInterval(interval)
  }, [selectedStep, workflowState])

  // Fetch active workflow on mount
  useEffect(() => {
    fetch('/api/workflows/active')
      .then(r => r.json())
      .then(data => {
        if (data && data.status === 'running') {
          setWorkflowState({
            active: true,
            name: data.name,
            currentStep: data.steps[data.currentStep]?.agent || '',
            startTime: data.startTime,
            totalDuration: data.totalDuration,
            steps: data.steps.map((s: any, i: number) => ({
              id: `step-${i}`,
              agent: s.agent || s.name,
              task: s.task || '',
              status: i < data.currentStep ? 'done' : i === data.currentStep ? 'working' : 'pending',
              startTime: s.startTime,
              endTime: s.endTime,
              duration: s.duration,
              phase: s.phase,
              error: s.error,
              terminalId: s.terminalId
            }))
          })
        }
      })
      .catch(() => {}) // Silently fail — might not have active workflow
  }, [])

  if (!workflowState || !workflowState.active) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">No Active Workflow</h2>
            <p className="text-text-secondary mb-6">Deploy a squad to start a workflow pipeline</p>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div 
              onClick={() => setView('squads')}
              className="glass-card p-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🏗️</div>
                <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Deploy Builders Squad
                </h3>
              </div>
              <p className="text-sm text-text-muted">System design, development, and infrastructure</p>
            </div>
            
            <div 
              onClick={() => setView('squads')}
              className="glass-card p-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🧠</div>
                <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Deploy Thinkers Squad
                </h3>
              </div>
              <p className="text-sm text-text-muted">Analysis, planning, and product management</p>
            </div>
          </div>

          {/* Recent History Placeholder */}
          <div className="border-t border-bg-border pt-6">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock size={16} />
              Recent Workflows
            </h3>
            <p className="text-text-muted text-center py-8">No workflow history yet</p>
          </div>
        </div>
      </div>
    )
  }

  const handlePauseWorkflow = async () => {
    try {
      await fetch('/api/workflows/active/pause', { method: 'POST' })
    } catch (e) {
      console.error('Failed to pause workflow:', e)
    }
  }

  const handleStopWorkflow = async () => {
    try {
      await fetch('/api/workflows/active/stop', { method: 'POST' })
      setWorkflowState(null)
    } catch (e) {
      console.error('Failed to stop workflow:', e)
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getStepTiming = (step: WorkflowStep) => {
    if (step.status === 'working' && step.startTime) {
      return formatDuration(currentTime - step.startTime)
    } else if (step.status === 'done' && step.duration) {
      return formatDuration(step.duration)
    }
    return null
  }

  const getAgentForStep = (step: WorkflowStep) => {
    return getAgentMeta(step.agent) || {
      id: step.agent,
      name: step.agent,
      shortName: step.agent.toUpperCase().slice(0, 3),
      icon: '🤖',
      squad: 'builders',
      role: 'Agent task'
    }
  }

  // Step Detail Panel Component
  function StepDetailPanel({ step, stepIndex, output, onClose }: {
    step: WorkflowStep
    stepIndex: number
    output: string[]
    onClose: () => void
  }) {
    const agent = getAgentForStep(step)
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-bg-border">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{agent.name}</h2>
                <p className="text-sm text-text-muted">{agent.role}</p>
              </div>
              <div className={`px-3 py-1 rounded text-sm ${
                step.status === 'working' ? 'bg-accent-primary/20 text-accent-primary' :
                step.status === 'done' ? 'bg-accent-success/20 text-accent-success' :
                step.status === 'error' ? 'bg-accent-error/20 text-accent-error' :
                'bg-bg-border text-text-muted'
              }`}>
                {step.status}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-card rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
            {/* Task Description */}
            {step.task && (
              <div>
                <h3 className="font-medium text-text-primary mb-2">Task</h3>
                <p className="text-text-secondary text-sm bg-bg-card p-3 rounded-lg">
                  {step.task}
                </p>
              </div>
            )}

            {/* Timing */}
            <div className="grid grid-cols-2 gap-4">
              {step.startTime && (
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Started</h4>
                  <p className="text-text-secondary text-sm">
                    {new Date(step.startTime).toLocaleString()}
                  </p>
                </div>
              )}
              {getStepTiming(step) && (
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Duration</h4>
                  <p className="text-text-secondary text-sm">
                    {getStepTiming(step)}
                  </p>
                </div>
              )}
            </div>

            {/* Terminal Output */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={16} />
                <h3 className="font-medium text-text-primary">Terminal Output</h3>
              </div>
              <div className="flex-1 bg-black/50 rounded-lg p-4 overflow-auto font-mono text-sm text-gray-200 max-h-96">
                {!step.terminalId ? (
                  <div className="text-text-muted">Agent not started</div>
                ) : output.length === 0 ? (
                  <div className="text-text-muted">No output yet</div>
                ) : (
                  <div className="space-y-1">
                    {output.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {step.error && (
              <div>
                <h3 className="font-medium text-accent-error mb-2">Error</h3>
                <div className="bg-accent-error/10 border border-accent-error/20 p-3 rounded-lg text-sm text-accent-error">
                  {step.error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const totalSteps = workflowState.steps.length
  const doneSteps = workflowState.steps.filter(s => s.status === 'done').length
  const workingSteps = workflowState.steps.filter(s => s.status === 'working').length
  const pendingSteps = workflowState.steps.filter(s => s.status === 'pending').length
  const errorSteps = workflowState.steps.filter(s => s.status === 'error').length
  const progress = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0

  // Calculate total elapsed time
  const totalElapsed = workflowState.startTime ? currentTime - workflowState.startTime : 0

  // Calculate average time per step
  const completedStepsWithDuration = workflowState.steps.filter(s => s.status === 'done' && s.duration)
  const avgTimePerStep = completedStepsWithDuration.length > 0 
    ? completedStepsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / completedStepsWithDuration.length
    : 0

  // Find fastest and slowest steps
  const fastestStep = completedStepsWithDuration.reduce((fast, step) => 
    !fast || (step.duration && step.duration < (fast.duration || Infinity)) ? step : fast
  , null as WorkflowStep | null)

  const slowestStep = completedStepsWithDuration.reduce((slow, step) => 
    !slow || (step.duration && step.duration > (slow.duration || 0)) ? step : slow
  , null as WorkflowStep | null)

  // Group steps by phase if available
  const groupedSteps = workflowState.steps.reduce((acc, step) => {
    const phase = step.phase || 'General'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(step)
    return acc
  }, {} as Record<string, WorkflowStep[]>)

  const renderBoardView = () => {
    const columns = [
      { key: 'pending', title: 'Pending', icon: '⏳', steps: workflowState.steps.filter(s => s.status === 'pending') },
      { key: 'working', title: 'Working', icon: '🔨', steps: workflowState.steps.filter(s => s.status === 'working') },
      { key: 'done', title: 'Done', icon: '✅', steps: workflowState.steps.filter(s => s.status === 'done') },
      { key: 'error', title: 'Error', icon: '❌', steps: workflowState.steps.filter(s => s.status === 'error') },
    ]

    return (
      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.key} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{column.icon}</span>
              <h3 className="font-semibold text-text-primary">{column.title}</h3>
              <span className="bg-bg-border px-2 py-1 rounded text-xs text-text-muted">
                {column.steps.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {column.steps.map((step, stepIndex) => {
                const agent = getAgentForStep(step)
                const globalStepIndex = workflowState.steps.findIndex(s => s.id === step.id)
                return (
                  <div 
                    key={step.id} 
                    className="glass-card p-3 cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => setSelectedStep(globalStepIndex)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{agent.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary text-sm truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-text-muted truncate">
                          {agent.role}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-text-muted" />
                    </div>
                    
                    {step.task && (
                      <div className="text-xs text-text-secondary mb-2 line-clamp-2">
                        {step.task}
                      </div>
                    )}
                    
                    {step.phase && (
                      <div className="text-xs text-accent-primary mb-2">
                        Phase: {step.phase}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className={`text-xs px-2 py-1 rounded ${
                        step.status === 'working' ? 'bg-accent-primary/20 text-accent-primary animate-pulse' :
                        step.status === 'done' ? 'bg-accent-success/20 text-accent-success' :
                        step.status === 'error' ? 'bg-accent-error/20 text-accent-error' :
                        'bg-bg-border text-text-muted'
                      }`}>
                        {step.status}
                      </div>
                      
                      {getStepTiming(step) && (
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock size={10} />
                          {getStepTiming(step)}
                        </div>
                      )}
                    </div>
                    
                    {step.error && (
                      <div className="mt-2 text-xs text-accent-error bg-accent-error/10 p-2 rounded">
                        {step.error}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderTimelineView = () => {
    // Calculate average step duration for progress estimation
    const completedSteps = workflowState.steps.filter(s => s.status === 'done' && s.duration)
    const avgDuration = completedSteps.length > 0 
      ? completedSteps.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSteps.length 
      : 30000 // 30 seconds default
      
    return (
      <div className="space-y-2">
        {workflowState.steps.map((step, index) => {
          const agent = getAgentForStep(step)
          
          // Calculate progress for working steps
          let progressPercent = 0
          if (step.status === 'working' && step.startTime) {
            const elapsed = currentTime - step.startTime
            progressPercent = Math.min((elapsed / avgDuration) * 100, 95)
          }
          
          const getStatusIcon = () => {
            switch (step.status) {
              case 'done': return '✅'
              case 'working': return '⏳'
              case 'error': return '❌'
              default: return '⚪'
            }
          }
          
          return (
            <div 
              key={step.id} 
              className="flex items-center gap-3 p-3 hover:bg-bg-card rounded-lg transition-colors cursor-pointer group"
              onClick={() => setSelectedStep(index)}
            >
              {/* Checklist Status */}
              <div className="text-lg">{getStatusIcon()}</div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{agent.icon}</span>
                  <span className="font-medium text-text-primary">
                    {agent.name}
                  </span>
                  <span className="text-text-muted">—</span>
                  <span className="text-sm text-text-secondary truncate flex-1">
                    {step.task || `${agent.role} task`}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <div className="flex items-center gap-1">
                    Duration: {getStepTiming(step) || '--'}
                  </div>
                  
                  {step.status === 'working' && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-bg-card rounded-full h-2 w-20 relative overflow-hidden">
                        <div 
                          className="bg-accent-primary h-full transition-all duration-1000 rounded-full animate-pulse"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                  )}
                  
                  {step.status === 'done' && step.duration && (
                    <div className="flex items-center gap-2">
                      <div className="bg-accent-success rounded-full h-2 w-20"></div>
                      <span>100%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Click indicator */}
              <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )
        })}
      </div>
    )
  }

  const renderStatsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 stat-bar-orange">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-accent-primary" size={16} />
              <h3 className="font-semibold text-text-primary">Total Time</h3>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatDuration(totalElapsed)}
            </div>
          </div>
          
          <div className="glass-card p-4 stat-bar-green">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-accent-success" size={16} />
              <h3 className="font-semibold text-text-primary">Completion</h3>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {Math.round(progress)}%
            </div>
          </div>
          
          <div className="glass-card p-4 stat-bar-blue">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="text-accent-warning" size={16} />
              <h3 className="font-semibold text-text-primary">Avg Step</h3>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {avgTimePerStep > 0 ? formatDuration(avgTimePerStep) : '--'}
            </div>
          </div>
          
          <div className="glass-card p-4 stat-bar-purple">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-accent-primary" size={16} />
              <h3 className="font-semibold text-text-primary">Agents</h3>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {new Set(workflowState.steps.map(s => s.agent)).size}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp size={16} />
            Performance Insights
          </h3>
          
          {fastestStep && (
            <div className="bg-accent-success/10 border border-accent-success/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="text-accent-success" size={14} />
                <span className="text-sm font-medium text-accent-success">Fastest Step</span>
              </div>
              <div className="text-sm text-text-primary">
                {getAgentForStep(fastestStep).name}: {formatDuration(fastestStep.duration || 0)}
              </div>
            </div>
          )}
          
          {slowestStep && (
            <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="text-accent-warning" size={14} />
                <span className="text-sm font-medium text-accent-warning">Slowest Step</span>
              </div>
              <div className="text-sm text-text-primary">
                {getAgentForStep(slowestStep).name}: {formatDuration(slowestStep.duration || 0)}
              </div>
            </div>
          )}
          
          {errorSteps > 0 && (
            <div className="bg-accent-error/10 border border-accent-error/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="text-accent-error" size={14} />
                <span className="text-sm font-medium text-accent-error">Errors</span>
              </div>
              <div className="text-sm text-text-primary">
                {errorSteps} step{errorSteps !== 1 ? 's' : ''} failed
              </div>
            </div>
          )}
        </div>

        {/* Mini Gantt Chart */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Step Duration Timeline
          </h3>
          <div className="space-y-2">
            {workflowState.steps.map((step) => {
              const agent = getAgentForStep(step)
              const duration = step.duration || 0
              const maxDuration = Math.max(...workflowState.steps.map(s => s.duration || 0))
              const barWidth = maxDuration > 0 ? (duration / maxDuration) * 100 : 0
              
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-text-secondary truncate">
                    {agent.shortName}
                  </div>
                  <div className="flex-1 bg-bg-card rounded-full h-6 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        step.status === 'done' ? 'bg-accent-success' :
                        step.status === 'working' ? 'bg-accent-primary animate-pulse' :
                        step.status === 'error' ? 'bg-accent-error' :
                        'bg-bg-border'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-xs text-text-primary">
                      {duration > 0 ? formatDuration(duration) : step.status}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
                <Activity size={20} />
                Workflow: {workflowState.name}
                <span className="bg-accent-success/20 text-accent-success px-2 py-1 rounded text-sm">
                  Running
                </span>
              </h2>
              <p className="text-text-secondary text-sm">
                Current step: {workflowState.currentStep} • Elapsed: {formatDuration(totalElapsed)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className="flex items-center gap-2 px-3 py-1.5 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-primary/50 transition-colors"
            >
              <Eye size={14} />
              Terminal
            </button>
            <button
              onClick={handlePauseWorkflow}
              className="flex items-center gap-2 px-3 py-1.5 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-warning/50 transition-colors"
            >
              <Pause size={14} />
              Pause
            </button>
            <button
              onClick={handleStopWorkflow}
              className="flex items-center gap-2 px-3 py-1.5 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-error/50 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-bg-primary rounded-full h-3 relative overflow-hidden">
            <div
              className="bg-gradient-to-r from-accent-primary to-amber-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-text-primary">
              {Math.round(progress)}% Complete
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-lg font-bold text-accent-success">{doneSteps}</div>
            <div className="text-xs text-text-muted">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent-primary">{workingSteps}</div>
            <div className="text-xs text-text-muted">Working</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-text-muted">{pendingSteps}</div>
            <div className="text-xs text-text-muted">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent-error">{errorSteps}</div>
            <div className="text-xs text-text-muted">Errors</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-bg-primary rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-2 text-sm transition-colors ${
              viewMode === 'board' 
                ? 'nav-pill-active' 
                : 'text-text-secondary hover:text-text-primary px-4 py-2 rounded-md'
            }`}
          >
            <Kanban size={14} />
            Board
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-2 text-sm transition-colors ${
              viewMode === 'timeline' 
                ? 'nav-pill-active' 
                : 'text-text-secondary hover:text-text-primary px-4 py-2 rounded-md'
            }`}
          >
            <List size={14} />
            Timeline
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`flex items-center gap-2 text-sm transition-colors ${
              viewMode === 'stats' 
                ? 'nav-pill-active' 
                : 'text-text-secondary hover:text-text-primary px-4 py-2 rounded-md'
            }`}
          >
            <BarChart3 size={14} />
            Stats
          </button>
        </div>

        {/* View Content */}
        {viewMode === 'board' && renderBoardView()}
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'stats' && renderStatsView()}
      </div>
      
      {/* Step Detail Panel */}
      {selectedStep !== null && workflowState?.steps[selectedStep] && (
        <StepDetailPanel
          step={workflowState.steps[selectedStep]}
          stepIndex={selectedStep}
          output={stepOutput}
          onClose={() => { setSelectedStep(null); setStepOutput([]); }}
        />
      )}
    </div>
  )
}
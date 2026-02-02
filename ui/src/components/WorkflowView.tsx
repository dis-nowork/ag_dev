import { useEffect, useState } from 'react'
import { Pause, Square, ArrowRight, Clock } from 'lucide-react'
import { useStore } from '../store'

export function WorkflowView() {
  const { workflowState, setWorkflowState } = useStore()
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second for working steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
            steps: data.steps.map((s: any, i: number) => ({
              id: `step-${i}`,
              agent: s.agent || s.name,
              task: s.task || '',
              status: i < data.currentStep ? 'done' : i === data.currentStep ? 'working' : 'waiting',
              startTime: s.startTime,
              endTime: s.endTime,
              duration: s.duration
            }))
          })
        }
      })
      .catch(() => {}) // Silently fail — might not have active workflow
  }, [])

  if (!workflowState || !workflowState.active) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">No Active Workflow</h2>
        <p className="text-text-secondary">Deploy a squad to start a workflow pipeline</p>
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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return '✅'
      case 'working': return '⏳'
      case 'waiting': return '💤'
      case 'error': return '❌'
      default: return '⚪'
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-accent-success'
      case 'working': return 'text-accent-primary'
      case 'waiting': return 'text-text-muted'
      case 'error': return 'text-accent-error'
      default: return 'text-text-muted'
    }
  }

  const getStepBgColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-accent-success/10 border-accent-success/20'
      case 'working': return 'bg-accent-primary/10 border-accent-primary/20'
      case 'waiting': return 'bg-bg-surface border-bg-border'
      case 'error': return 'bg-accent-error/10 border-accent-error/20'
      default: return 'bg-bg-surface border-bg-border'
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getStepTiming = (step: any) => {
    if (step.status === 'working' && step.startTime) {
      return formatDuration(currentTime - step.startTime)
    } else if (step.status === 'done' && step.duration) {
      return formatDuration(step.duration)
    }
    return null
  }

  // Calculate progress
  const totalSteps = workflowState.steps.length
  const doneSteps = workflowState.steps.filter(s => s.status === 'done').length
  const progress = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-bg-surface border border-bg-border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-1">
              Workflow: {workflowState.name}
            </h2>
            <p className="text-text-secondary text-sm">
              Current step: {workflowState.currentStep}
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Workflow Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {workflowState.steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Node */}
                <div className={`flex flex-col items-center min-w-[140px] px-4 py-3 rounded-lg border ${getStepBgColor(step.status)}`}>
                  <div className={`text-2xl mb-2 ${step.status === 'working' ? 'animate-pulse' : ''}`}>
                    {getStepIcon(step.status)}
                  </div>
                  <div className="text-sm font-medium text-text-primary text-center mb-1">
                    {step.agent}
                  </div>
                  {step.task && (
                    <div className="text-xs text-text-muted text-center mb-1 line-clamp-2 max-w-[120px]">
                      {step.task}
                    </div>
                  )}
                  <div className={`text-xs capitalize ${getStepColor(step.status)} mb-1`}>
                    {step.status}
                  </div>
                  {getStepTiming(step) && (
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock size={10} />
                      {getStepTiming(step)}
                    </div>
                  )}
                </div>

                {/* Arrow (except for last step) */}
                {index < workflowState.steps.length - 1 && (
                  <div className="flex items-center px-4">
                    <ArrowRight size={20} className="text-text-muted" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">Progress</span>
            <span className="text-sm text-text-secondary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-bg-primary rounded-full h-2">
            <div
              className="bg-accent-primary h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-accent-success">{doneSteps}</div>
            <div className="text-xs text-text-muted">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent-primary">
              {workflowState.steps.filter(s => s.status === 'working').length}
            </div>
            <div className="text-xs text-text-muted">Working</div>
          </div>
          <div>
            <div className="text-lg font-bold text-text-muted">
              {workflowState.steps.filter(s => s.status === 'waiting').length}
            </div>
            <div className="text-xs text-text-muted">Waiting</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent-error">
              {workflowState.steps.filter(s => s.status === 'error').length}
            </div>
            <div className="text-xs text-text-muted">Errors</div>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { Rocket, Pause, Square, RotateCcw } from 'lucide-react'
import { useStore } from '../store'

export function RalphView() {
  const { ralph, setRalph } = useStore()
  const [projectDescription, setProjectDescription] = useState('')
  const [projectName, setProjectName] = useState('')
  const learningsRef = useRef<HTMLDivElement>(null)

  // Polling effect - fetch ralph state every 3s when running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (ralph.status === 'running') {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/ralph/state')
          if (response.ok) {
            const data = await response.json()
            setRalph(data)
          }
        } catch (e) {
          console.error('Failed to fetch ralph state:', e)
        }
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [ralph.status])

  // Auto-scroll learnings to bottom
  useEffect(() => {
    if (learningsRef.current) {
      learningsRef.current.scrollTop = learningsRef.current.scrollHeight
    }
  }, [ralph.learnings])

  const handleGeneratePRD = async () => {
    try {
      // Create PRD
      await fetch('/api/ralph/prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription
        })
      })

      // Start Ralph loop
      await fetch('/api/ralph/start', {
        method: 'POST'
      })
    } catch (e) {
      console.error('Failed to start Ralph:', e)
    }
  }

  const handlePause = async () => {
    try {
      await fetch('/api/ralph/pause', { method: 'POST' })
    } catch (e) {
      console.error('Failed to pause Ralph:', e)
    }
  }

  const handleStop = async () => {
    try {
      await fetch('/api/ralph/stop', { method: 'POST' })
    } catch (e) {
      console.error('Failed to stop Ralph:', e)
    }
  }

  const getStoryIcon = (story: any) => {
    if (story.passes) return '✅'
    if (story.skipped) return '⏭️'
    if (story.attempts && story.attempts > 0) return '⏳'
    return '💤'
  }

  const getStoryColor = (story: any) => {
    if (story.passes) return 'text-green-400'
    if (story.skipped) return 'text-yellow-400'  
    if (story.attempts && story.attempts > 0) return 'text-cyan-400'
    return 'text-gray-500'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400'
      case 'paused': return 'text-yellow-400'
      case 'completed': return 'text-green-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢'
      case 'paused': return '🟡'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '⚪'
    }
  }

  const completedStories = ralph.prd?.userStories.filter(s => s.passes).length || 0
  const totalStories = ralph.prd?.userStories.length || 0
  const progress = totalStories > 0 ? (completedStories / totalStories) * 100 : 0

  const currentStory = ralph.prd?.userStories.find(s => s.attempts && s.attempts > 0 && !s.passes)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="text-accent-primary" size={20} />
          <h1 className="text-xl font-bold text-text-primary">Ralph — Autonomous Development Loop</h1>
        </div>
        <p className="text-text-secondary text-sm">
          AI-driven development with iterative learning and autonomous problem solving.
        </p>
      </div>

      {!ralph.prd ? (
        // No PRD loaded - Show input form
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Describe your project or paste a PRD:</h2>
          
          <div className="space-y-4">
            <div>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe what you want to build or paste your PRD here..."
                className="w-full h-32 bg-black text-green-400 font-mono text-sm p-3 rounded-lg border border-bg-border resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Project name:
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-project"
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
            
            <button
              onClick={handleGeneratePRD}
              disabled={!projectDescription.trim() || !projectName.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-bg-primary font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket size={16} />
              🚀 Generate PRD & Start
            </button>
          </div>
        </div>
      ) : (
        // PRD loaded - Show main view
        <div className="space-y-6">
          {/* Progress Section */}
          <div className="glass-card p-4 stat-bar-orange">
            <h3 className="text-lg font-semibold text-text-primary mb-3">Progress</h3>
            
            <div className="mb-4">
              <div className="w-full bg-bg-primary rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-primary font-medium">{Math.round(progress)}% ({completedStories}/{totalStories} stories)</span>
                <span className="text-text-secondary">Iteration: {ralph.currentIteration}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Status:</span>
                <span className={`text-sm font-medium ${getStatusColor(ralph.status)}`}>
                  {getStatusIcon(ralph.status)} {ralph.status.charAt(0).toUpperCase() + ralph.status.slice(1)}
                </span>
              </div>
              
              {ralph.status === 'running' && (
                <div className="flex gap-2">
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-1 px-3 py-1.5 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-yellow-500/50 transition-colors"
                  >
                    <Pause size={14} />
                    ⏸ Pause
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1 px-3 py-1.5 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-red-500/50 transition-colors"
                  >
                    <Square size={14} />
                    ⏹ Stop
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stories Section */}
          <div className="glass-card p-4 stat-bar-blue">
            <h3 className="text-lg font-semibold text-text-primary mb-3">Stories</h3>
            
            <div className="space-y-2">
              {ralph.prd.userStories.map((story) => (
                <div key={story.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-card transition-colors">
                  <span className="text-lg">{getStoryIcon(story)}</span>
                  <div className="flex-1">
                    <span className={`font-medium ${getStoryColor(story)}`}>
                      {story.id}: {story.title}
                    </span>
                    <span className="text-text-muted ml-2 text-sm">
                      ({story.passes ? 'done' : story.skipped ? 'skipped' : (story.attempts && story.attempts > 0) ? 'working' : 'pending'})
                    </span>
                  </div>
                  {story.attempts && story.attempts > 1 && (
                    <span className="text-xs text-text-muted px-2 py-1 bg-bg-primary rounded">
                      attempts: {story.attempts}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Learnings Section */}
          <div className="glass-card p-4 stat-bar-purple">
            <h3 className="text-lg font-semibold text-text-primary mb-3">Learnings</h3>
            
            <div 
              ref={learningsRef}
              className="h-64 overflow-y-auto bg-black rounded-lg p-3 font-mono text-sm space-y-1"
            >
              {ralph.learnings.length === 0 ? (
                <div className="text-gray-500 italic">No learnings yet...</div>
              ) : (
                ralph.learnings.map((learning, index) => (
                  <div key={index} className="text-green-400">
                    <span className="text-gray-400">[{learning.time}]</span> {learning.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export function useSSE() {
  const { addTerminal, updateTerminal, setConnected } = useStore()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    // Handle unnamed init messages
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'init') {
          // Initial state received
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    // Terminal events
    es.addEventListener('terminal_spawn', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        fetch('/api/terminals').then(r => r.json()).then(terminals => {
          useStore.getState().setTerminals(terminals)
        })
      } catch (e) {
        console.error('SSE terminal_spawn error:', e)
      }
    })

    es.addEventListener('terminal_data', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        window.dispatchEvent(new CustomEvent('terminal-data', { detail: data }))
      } catch (e) {
        console.error('SSE terminal_data error:', e)
      }
    })

    es.addEventListener('terminal_exit', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        updateTerminal(data.id, { status: 'exited', exitCode: data.exitCode })
      } catch (e) {
        console.error('SSE terminal_exit error:', e)
      }
    })

    es.addEventListener('terminal_kill', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        updateTerminal(data.id, { status: 'killed' })
      } catch (e) {
        console.error('SSE terminal_kill error:', e)
      }
    })

    // Workflow events
    es.addEventListener('workflow_event', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        const store = useStore.getState()
        
        if (data.type === 'workflow_started' || data.type === 'step_started' || data.type === 'step_completed') {
          // Fetch latest workflow state from server
          fetch('/api/workflows/active').then(r => r.json()).then(wfData => {
            if (wfData && wfData.status === 'running') {
              store.setWorkflowState({
                active: true,
                name: wfData.name,
                currentStep: wfData.steps[wfData.currentStep]?.agent || '',
                steps: wfData.steps.map((s: any, i: number) => ({
                  id: `step-${i}`,
                  agent: s.agent || s.name,
                  status: i < wfData.currentStep ? 'done' : i === wfData.currentStep ? 'working' : 'waiting'
                }))
              })
            }
          }).catch(console.error)
        } else if (data.type === 'workflow_completed' || data.type === 'workflow_stopped') {
          store.setWorkflowState(null)
        }
      } catch (e) {
        console.error('SSE workflow_event error:', e)
      }
    })

    // Ralph events
    const ralphEventTypes = ['ralph_loop_started', 'ralph_iteration_started', 'ralph_story_completed', 'ralph_story_failed', 'ralph_loop_completed', 'ralph_loop_paused']
    ralphEventTypes.forEach(eventType => {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          fetch('/api/ralph/state').then(r => r.json()).then(data => {
            useStore.getState().setRalph(data);
          }).catch(e => {
            console.error('Failed to fetch Ralph state:', e)
          });
        } catch (e) {
          console.error(`SSE ${eventType} error:`, e)
        }
      })
    })

    return () => {
      es.close()
      setConnected(false)
    }
  }, [])
}
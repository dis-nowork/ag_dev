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

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        switch (msg.type) {
          case 'init':
            // Initial state received
            break
          case 'terminal_spawn':
            // New terminal created — refresh list
            fetch('/api/terminals').then(r => r.json()).then(terminals => {
              useStore.getState().setTerminals(terminals)
            })
            break
          case 'terminal_data':
            // Terminal output data — dispatched via custom event for TerminalPane
            window.dispatchEvent(new CustomEvent('terminal-data', { detail: msg.data }))
            break
          case 'terminal_exit':
            updateTerminal(msg.data.id, { status: 'exited', exitCode: msg.data.exitCode })
            break
          case 'terminal_kill':
            updateTerminal(msg.data.id, { status: 'killed' })
            break
          case 'ralph_loop_started':
          case 'ralph_iteration_started':
          case 'ralph_story_completed':
          case 'ralph_story_failed':
          case 'ralph_loop_completed':
          case 'ralph_loop_paused':
            // Fetch latest ralph state
            fetch('/api/ralph/state').then(r => r.json()).then(data => {
              useStore.getState().setRalph(data);
            }).catch(e => {
              console.error('Failed to fetch Ralph state:', e)
            });
            break
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [])
}
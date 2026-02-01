import { useEffect, useRef } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useToastStore } from '../stores/toastStore'

export function useSSE() {
  const { updateAgent, setPendingActions, setProjectInfo, setBridgeStatus, addPendingActionDetail } = useAgentStore()
  const { addToast } = useToastStore()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/sse')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        
        if (data.type === 'agent_update' && data.agentId) {
          updateAgent(data.agentId, data.state)
        } else if (data.type === 'state') {
          // Full state update
          if (data.agents) {
            Object.entries(data.agents).forEach(([id, state]: [string, any]) => {
              updateAgent(id, state)
            })
          }
          if (data.project) {
            setProjectInfo(
              data.project.name || 'AG Dev',
              data.project.totalTasks || 0,
              data.project.completedTasks || 0,
            )
          }
        } else if (data.type === 'clawdbot_event') {
          // Lifecycle events from bridge (session started, stopped, error, etc.)
          handleClawdbotEvent(data)
        } else if (data.type === 'agent_stream') {
          // Text delta streaming to agent's terminal
          if (data.agentId && data.delta) {
            updateAgent(data.agentId, {
              output: data.delta,
              thinking: data.thinking || undefined,
            })
          }
        } else if (data.type === 'bridge_status') {
          // Update bridge connection state
          setBridgeStatus({
            connected: data.connected ?? false,
            gatewayUrl: data.gatewayUrl || '',
            latency: data.latency ?? 0,
          })
        } else if (data.type === 'consent_pending') {
          // Update pending actions
          if (typeof data.count === 'number') {
            setPendingActions(data.count)
          }
          if (data.action) {
            addPendingActionDetail({
              id: data.action.id || `pa-${Date.now()}`,
              agentId: data.action.agentId || '',
              type: data.action.type || 'unknown',
              description: data.action.description || '',
              timestamp: Date.now(),
            })
          }
        } else if (data.type === 'toast') {
          // Trigger toast notification
          addToast(data.level || 'info', data.message || 'Notification')
        }
      } catch {}
    }

    es.onerror = () => {
      // Will auto-reconnect
      setBridgeStatus({ connected: false })
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [])

  function handleClawdbotEvent(data: any) {
    const { event, agentId, payload } = data
    switch (event) {
      case 'session_started':
        if (agentId) {
          updateAgent(agentId, {
            status: 'working',
            sessionKey: payload?.sessionKey || null,
          })
        }
        addToast('success', `Agent ${agentId || 'unknown'} session started`)
        break
      case 'session_stopped':
        if (agentId) {
          updateAgent(agentId, { status: 'idle', sessionKey: null })
        }
        addToast('info', `Agent ${agentId || 'unknown'} session stopped`)
        break
      case 'session_error':
        if (agentId) {
          updateAgent(agentId, { status: 'error' })
        }
        addToast('error', `Agent ${agentId || 'unknown'} error: ${payload?.message || 'unknown'}`)
        break
      case 'model_change':
        if (agentId && payload?.model) {
          updateAgent(agentId, { model: payload.model })
        }
        break
      case 'token_update':
        if (agentId && payload?.tokens) {
          updateAgent(agentId, { tokens: payload.tokens })
        }
        break
      default:
        break
    }
  }
}

export function usePolling(url: string, intervalMs = 10000) {
  const { setAgents, setProjectInfo } = useAgentStore()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        if (data.agents) setAgents(data.agents)
        if (data.project) {
          setProjectInfo(data.project?.name || '', data.project?.totalTasks || 0, data.project?.completedTasks || 0)
        }
      } catch {}
    }

    fetchData()
    const timer = setInterval(fetchData, intervalMs)
    return () => clearInterval(timer)
  }, [url, intervalMs])
}

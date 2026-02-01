import { useEffect, useRef } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useToastStore } from '../stores/toastStore'
import { DEFAULT_AGENTS, DEFAULT_SQUADS, type AgentMeta, type SquadDef } from '../lib/theme'

/** Bootstrap: fetch agent metadata from server on mount */
export function useBootstrap() {
  const { setAgentMetas, setSquads, loaded } = useAgentStore()
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current || loaded) return
    fetched.current = true

    fetch('/api/agents/meta')
      .then(r => {
        if (!r.ok) throw new Error('not ok')
        return r.json()
      })
      .then((data: { agents?: any[]; squads?: Record<string, any> | any[] }) => {
        // Map server agents to AgentMeta[]
        const metas: AgentMeta[] = (data.agents || []).map((a: any) => ({
          id: a.id,
          name: a.name || a.title || a.id,
          shortName: a.shortName || (a.name || a.id).slice(0, 3).toUpperCase(),
          icon: a.icon || '🤖',
          squad: a.squad || 'builders',
          role: a.role || a.title || '',
        }))

        // Map server squads
        let squads: Record<string, SquadDef> = {}
        if (data.squads) {
          if (Array.isArray(data.squads)) {
            // Array format: [{ id, label, icon, agents }]
            for (const s of data.squads) {
              squads[s.id] = {
                label: s.label || s.name || s.id,
                icon: s.icon || '📦',
                agents: s.agents || [],
              }
            }
          } else {
            // Object format: { squadId: { label, icon, agents } }
            squads = data.squads as Record<string, SquadDef>
          }
        }

        // If we got agents but no squads, derive squads from agent data
        if (metas.length > 0 && Object.keys(squads).length === 0) {
          const squadMap: Record<string, string[]> = {}
          for (const m of metas) {
            if (!squadMap[m.squad]) squadMap[m.squad] = []
            squadMap[m.squad].push(m.id)
          }
          for (const [sid, agents] of Object.entries(squadMap)) {
            squads[sid] = {
              label: sid.charAt(0).toUpperCase() + sid.slice(1),
              icon: DEFAULT_SQUADS[sid]?.icon || '📦',
              agents,
            }
          }
        }

        if (metas.length > 0) {
          setAgentMetas(metas)
          setSquads(Object.keys(squads).length > 0 ? squads : DEFAULT_SQUADS)
        } else {
          // No agents from server — use defaults
          setAgentMetas(DEFAULT_AGENTS)
          setSquads(DEFAULT_SQUADS)
        }
      })
      .catch(() => {
        // Fallback to defaults
        setAgentMetas(DEFAULT_AGENTS)
        setSquads(DEFAULT_SQUADS)
      })
  }, [])
}

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
          handleClawdbotEvent(data)
        } else if (data.type === 'agent_stream') {
          if (data.agentId && data.delta) {
            updateAgent(data.agentId, {
              output: data.delta,
              thinking: data.thinking || undefined,
            })
          }
        } else if (data.type === 'bridge_status') {
          setBridgeStatus({
            connected: data.connected ?? false,
            gatewayUrl: data.gatewayUrl || '',
            latency: data.latency ?? 0,
          })
        } else if (data.type === 'consent_pending') {
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
          addToast(data.level || 'info', data.message || 'Notification')
        }
      } catch {}
    }

    es.onerror = () => {
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

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import { AgentCard } from '../components/AgentCard'
import { AgentSpawnDialog } from '../components/AgentSpawnDialog'
import { useAgentStore, type AgentState } from '../stores/agentStore'
import { useUIStore } from '../stores/uiStore'
import { SQUADS, AGENTS, getSquadColor, type SquadId, colors } from '../lib/theme'

const defaultState: AgentState = {
  status: 'idle',
  currentTask: null,
  checklist: [],
  progress: 0,
  activityHistory: Array(20).fill(0),
  sessionKey: null,
  model: null,
  tokens: null,
}

const SQUAD_ORDER: SquadId[] = ['builders', 'thinkers', 'guardians', 'creators']

export const CockpitView = memo(function CockpitView() {
  const { agents } = useAgentStore()
  const { selectAgent } = useUIStore()
  const [spawnOpen, setSpawnOpen] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with spawn button */}
        <div className="flex items-center justify-between">
          <div />
          <button
            onClick={() => setSpawnOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.accent, color: '#fff' }}
          >
            <Rocket size={14} />
            Spawn Agent
          </button>
        </div>

        {/* Squad groups */}
        {SQUAD_ORDER.map(squadId => {
          const squad = SQUADS[squadId]
          const squadColor = getSquadColor(squadId)
          const squadAgents = AGENTS.filter(a => a.squad === squadId)

          return (
            <motion.div
              key={squadId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Squad header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">{squad.icon}</span>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: squadColor.main }}>
                  {squad.label}
                </h3>
                <div className="flex-1 h-px" style={{ backgroundColor: squadColor.main + '20' }} />
                <span className="text-[10px]" style={{ color: colors.text.muted }}>
                  {squadAgents.filter(a => (agents[a.id] || defaultState).status === 'working').length} active
                </span>
              </div>

              {/* Agent cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {squadAgents.map(agentMeta => (
                  <AgentCard
                    key={agentMeta.id}
                    meta={agentMeta}
                    state={agents[agentMeta.id] || defaultState}
                    onClick={() => selectAgent(agentMeta.id)}
                  />
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Spawn dialog */}
      <AgentSpawnDialog open={spawnOpen} onClose={() => setSpawnOpen(false)} />
    </div>
  )
})

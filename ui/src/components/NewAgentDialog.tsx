import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { useStore } from '../store'
import { DEFAULT_AGENTS, getAgentMeta, getSquadColor } from '../lib/theme'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: any) => void
}

export function NewAgentDialog({ isOpen, onClose, onSubmit }: Props) {
  const { agents } = useStore()
  const [type, setType] = useState<'claude' | 'agent' | 'custom'>('agent')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [task, setTask] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [count, setCount] = useState(1)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (type === 'agent' && count > 1) {
      // Handle multiple agents
      for (let i = 1; i <= count; i++) {
        const agentMeta = getAgentMeta(selectedAgent)
        const config = {
          type: 'agent',
          name: `${agentMeta?.name || selectedAgent} #${i}`,
          task,
          agentId: selectedAgent
        }
        await onSubmit(config)
        // Small delay between spawning to prevent conflicts
        if (i < count) await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else {
      // Single agent
      switch (type) {
        case 'claude':
          onSubmit({ type: 'claude', task, name: 'Claude Code' })
          break
        case 'agent':
          const agentMeta = getAgentMeta(selectedAgent)
          onSubmit({ type: 'agent', name: agentMeta?.name || selectedAgent, task, agentId: selectedAgent })
          break
        case 'custom':
          onSubmit({ type: 'custom', name: command, command, args: args.split(' ').filter(Boolean) })
          break
      }
    }
    
    // Reset
    setSelectedAgent('')
    setTask('')
    setCommand('')
    setArgs('')
    setCount(1)
    onClose()
  }

  const selectedAgentMeta = getAgentMeta(selectedAgent)
  const squadColor = selectedAgentMeta ? getSquadColor(selectedAgentMeta.squad) : null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-surface border border-bg-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">New Agent</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-surfaceHover text-text-muted">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['claude', 'agent', 'custom'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    type === t 
                      ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' 
                      : 'bg-bg-primary border-bg-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {t === 'claude' ? '🤖 Claude' : t === 'agent' ? '🎯 Agent' : '⚡ Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Agent selection */}
          {type === 'agent' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-primary"
                required
              >
                <option value="">Select an agent...</option>
                {DEFAULT_AGENTS.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.icon} {agent.name} - {agent.role}
                  </option>
                ))}
              </select>
              
              {/* Agent info */}
              {selectedAgentMeta && squadColor && (
                <div className="mt-2 p-3 rounded-lg border border-bg-border bg-bg-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{selectedAgentMeta.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{selectedAgentMeta.name}</div>
                      <div className="text-xs" style={{ color: squadColor.main }}>{selectedAgentMeta.squad}</div>
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary">{selectedAgentMeta.role}</div>
                </div>
              )}
            </div>
          )}

          {/* Quantity selector for agents (Dev agents especially) */}
          {type === 'agent' && selectedAgent === 'dev' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Quantity (Max 4 for parallel work)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="p-1 rounded border border-bg-border text-text-secondary hover:text-text-primary"
                  disabled={count <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="text-text-primary font-medium min-w-[2ch] text-center">{count}</span>
                <button
                  type="button"
                  onClick={() => setCount(Math.min(4, count + 1))}
                  className="p-1 rounded border border-bg-border text-text-secondary hover:text-text-primary"
                  disabled={count >= 4}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="text-xs text-text-muted mt-1">
                Each dev agent will get its own terminal and can work in parallel
              </div>
            </div>
          )}

          {/* Task (claude + agent) */}
          {(type === 'claude' || type === 'agent') && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Task / Prompt</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what this agent should do..."
                rows={3}
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-primary resize-none"
                required
              />
            </div>
          )}

          {/* Command (custom) */}
          {type === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Command</label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g., python3, node, bash"
                  className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Arguments</label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g., -i script.py"
                  className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-primary"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-accent-primary text-text-inverse font-bold py-2.5 rounded-lg hover:brightness-110 transition-all text-sm"
          >
            {type === 'agent' && count > 1 ? `Launch ${count} Agents` : 'Launch Agent'}
          </button>
        </form>
      </div>
    </div>
  )
}
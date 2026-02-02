import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useStore, Squad } from '../store'
import { getSquadColor } from '../lib/theme'

interface Props {
  onSquadSelect: (squad: Squad, task: string) => void
}

export function SquadSelector({ onSquadSelect }: Props) {
  const { squads, setActiveSquad, setView } = useStore()
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [task, setTask] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSquadClick = (squad: Squad) => {
    setSelectedSquad(squad)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSquad && task.trim()) {
      onSquadSelect(selectedSquad, task.trim())
      setActiveSquad(selectedSquad.id)
      setView('grid')
      setIsModalOpen(false)
      setTask('')
      setSelectedSquad(null)
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setTask('')
    setSelectedSquad(null)
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Choose Your Squad</h2>
          <p className="text-text-secondary">Select a specialized team to tackle your development challenge</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {squads.map((squad, index) => {
            const squadColors = getSquadColor(squad.id)
            return (
              <div
                key={squad.id}
                className="group bg-bg-surface border border-bg-border rounded-lg p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  borderColor: squadColors.main + '30'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = squadColors.main + '80'
                  e.currentTarget.style.boxShadow = `0 10px 25px -12px ${squadColors.glow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = squadColors.main + '30'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => handleSquadClick(squad)}
              >
                <div className="text-4xl mb-4">{squad.icon}</div>
                <h3 className="text-lg font-bold text-text-primary mb-2">{squad.name}</h3>
                <p className="text-text-secondary text-sm mb-4">{squad.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Users size={12} />
                    <span>{squad.agents.length} agents</span>
                  </div>
                  <div 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: squadColors.bg,
                      color: squadColors.main
                    }}
                  >
                    {squad.id}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-bg-surface border border-bg-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-primary/50 transition-colors"
            onClick={() => {/* TODO: Custom squad creation */}}
          >
            <Plus size={16} />
            Create Custom Squad
          </button>
        </div>
      </div>

      {/* Task Modal */}
      {isModalOpen && selectedSquad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-bg-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{selectedSquad.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{selectedSquad.name}</h3>
                <p className="text-text-secondary text-sm">{selectedSquad.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  What would you like this squad to work on?
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-bg-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-primary"
                  placeholder="Describe your project or task..."
                  rows={4}
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-bg-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent-primary text-bg-primary rounded-lg font-medium hover:brightness-110 transition-all"
                >
                  Deploy Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
import { useState, useEffect } from 'react'
import { Search, Play, X, ChevronRight, Zap, Hash, Clock, Download } from 'lucide-react'
import { useStore } from '../store'

interface CategoryInfo {
  id: string
  label: string
  icon: string
  count: number
}

const categoryIcons = {
  generator: '🏗️',
  transformer: '🔄',
  analyzer: '🔍',
  connector: '🔌',
  builder: '🧱',
  validator: '✅'
}

export function SuperSkillsView() {
  const {
    superskills,
    superskillStats,
    selectedSuperskill,
    superskillOutput,
    fetchSuperskills,
    runSuperskill,
    setSelectedSuperskill,
    setSuperskillOutput
  } = useStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [executionPanelOpen, setExecutionPanelOpen] = useState(false)
  const [inputData, setInputData] = useState<string>('{}')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionTime, setExecutionTime] = useState<number>(0)

  // Load superskills on mount
  useEffect(() => {
    fetchSuperskills()
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/superskills/stats')
      const stats = await response.json()
      useStore.setState({ superskillStats: stats })
    } catch (error) {
      console.error('Failed to load superskill stats:', error)
    }
  }

  // Filter superskills
  const filteredSuperskills = superskills.filter(skill => {
    const matchesSearch = searchTerm === '' || 
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Categories with counts
  const categories: CategoryInfo[] = [
    { id: 'all', label: 'All', icon: '📦', count: superskills.length },
    { id: 'generator', label: 'Generators', icon: '🏗️', count: superskillStats.byCategory.generator || 0 },
    { id: 'transformer', label: 'Transformers', icon: '🔄', count: superskillStats.byCategory.transformer || 0 },
    { id: 'analyzer', label: 'Analyzers', icon: '🔍', count: superskillStats.byCategory.analyzer || 0 },
    { id: 'connector', label: 'Connectors', icon: '🔌', count: superskillStats.byCategory.connector || 0 },
    { id: 'builder', label: 'Builders', icon: '🧱', count: superskillStats.byCategory.builder || 0 },
    { id: 'validator', label: 'Validators', icon: '✅', count: superskillStats.byCategory.validator || 0 },
  ]

  const handleRunSuperskill = (skillName: string) => {
    setSelectedSuperskill(skillName)
    setSuperskillOutput(null)
    setExecutionPanelOpen(true)
    
    // Pre-fill with example if available
    const skill = superskills.find(s => s.name === skillName)
    if (skill?.input.example) {
      setInputData(JSON.stringify(skill.input.example, null, 2))
    } else {
      setInputData('{}')
    }
  }

  const executeSuperskill = async () => {
    if (!selectedSuperskill) return
    
    setIsExecuting(true)
    const startTime = Date.now()
    
    try {
      const input = JSON.parse(inputData)
      const result = await runSuperskill(selectedSuperskill, input)
      setExecutionTime(Date.now() - startTime)
    } catch (error) {
      console.error('Execution failed:', error)
      setSuperskillOutput({ error: error.message })
      setExecutionTime(Date.now() - startTime)
    } finally {
      setIsExecuting(false)
    }
  }

  const selectedSkill = superskills.find(s => s.name === selectedSuperskill)

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Sidebar */}
      <div className="w-64 bg-bg-surface border-r border-bg-border flex flex-col">
        {/* Stats Header */}
        <div className="p-4 border-b border-bg-border">
          <h3 className="text-lg font-bold text-text-primary mb-2">SuperSkills</h3>
          <div className="text-sm text-text-secondary space-y-1">
            <div>Total: {superskillStats.total} skills</div>
            <div>Token Savings: {superskillStats.totalTokenSavings}</div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-auto p-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                selectedCategory === category.id
                  ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surfaceHover'
              }`}
            >
              <span className="text-base">{category.icon}</span>
              <span className="flex-1 text-left">{category.label}</span>
              <span className="text-xs opacity-60">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-bg-border bg-bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search superskills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-bg-border bg-bg-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
            />
          </div>
        </div>

        {/* Skills Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuperskills.map(skill => (
              <div
                key={skill.name}
                className="bg-bg-surface border border-bg-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[skill.category]}</span>
                    <h4 className="font-bold text-text-primary">{skill.name}</h4>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    skill.category === 'builder' ? 'bg-blue-500/10 text-blue-400' :
                    skill.category === 'validator' ? 'bg-green-500/10 text-green-400' :
                    skill.category === 'analyzer' ? 'bg-purple-500/10 text-purple-400' :
                    skill.category === 'transformer' ? 'bg-orange-500/10 text-orange-400' :
                    skill.category === 'generator' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {skill.category}
                  </div>
                </div>

                <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                  {skill.description}
                </p>

                {/* Tags */}
                {skill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {skill.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded text-xs bg-bg-primary text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    {skill.tags.length > 3 && (
                      <span className="px-2 py-1 rounded text-xs bg-bg-primary text-text-muted">
                        +{skill.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Token Savings Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-accent-success">
                    <Zap size={12} />
                    <span>{skill.tokenSavings}</span>
                  </div>
                  
                  <button
                    onClick={() => handleRunSuperskill(skill.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-bg-primary hover:brightness-110 transition-all"
                  >
                    <Play size={12} />
                    Run
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredSuperskills.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">No Skills Found</h3>
              <p className="text-text-secondary">Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Panel */}
      {executionPanelOpen && (
        <div className="w-96 bg-bg-surface border-l border-bg-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bg-border">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedSkill && categoryIcons[selectedSkill.category]}</span>
              <h3 className="font-bold text-text-primary">{selectedSuperskill}</h3>
            </div>
            <button
              onClick={() => setExecutionPanelOpen(false)}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-surfaceHover"
            >
              <X size={16} />
            </button>
          </div>

          {/* Input Form */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-bg-border">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Input JSON
              </label>
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                rows={8}
                className="w-full p-3 rounded-lg border border-bg-border bg-bg-primary text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
                placeholder="Enter JSON input..."
              />
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-text-muted">
                  {selectedSkill && `Timeout: ${selectedSkill.timeout}s`}
                </span>
                <button
                  onClick={executeSuperskill}
                  disabled={isExecuting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isExecuting 
                      ? 'bg-gray-500/20 text-text-muted cursor-not-allowed'
                      : 'bg-accent-primary text-bg-primary hover:brightness-110'
                  }`}
                >
                  <Play size={14} />
                  {isExecuting ? 'Executing...' : 'Execute'}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-primary">
                  Output
                </label>
                {executionTime > 0 && (
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {executionTime}ms
                    </span>
                    {superskillOutput && !superskillOutput.error && (
                      <span className="flex items-center gap-1 text-accent-success">
                        <Zap size={12} />
                        Tokens saved
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {superskillOutput ? (
                <pre className={`p-3 rounded-lg border text-sm font-mono overflow-auto ${
                  superskillOutput.error 
                    ? 'border-accent-error bg-accent-error/10 text-accent-error'
                    : 'border-bg-border bg-bg-primary text-text-primary'
                }`}>
                  {JSON.stringify(superskillOutput, null, 2)}
                </pre>
              ) : (
                <div className="p-3 rounded-lg border border-bg-border bg-bg-primary text-text-muted text-sm text-center">
                  Output will appear here after execution
                </div>
              )}

              {/* Download Output */}
              {superskillOutput && superskillOutput.filePath && (
                <div className="mt-3">
                  <a
                    href={`/api/download?path=${encodeURIComponent(superskillOutput.filePath)}`}
                    download
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                  >
                    <Download size={14} />
                    Download Output File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
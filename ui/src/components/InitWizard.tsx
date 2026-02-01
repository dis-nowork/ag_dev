import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, ChevronRight, ChevronLeft, Check, Loader2, Users, Github, GitBranch } from 'lucide-react'
import { colors } from '../lib/theme'

interface Template {
  id: string
  name: string
  description: string
  icon: string
  agents: string[]
  squads: Record<string, string[]>
  defaultDirectives: Record<string, string>
}

interface InitWizardProps {
  onComplete: () => void
}

const STEPS = ['Repository', 'Template', 'Agents', 'Confirm'] as const

export function InitWizard({ onComplete }: InitWizardProps) {
  const [step, setStep] = useState(0)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [gitUrl, setGitUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [setupStatus, setSetupStatus] = useState<'idle' | 'setting-up' | 'done' | 'error'>('idle')
  const [setupMessage, setSetupMessage] = useState('')
  const [projectPath, setProjectPath] = useState('')

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [squads, setSquads] = useState<Record<string, string[]>>({})
  const [allAgents, setAllAgents] = useState<Array<{ id: string; name: string; squad: string }>>([])

  // Load templates + agents on mount
  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => setTemplates(data.templates || []))
      .catch(() => {})

    fetch('/api/agents/meta')
      .then(r => r.json())
      .then(data => {
        setAllAgents(data.agents || [])
        setActiveAgents((data.agents || []).map((a: any) => a.id))
        const defaultSquads: Record<string, string[]> = {}
        ;(data.squads || []).forEach((s: any) => {
          defaultSquads[s.id] = s.agents
        })
        setSquads(defaultSquads)
      })
      .catch(() => {})
  }, [])

  // Auto-derive project name and branch from URL
  useEffect(() => {
    if (gitUrl.trim()) {
      const match = gitUrl.match(/github\.com\/[\w.-]+\/([\w.-]+?)(?:\.git)?$/i)
      if (match) {
        const repoName = match[1]
        setProjectName(repoName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        if (!branchName) setBranchName(`ag-dev/${repoName}`)
      }
    }
  }, [gitUrl])

  // When template changes, update agents
  useEffect(() => {
    if (selectedTemplate) {
      const t = templates.find(t => t.id === selectedTemplate)
      if (t) {
        setActiveAgents(t.agents)
        setSquads(t.squads)
      }
    }
  }, [selectedTemplate, templates])

  // Setup: clone + branch in one step
  const handleSetup = async () => {
    if (!gitUrl.trim()) return
    setSetupStatus('setting-up')
    setSetupMessage('Connecting to repository...')
    setError('')

    try {
      const res = await fetch('/api/project/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: gitUrl,
          branch: branchName || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setProjectPath(data.path)
        setProjectName(data.name || projectName)
        setBranchName(data.branch || branchName)
        setSetupStatus('done')
        setSetupMessage(`Ready — working on branch ${data.branch}`)
      } else {
        setError(data.error || 'Setup failed')
        setSetupStatus('error')
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
      setSetupStatus('error')
    }
  }

  const canNext = () => {
    if (step === 0) return setupStatus === 'done'
    if (step === 1) return true
    if (step === 2) return activeAgents.length > 0
    return true
  }

  const handleInit = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/project/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          projectRoot: projectPath,
          templateId: selectedTemplate,
          agents: activeAgents,
          squads,
        }),
      })
      const data = await res.json()
      if (data.ok || data.success) {
        onComplete()
      } else {
        setError(data.error || 'Failed to initialize')
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const toggleAgent = (id: string) => {
    setActiveAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const selectedTpl = templates.find(t => t.id === selectedTemplate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl border overflow-hidden"
        style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: colors.bg.border }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.squads.builders.bg }}>
              <Rocket size={20} style={{ color: colors.squads.builders.main }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.text.primary }}>Initialize AG Dev</h2>
              <p className="text-xs" style={{ color: colors.text.secondary }}>Connect a repository and configure your agents</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => i <= step && setStep(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: i === step ? colors.squads.builders.bg : i < step ? colors.status.complete + '15' : 'transparent',
                  color: i === step ? colors.squads.builders.main : i < step ? colors.status.complete : colors.text.muted,
                  cursor: i <= step ? 'pointer' : 'default',
                }}
              >
                {i < step ? <Check size={12} /> : <span className="w-3 text-center">{i + 1}</span>}
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Step 0: Repository */}
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    Paste your GitHub repository URL. AG Dev will connect to it and create a working branch for the agents.
                  </p>

                  {/* GitHub URL */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                      <Github size={12} className="inline mr-1" /> Repository URL
                    </label>
                    <input
                      type="text"
                      value={gitUrl}
                      onChange={e => { setGitUrl(e.target.value); setSetupStatus('idle'); setError('') }}
                      placeholder="https://github.com/user/repo"
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-blue-500"
                      style={{
                        backgroundColor: colors.bg.primary,
                        borderColor: setupStatus === 'done' ? colors.status.complete + '60' : colors.bg.border,
                        color: colors.text.primary,
                      }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && gitUrl.trim() && setupStatus !== 'setting-up') handleSetup() }}
                    />
                  </div>

                  {/* Branch name */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                      <GitBranch size={12} className="inline mr-1" /> Working Branch
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      placeholder="ag-dev/feature-name"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:border-blue-500"
                      style={{
                        backgroundColor: colors.bg.primary,
                        borderColor: colors.bg.border,
                        color: colors.text.primary,
                      }}
                    />
                    <p className="text-[10px] mt-1" style={{ color: colors.text.muted }}>
                      Agents will work on this branch. Leave as-is or customize.
                    </p>
                  </div>

                  {/* Connect button */}
                  <button
                    onClick={handleSetup}
                    disabled={setupStatus === 'setting-up' || !gitUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor:
                        setupStatus === 'done' ? colors.status.complete + '15' :
                        setupStatus === 'setting-up' ? colors.bg.surfaceHover :
                        colors.squads.builders.main,
                      color:
                        setupStatus === 'done' ? colors.status.complete :
                        setupStatus === 'setting-up' ? colors.text.secondary :
                        '#fff',
                      opacity: !gitUrl.trim() ? 0.4 : 1,
                    }}
                  >
                    {setupStatus === 'setting-up' && <Loader2 size={16} className="animate-spin" />}
                    {setupStatus === 'done' && <Check size={16} />}
                    {setupStatus === 'idle' && <Github size={16} />}
                    {setupStatus === 'error' && <Github size={16} />}
                    {setupStatus === 'setting-up' ? 'Connecting...' :
                     setupStatus === 'done' ? setupMessage :
                     'Connect Repository'}
                  </button>

                  {error && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: colors.status.error + '15', color: colors.status.error }}>
                      ⚠ {error}
                    </p>
                  )}
                </div>
              )}

              {/* Step 1: Choose Template */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-xs mb-3" style={{ color: colors.text.secondary }}>
                    Choose a template to pre-configure agents for your project type.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:border-white/20"
                      style={{
                        backgroundColor: !selectedTemplate ? colors.squads.builders.bg : colors.bg.primary,
                        borderColor: !selectedTemplate ? colors.squads.builders.main : colors.bg.border,
                      }}
                    >
                      <span className="text-xl">⚙️</span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: colors.text.primary }}>Custom</div>
                        <div className="text-[11px]" style={{ color: colors.text.secondary }}>Pick your own agents</div>
                      </div>
                    </button>
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:border-white/20"
                        style={{
                          backgroundColor: selectedTemplate === t.id ? colors.squads.builders.bg : colors.bg.primary,
                          borderColor: selectedTemplate === t.id ? colors.squads.builders.main : colors.bg.border,
                        }}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium" style={{ color: colors.text.primary }}>{t.name}</div>
                          <div className="text-[11px]" style={{ color: colors.text.secondary }}>{t.description}</div>
                          <div className="text-[10px] mt-1" style={{ color: colors.text.muted }}>
                            {t.agents.length} agents · {Object.keys(t.squads || {}).length} squads
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Agents */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: colors.text.secondary }}>
                      <Users size={12} className="inline mr-1" />
                      Select agents ({activeAgents.length} active)
                    </p>
                    <div className="flex gap-1">
                      <button onClick={() => setActiveAgents(allAgents.map(a => a.id))}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ color: colors.squads.builders.main, backgroundColor: colors.squads.builders.bg }}>All</button>
                      <button onClick={() => setActiveAgents([])}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ color: colors.text.muted, backgroundColor: colors.bg.primary }}>None</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[250px] overflow-y-auto pr-1">
                    {allAgents.map(agent => {
                      const active = activeAgents.includes(agent.id)
                      const sc = agent.squad === 'builders' ? colors.squads.builders :
                                 agent.squad === 'thinkers' ? colors.squads.thinkers :
                                 agent.squad === 'guardians' ? colors.squads.guardians :
                                 colors.squads.creators
                      return (
                        <button key={agent.id} onClick={() => toggleAgent(agent.id)}
                          className="flex items-center gap-2 p-2 rounded-lg border text-left transition-all"
                          style={{
                            backgroundColor: active ? sc.bg : colors.bg.primary,
                            borderColor: active ? sc.main + '50' : colors.bg.border,
                            opacity: active ? 1 : 0.5,
                          }}>
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: active ? sc.main : colors.bg.surfaceHover, color: active ? '#fff' : colors.text.muted }}>
                            {active ? '✓' : ''}
                          </div>
                          <div>
                            <div className="text-xs font-medium" style={{ color: colors.text.primary }}>{agent.name}</div>
                            <div className="text-[10px]" style={{ color: colors.text.muted }}>{agent.squad}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4" style={{ backgroundColor: colors.bg.primary, borderColor: colors.bg.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: colors.text.primary }}>Configuration Summary</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: colors.text.secondary }}>Repository</span>
                        <span className="max-w-[300px] truncate" style={{ color: colors.text.primary }}>{gitUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: colors.text.secondary }}>Project</span>
                        <span style={{ color: colors.text.primary }}>{projectName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: colors.text.secondary }}>Branch</span>
                        <span style={{ color: colors.squads.builders.main }}>{branchName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: colors.text.secondary }}>Template</span>
                        <span style={{ color: colors.text.primary }}>{selectedTpl?.name || 'Custom'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: colors.text.secondary }}>Agents</span>
                        <span style={{ color: colors.text.primary }}>{activeAgents.length} active</span>
                      </div>
                      <div className="border-t pt-2 mt-2" style={{ borderColor: colors.bg.border }}>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeAgents.map(id => {
                            const agent = allAgents.find(a => a.id === id)
                            return (
                              <span key={id} className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: colors.bg.surfaceHover, color: colors.text.primary }}>
                                {agent?.name || id}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: colors.status.error + '15', color: colors.status.error }}>
                      ⚠ {error}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: colors.bg.border }}>
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              color: step > 0 ? colors.text.secondary : colors.text.muted,
              backgroundColor: step > 0 ? colors.bg.surfaceHover : 'transparent',
              opacity: step > 0 ? 1 : 0.3,
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: canNext() ? colors.squads.builders.main : colors.bg.surfaceHover,
                color: canNext() ? '#fff' : colors.text.muted,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleInit}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: loading ? colors.bg.surfaceHover : colors.status.complete,
                color: '#fff',
              }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Initializing...</> : <><Rocket size={14} /> Launch Project</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

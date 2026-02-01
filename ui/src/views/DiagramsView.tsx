import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Download, Edit3, Eye, RefreshCw } from 'lucide-react'
import mermaid from 'mermaid'
import { useAgentStore } from '../stores/agentStore'
import { AGENTS, SQUADS, colors } from '../lib/theme'

type DiagramTab = 'flow' | 'architecture' | 'agent-flow' | 'custom'

const TABS: { id: DiagramTab; label: string }[] = [
  { id: 'flow', label: 'Workflow' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'agent-flow', label: 'Agent Flow' },
  { id: 'custom', label: 'Custom' },
]

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3B82F6',
    primaryTextColor: '#EDEDEF',
    primaryBorderColor: '#2A2A2E',
    lineColor: '#5A5A5D',
    secondaryColor: '#1C1C1F',
    tertiaryColor: '#141416',
    background: '#0A0A0B',
    mainBkg: '#141416',
    nodeBorder: '#2A2A2E',
    clusterBkg: '#1C1C1F',
    titleColor: '#EDEDEF',
    edgeLabelBackground: '#141416',
  },
})

function generateWorkflowDiagram(): string {
  return `flowchart TD
    A[🔍 Analyst\\nProject Brief] --> B[📋 PM\\nPRD]
    B --> C[🎨 UX Designer\\nUX Spec]
    B --> D[🏛️ Architect\\nArchitecture]
    C --> E[✅ PO\\nValidation]
    D --> E
    E --> F[📌 Scrum Master\\nTask Sharding]
    D --> G[📊 Data Engineer\\nDatabase Design]
    F --> H[⚡ Developer\\nImplementation]
    G --> H
    H --> I[🧪 QA\\nTesting]
    I --> J[🔧 DevOps\\nDeploy]
    
    style A fill:#A855F720,stroke:#A855F7
    style B fill:#A855F720,stroke:#A855F7
    style C fill:#10B98120,stroke:#10B981
    style D fill:#3B82F620,stroke:#3B82F6
    style E fill:#A855F720,stroke:#A855F7
    style F fill:#EF444420,stroke:#EF4444
    style G fill:#3B82F620,stroke:#3B82F6
    style H fill:#3B82F620,stroke:#3B82F6
    style I fill:#EF444420,stroke:#EF4444
    style J fill:#3B82F620,stroke:#3B82F6`
}

function generateArchitectureDiagram(): string {
  return `flowchart TB
    subgraph UI["🖥️ AG Dev UI (React)"]
      CV[Cockpit View]
      TV[Terminal View]
      GV[Gantt View]
      SV[Strategy Canvas]
    end
    
    subgraph Server["⚙️ AG Dev Server (Express)"]
      API[REST API]
      SSE[SSE Stream]
      State[State Manager]
    end
    
    subgraph Bridge["🌉 WebSocket Bridge"]
      WS[WS Client]
    end
    
    subgraph Gateway["🤖 Clawdbot Gateway"]
      Agent[Agent Loop]
      Sessions[Session Manager]
      Tools[Tool Pipeline]
      Hooks[Lifecycle Hooks]
    end
    
    UI --> |HTTP + SSE| Server
    Server --> |WebSocket v3| Bridge
    Bridge --> |Protocol v3| Gateway
    Gateway --> |Events| Bridge
    Bridge --> |SSE Broadcast| Server
    Server --> |Real-time| UI
    
    style UI fill:#3B82F610,stroke:#3B82F6
    style Server fill:#10B98110,stroke:#10B981
    style Bridge fill:#A855F710,stroke:#A855F7
    style Gateway fill:#EF444410,stroke:#EF4444`
}

function generateAgentFlowDiagram(agents: Record<string, any>): string {
  const lines = ['flowchart LR']
  const activeAgents = AGENTS.filter(a => agents[a.id]?.status === 'working')
  const doneAgents = AGENTS.filter(a => agents[a.id]?.status === 'done')
  const idleAgents = AGENTS.filter(a => !agents[a.id] || agents[a.id]?.status === 'idle')

  lines.push('  subgraph Active["⚡ Active"]')
  activeAgents.forEach(a => lines.push(`    ${a.id}["${a.icon} ${a.shortName}"]`))
  if (activeAgents.length === 0) lines.push('    none_active["No active agents"]')
  lines.push('  end')

  lines.push('  subgraph Done["✅ Done"]')
  doneAgents.forEach(a => lines.push(`    ${a.id}["${a.icon} ${a.shortName}"]`))
  if (doneAgents.length === 0) lines.push('    none_done["None yet"]')
  lines.push('  end')

  lines.push('  subgraph Waiting["💤 Waiting"]')
  idleAgents.forEach(a => lines.push(`    ${a.id}["${a.icon} ${a.shortName}"]`))
  lines.push('  end')

  lines.push('  style Active fill:#10B98110,stroke:#10B981')
  lines.push('  style Done fill:#3B82F610,stroke:#3B82F6')
  lines.push('  style Waiting fill:#1C1C1F,stroke:#2A2A2E')

  return lines.join('\n')
}

export const DiagramsView = memo(function DiagramsView() {
  const { agents } = useAgentStore()
  const [activeTab, setActiveTab] = useState<DiagramTab>('flow')
  const [customCode, setCustomCode] = useState('flowchart TD\n  A[Start] --> B[End]')
  const [editing, setEditing] = useState(false)
  const [svgContent, setSvgContent] = useState('')
  const renderRef = useRef<HTMLDivElement>(null)
  const idCounter = useRef(0)

  const getDiagramCode = useCallback(() => {
    switch (activeTab) {
      case 'flow': return generateWorkflowDiagram()
      case 'architecture': return generateArchitectureDiagram()
      case 'agent-flow': return generateAgentFlowDiagram(agents)
      case 'custom': return customCode
    }
  }, [activeTab, agents, customCode])

  const renderDiagram = useCallback(async () => {
    const code = getDiagramCode()
    try {
      const id = `mermaid-${++idCounter.current}`
      const { svg } = await mermaid.render(id, code)
      setSvgContent(svg)
    } catch (e) {
      setSvgContent(`<p style="color:#EF4444;padding:20px">Diagram error: ${e instanceof Error ? e.message : 'Unknown error'}</p>`)
    }
  }, [getDiagramCode])

  useEffect(() => { renderDiagram() }, [renderDiagram])

  const exportSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ag-dev-${activeTab}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.bg.border }}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            📐 Diagrams
          </h2>
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setEditing(false) }}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? colors.bg.surfaceActive : 'transparent',
                  color: activeTab === tab.id ? colors.text.primary : colors.text.secondary,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5 border"
            style={{ borderColor: colors.bg.border, color: colors.text.secondary }}
          >
            {editing ? <Eye size={12} /> : <Edit3 size={12} />}
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={renderDiagram}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5 border"
            style={{ borderColor: colors.bg.border, color: colors.text.secondary }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={exportSvg}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: colors.accent, color: '#fff' }}
          >
            <Download size={12} />
            Export SVG
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {editing ? (
          <div className="flex-1 flex">
            {/* Editor */}
            <div className="w-1/2 border-r p-4" style={{ borderColor: colors.bg.border }}>
              <textarea
                value={activeTab === 'custom' ? customCode : getDiagramCode()}
                onChange={e => { if (activeTab === 'custom') setCustomCode(e.target.value) }}
                readOnly={activeTab !== 'custom'}
                className="w-full h-full rounded-lg p-3 font-mono text-xs resize-none outline-none border"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.bg.border,
                  color: colors.text.primary,
                }}
              />
            </div>
            {/* Preview */}
            <div
              className="w-1/2 overflow-auto flex items-center justify-center p-4"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        ) : (
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-8"
            style={{ backgroundColor: colors.bg.primary }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  )
})

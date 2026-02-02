import { create } from 'zustand'

export interface TerminalInfo {
  id: string
  command: string
  args: string[]
  status: 'running' | 'exited' | 'killed'
  startTime: number
  endTime?: number
  exitCode?: number
  uptime?: number
  name?: string
  type?: string
  task?: string
}

interface AgentDef {
  name: string
  description: string
  role: string
}

export interface Squad {
  id: string
  name: string
  description: string
  icon: string
  agents: string[]
  defaultWorkflow: string | null
  color: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'system'
  text: string
  timestamp: number
}

export interface WorkflowState {
  active: boolean
  name: string
  currentStep: string
  steps: Array<{ id: string; agent: string; status: string }>
}

// Ralph Loop state
export interface RalphState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  prd: {
    name: string
    userStories: Array<{
      id: string
      title: string
      description: string
      priority: number
      passes: boolean
      skipped?: boolean
      attempts?: number
      completedAt?: string
    }>
  } | null
  currentIteration: number
  currentTask: any
  progress: number
  learnings: Array<{ time: string; text: string }>
}

export interface SuperSkill {
  name: string
  version: string
  category: 'generator' | 'transformer' | 'analyzer' | 'connector' | 'builder' | 'validator'
  description: string
  input: {
    type: string
    schema: object
    required?: string[]
    example?: any
  }
  output: {
    type: string
    structure?: object
    format?: string
  }
  tokenSavings: string
  tags: string[]
  requires: string[]
  run: string
  timeout: number
}

export interface SuperSkillStats {
  total: number
  byCategory: Record<string, number>
  totalTokenSavings: string
}

interface Store {
  terminals: TerminalInfo[]
  agents: AgentDef[]
  connected: boolean
  
  // New Squad functionality
  squads: Squad[]
  activeSquad: string | null
  
  // Chat messages
  chatMessages: ChatMessage[]
  
  // Current view
  currentView: 'grid' | 'squads' | 'workflow' | 'ralph' | 'context' | 'superskills'
  
  // Workflow state
  workflowState: WorkflowState | null
  
  // Chat sidebar
  chatSidebarOpen: boolean
  
  // Ralph Loop state
  ralph: RalphState
  
  // Project Context state
  projectContext: Record<string, string>  // filename -> content
  
  // SuperSkills state
  superskills: SuperSkill[]
  superskillStats: SuperSkillStats
  selectedSuperskill: string | null
  superskillOutput: any
  
  // Actions
  setTerminals: (terminals: TerminalInfo[]) => void
  addTerminal: (terminal: TerminalInfo) => void
  updateTerminal: (id: string, updates: Partial<TerminalInfo>) => void
  removeTerminal: (id: string) => void
  setAgents: (agents: AgentDef[]) => void
  setConnected: (connected: boolean) => void
  
  // New actions
  setSquads: (squads: Squad[]) => void
  setActiveSquad: (id: string | null) => void
  addChatMessage: (msg: ChatMessage) => void
  setView: (view: 'grid' | 'squads' | 'workflow' | 'ralph' | 'context' | 'superskills') => void
  setWorkflowState: (state: WorkflowState | null) => void
  setChatSidebarOpen: (open: boolean) => void
  setRalph: (state: Partial<RalphState>) => void
  setProjectContext: (ctx: Record<string, string>) => void
  
  // SuperSkills actions
  fetchSuperskills: () => Promise<void>
  runSuperskill: (name: string, input: any) => Promise<any>
  setSuperskillStats: (stats: SuperSkillStats) => void
  setSelectedSuperskill: (name: string | null) => void
  setSuperskillOutput: (output: any) => void
}

import { DEFAULT_SQUADS, getSquadColor } from './lib/theme'

// Default squads based on AIOS design
const defaultSquads: Squad[] = [
  {
    id: 'builders',
    name: DEFAULT_SQUADS.builders.label,
    description: 'System builders and developers',
    icon: DEFAULT_SQUADS.builders.icon,
    agents: DEFAULT_SQUADS.builders.agents,
    defaultWorkflow: 'build-system',
    color: getSquadColor('builders').main
  },
  {
    id: 'thinkers',
    name: DEFAULT_SQUADS.thinkers.label,
    description: 'Strategic analysts and product managers',
    icon: DEFAULT_SQUADS.thinkers.icon,
    agents: DEFAULT_SQUADS.thinkers.agents,
    defaultWorkflow: 'analysis-planning',
    color: getSquadColor('thinkers').main
  },
  {
    id: 'guardians',
    name: DEFAULT_SQUADS.guardians.label,
    description: 'Quality assurance and system guardians',
    icon: DEFAULT_SQUADS.guardians.icon,
    agents: DEFAULT_SQUADS.guardians.agents,
    defaultWorkflow: 'qa-validation',
    color: getSquadColor('guardians').main
  },
  {
    id: 'creators',
    name: DEFAULT_SQUADS.creators.label,
    description: 'Creative designers and content creators',
    icon: DEFAULT_SQUADS.creators.icon,
    agents: DEFAULT_SQUADS.creators.agents,
    defaultWorkflow: 'design-creation',
    color: getSquadColor('creators').main
  }
]

export const useStore = create<Store>((set) => ({
  terminals: [],
  agents: [],
  connected: false,
  
  // New state
  squads: defaultSquads,
  activeSquad: null,
  chatMessages: [],
  currentView: 'grid',
  workflowState: null,
  chatSidebarOpen: true,
  
  // Ralph state
  ralph: {
    status: 'idle',
    prd: null,
    currentIteration: 0,
    currentTask: null,
    progress: 0,
    learnings: []
  },
  
  // Project Context state
  projectContext: {},
  
  // SuperSkills state
  superskills: [],
  superskillStats: {
    total: 0,
    byCategory: {},
    totalTokenSavings: '0'
  },
  selectedSuperskill: null,
  superskillOutput: null,
  
  // Existing actions
  setTerminals: (terminals) => set({ terminals }),
  addTerminal: (terminal) => set((s) => ({ terminals: [...s.terminals, terminal] })),
  updateTerminal: (id, updates) => set((s) => ({
    terminals: s.terminals.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTerminal: (id) => set((s) => ({ terminals: s.terminals.filter(t => t.id !== id) })),
  setAgents: (agents) => set({ agents }),
  setConnected: (connected) => set({ connected }),
  
  // New actions
  setSquads: (squads) => set({ squads }),
  setActiveSquad: (id) => set({ activeSquad: id }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setView: (view) => set({ currentView: view }),
  setWorkflowState: (state) => set({ workflowState: state }),
  setChatSidebarOpen: (open) => set({ chatSidebarOpen: open }),
  setRalph: (state) => set((s) => ({ ralph: { ...s.ralph, ...state } })),
  setProjectContext: (ctx) => set({ projectContext: ctx }),
  
  // SuperSkills actions
  fetchSuperskills: async () => {
    try {
      const response = await fetch('/api/superskills');
      const superskills = await response.json();
      set({ superskills });
    } catch (error) {
      console.error('Failed to fetch superskills:', error);
    }
  },
  
  runSuperskill: async (name: string, input: any) => {
    try {
      const response = await fetch(`/api/superskills/${name}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const output = await response.json();
      set({ superskillOutput: output });
      return output;
    } catch (error) {
      console.error('Failed to run superskill:', error);
      throw error;
    }
  },
  
  setSuperskillStats: (stats) => set({ superskillStats: stats }),
  setSelectedSuperskill: (name) => set({ selectedSuperskill: name }),
  setSuperskillOutput: (output) => set({ superskillOutput: output }),
}))
import { create } from 'zustand'

export interface CheckItem { text: string; done: boolean }

export interface AgentState {
  status: 'idle' | 'working' | 'paused' | 'done' | 'error'
  currentTask: string | null
  checklist: CheckItem[]
  progress: number
  output?: string
  thinking?: string
  filesChanged?: { path: string; additions: number; deletions: number }[]
  activityHistory?: number[] // sparkline data (last 20 data points)
  /** Reference to the real Clawdbot session key for this agent */
  sessionKey: string | null
  /** Model currently in use by this agent */
  model: string | null
  /** Token usage tracking */
  tokens: { input: number; output: number; cost: number } | null
}

export interface AgentData {
  id: string
  state: AgentState
}

/** Bridge connection status to Clawdbot gateway */
export interface BridgeStatus {
  connected: boolean
  gatewayUrl: string
  latency: number
}

/** Pending consent action detail */
export interface PendingAction {
  id: string
  agentId: string
  type: string
  description: string
  timestamp: number
}

interface AgentStore {
  agents: Record<string, AgentState>
  pendingActions: number
  pendingActionDetails: PendingAction[]
  projectName: string
  totalTasks: number
  completedTasks: number
  bridge: BridgeStatus
  
  setAgents: (agents: Record<string, AgentState>) => void
  updateAgent: (id: string, state: Partial<AgentState>) => void
  setPendingActions: (n: number) => void
  addPendingActionDetail: (action: PendingAction) => void
  clearPendingActions: () => void
  setProjectInfo: (name: string, total: number, completed: number) => void
  setBridgeStatus: (status: Partial<BridgeStatus>) => void
}

const defaultAgentState: AgentState = {
  status: 'idle',
  currentTask: null,
  checklist: [],
  progress: 0,
  activityHistory: Array(20).fill(0),
  sessionKey: null,
  model: null,
  tokens: null,
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  pendingActions: 0,
  pendingActionDetails: [],
  projectName: 'AG Dev',
  totalTasks: 0,
  completedTasks: 0,
  bridge: {
    connected: false,
    gatewayUrl: '',
    latency: 0,
  },

  setAgents: (agents) => set({ agents }),
  
  updateAgent: (id, partial) => set((s) => ({
    agents: {
      ...s.agents,
      [id]: { ...(s.agents[id] || defaultAgentState), ...partial },
    },
  })),

  setPendingActions: (n) => set({ pendingActions: n }),

  addPendingActionDetail: (action) => set((s) => ({
    pendingActionDetails: [...s.pendingActionDetails, action],
    pendingActions: s.pendingActionDetails.length + 1,
  })),

  clearPendingActions: () => set({ pendingActions: 0, pendingActionDetails: [] }),
  
  setProjectInfo: (name, total, completed) => set({
    projectName: name,
    totalTasks: total,
    completedTasks: completed,
  }),

  setBridgeStatus: (status) => set((s) => ({
    bridge: { ...s.bridge, ...status },
  })),
}))

import { create } from 'zustand'

export type ViewId = 'cockpit' | 'agent' | 'pipeline' | 'emergence' | 'terminal' | 'gantt' | 'strategy'

interface UIStore {
  currentView: ViewId
  selectedAgentId: string | null
  commandPaletteOpen: boolean
  chatOpen: boolean
  chatAgentId: string | null
  sidebarCollapsed: boolean

  setView: (view: ViewId) => void
  selectAgent: (id: string | null) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleChat: () => void
  openChat: (agentId?: string) => void
  closeChat: () => void
  setChatAgent: (id: string) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'cockpit',
  selectedAgentId: null,
  commandPaletteOpen: false,
  chatOpen: false,
  chatAgentId: null,
  sidebarCollapsed: false,

  setView: (view) => set({ currentView: view }),
  
  selectAgent: (id) => set({ 
    selectedAgentId: id,
    currentView: id ? 'agent' : 'cockpit',
  }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openChat: (agentId) => set({ chatOpen: true, chatAgentId: agentId || null }),
  closeChat: () => set({ chatOpen: false }),
  setChatAgent: (id) => set({ chatAgentId: id }),
  
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

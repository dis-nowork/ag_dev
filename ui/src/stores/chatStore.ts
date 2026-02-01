import { create } from 'zustand'

export interface ChatMessage {
  id: string
  from: 'human' | 'agent' | 'system'
  agentId?: string
  text: string
  timestamp: number
}

interface ChatStore {
  messages: ChatMessage[]
  isLoading: boolean

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (v: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    }],
  })),

  setLoading: (v) => set({ isLoading: v }),
  clearMessages: () => set({ messages: [] }),
}))

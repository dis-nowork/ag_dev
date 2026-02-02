import { useState, useRef, useEffect } from 'react'
import { Send, Minimize2, MessageSquare } from 'lucide-react'
import { useStore, ChatMessage } from '../store'

export function OrchestratorChat() {
  const { chatMessages, addChatMessage, chatSidebarOpen, setChatSidebarOpen } = useStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Focus input when sidebar opens
  useEffect(() => {
    if (chatSidebarOpen) {
      inputRef.current?.focus()
    }
  }, [chatSidebarOpen])

  // Add welcome message on first load
  useEffect(() => {
    if (chatMessages.length === 0) {
      addChatMessage({
        id: 'welcome',
        role: 'system',
        text: `Welcome! I'm your orchestrator. I can help you manage agents and workflows. Try these commands:

• "status" - Check current agents
• "start fullstack" - Deploy full stack squad
• "spawn dev" - Create a developer agent
• "list squads" - Show available squads`,
        timestamp: Date.now()
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      role: 'user',
      text: input.trim(),
      timestamp: Date.now()
    }

    addChatMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text })
      })

      const data = await response.json()
      
      const systemMessage: ChatMessage = {
        id: Date.now() + '-system',
        role: 'system',
        text: data.response || 'I received your message, but I\'m not quite sure how to respond to that yet.',
        timestamp: Date.now()
      }

      addChatMessage(systemMessage)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: Date.now() + '-error',
        role: 'system',
        text: 'Sorry, I couldn\'t process that request. Please try again.',
        timestamp: Date.now()
      }
      addChatMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!chatSidebarOpen) {
    return (
      <button
        onClick={() => setChatSidebarOpen(true)}
        className="fixed top-4 right-4 p-3 bg-accent-primary text-bg-primary rounded-full shadow-lg hover:brightness-110 transition-all z-10"
        title="Open Orchestrator Chat"
      >
        <MessageSquare size={20} />
      </button>
    )
  }

  return (
    <div className="w-80 glass-card border-l-0 flex flex-col h-full relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-bold text-text-primary">Orchestrator</h3>
        </div>
        <button
          onClick={() => setChatSidebarOpen(false)}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
          title="Minimize chat"
        >
          <Minimize2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'system' && (
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm">🤖</span>
              </div>
            )}
            
            <div className={`max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-accent-primary text-bg-primary ml-auto'
                    : 'bg-bg-card text-text-primary'
                }`}
              >
                {message.text}
              </div>
              <div className="text-xs text-text-muted mt-1 px-1">
                {formatTime(message.timestamp)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center shrink-0">
                <span className="text-sm">👤</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm">🤖</span>
            </div>
            <div className="bg-bg-card px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-text-muted rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-bg-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-bg-primary border border-bg-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-accent-primary text-bg-primary rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
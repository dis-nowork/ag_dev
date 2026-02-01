import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, ChevronDown } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useChatStore } from '../stores/chatStore'
import { AGENTS, colors } from '../lib/theme'

export function ChatFloat() {
  const { chatOpen, closeChat, chatAgentId, setChatAgent } = useUIStore()
  const { messages, addMessage, isLoading, setLoading } = useChatStore()
  const [input, setInput] = useState('')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [chatOpen])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    addMessage({ from: 'human', text })
    setLoading(true)

    try {
      const res = await fetch('/api/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentId: chatAgentId || undefined,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        addMessage({ from: 'agent', agentId: chatAgentId || undefined, text: data.reply })
      } else if (data.queued) {
        // Message was queued — response will come via SSE stream
        // The "thinking..." indicator is already shown via isLoading
      }
    } catch {
      addMessage({ from: 'system', text: '❌ Failed to send message' })
    } finally {
      setLoading(false)
    }
  }

  const currentAgent = AGENTS.find(a => a.id === chatAgentId)

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          className="fixed bottom-4 right-4 z-40 flex flex-col rounded-xl border shadow-2xl overflow-hidden"
          style={{
            width: 380,
            height: 480,
            backgroundColor: colors.bg.surface,
            borderColor: colors.bg.border,
          }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: colors.bg.border }}
          >
            <button
              onClick={() => setShowAgentPicker(!showAgentPicker)}
              className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: colors.text.primary }}
            >
              <span>{currentAgent?.icon || '💬'}</span>
              <span>{currentAgent?.name || 'Main Chat'}</span>
              <ChevronDown size={14} style={{ color: colors.text.secondary }} />
            </button>
            <button onClick={closeChat} className="p-1 rounded hover:bg-white/5 transition-colors">
              <X size={16} style={{ color: colors.text.secondary }} />
            </button>
          </div>

          {/* Agent picker dropdown */}
          <AnimatePresence>
            {showAgentPicker && (
              <motion.div
                className="absolute top-12 left-2 right-2 z-50 rounded-lg border overflow-hidden shadow-xl"
                style={{ backgroundColor: colors.bg.surfaceHover, borderColor: colors.bg.border }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                <button
                  onClick={() => { setChatAgent(''); setShowAgentPicker(false) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                  style={{ color: colors.text.primary }}
                >
                  💬 Main Chat
                </button>
                {AGENTS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setChatAgent(a.id); setShowAgentPicker(false) }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                    style={{ color: colors.text.primary }}
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: colors.text.muted }}>
                {currentAgent
                  ? `Chat with ${currentAgent.name}. Ask questions or give commands.`
                  : 'Send a message to the command center.'}
              </p>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'human' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: msg.from === 'human'
                      ? colors.accent + '20'
                      : msg.from === 'system'
                      ? colors.status.error + '15'
                      : colors.bg.surfaceHover,
                    color: colors.text.primary,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: colors.bg.surfaceHover }}>
                  <motion.span
                    className="inline-block"
                    style={{ color: colors.text.secondary }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    thinking...
                  </motion.span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3" style={{ borderColor: colors.bg.border }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Type a message..."
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.bg.border,
                  color: colors.text.primary,
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="rounded-lg p-2 transition-colors disabled:opacity-30"
                style={{ backgroundColor: colors.accent, color: '#fff' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

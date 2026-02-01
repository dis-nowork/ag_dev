import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command } from 'cmdk'
import { useUIStore } from '../stores/uiStore'
import { useAgentStore } from '../stores/agentStore'
import { colors } from '../lib/theme'

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, setView, selectAgent, openChat } = useUIStore()
  const { agents, agentMetas } = useAgentStore()
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  const runAction = (fn: () => void) => {
    fn()
    closeCommandPalette()
  }

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCommandPalette}
          />
          
          {/* Palette */}
          <motion.div
            className="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="rounded-xl border overflow-hidden shadow-2xl"
              style={{
                backgroundColor: colors.bg.surface,
                borderColor: colors.bg.border,
              }}
              loop
            >
              <Command.Input
                ref={inputRef}
                value={search}
                onValueChange={setSearch}
                placeholder="Search agents, views, actions..."
                className="w-full border-b px-4 py-3 text-sm outline-none"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: colors.bg.border,
                  color: colors.text.primary,
                }}
                onKeyDown={(e) => { if (e.key === 'Escape') closeCommandPalette() }}
              />
              <Command.List className="max-h-72 overflow-y-auto p-2" style={{ color: colors.text.primary }}>
                <Command.Empty className="py-6 text-center text-sm" style={{ color: colors.text.secondary }}>
                  No results found.
                </Command.Empty>

                <Command.Group heading="Views" className="mb-2">
                  <PaletteItem label="🎛️ Cockpit" shortcut="1" onSelect={() => runAction(() => setView('cockpit'))} />
                  <PaletteItem label="📋 Pipeline" shortcut="2" onSelect={() => runAction(() => setView('pipeline'))} />
                  <PaletteItem label="📊 Gantt Timeline" shortcut="3" onSelect={() => runAction(() => setView('gantt'))} />
                  <PaletteItem label="🌐 Emergence Map" shortcut="4" onSelect={() => runAction(() => setView('emergence'))} />
                  <PaletteItem label="🎯 Strategy Canvas" shortcut="5" onSelect={() => runAction(() => setView('strategy'))} />
                  <PaletteItem label="💻 Terminal" shortcut="6" onSelect={() => runAction(() => setView('terminal'))} />
                </Command.Group>

                <Command.Group heading="Agents" className="mb-2">
                  {agentMetas.map(a => {
                    const st = agents[a.id]
                    return (
                      <PaletteItem
                        key={a.id}
                        label={`${a.icon} ${a.name}`}
                        hint={st?.status || 'idle'}
                        onSelect={() => runAction(() => selectAgent(a.id))}
                      />
                    )
                  })}
                </Command.Group>

                <Command.Group heading="Actions" className="mb-2">
                  <PaletteItem label="💬 Open Chat" shortcut="⌘J" onSelect={() => runAction(() => openChat())} />
                  <PaletteItem label="⏸ Pause All Agents" onSelect={() => runAction(() => fetch('/api/agents/pause-all', { method: 'POST' }))} />
                  <PaletteItem label="▶️ Resume All Agents" onSelect={() => runAction(() => fetch('/api/agents/resume-all', { method: 'POST' }))} />
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function PaletteItem({ label, hint, shortcut, onSelect }: {
  label: string; hint?: string; shortcut?: string; onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors"
      style={{ color: colors.text.primary }}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {hint && <span className="text-xs" style={{ color: colors.text.muted }}>{hint}</span>}
        {shortcut && (
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{ backgroundColor: colors.bg.surfaceHover, borderColor: colors.bg.border, color: colors.text.secondary }}>
            {shortcut}
          </kbd>
        )}
      </span>
    </Command.Item>
  )
}

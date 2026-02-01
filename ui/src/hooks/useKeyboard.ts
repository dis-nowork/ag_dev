import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

export function useKeyboard() {
  const { openCommandPalette, toggleChat, setView, currentView, selectedAgentId, selectAgent } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ⌘K — Command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        openCommandPalette()
        return
      }

      // ⌘J — Toggle chat
      if (meta && e.key === 'j') {
        e.preventDefault()
        toggleChat()
        return
      }

      // Don't process single-key shortcuts when in an input
      if (isInput) return

      // Number keys for views — matches NAV_ITEMS order
      if (e.key === '1') { setView('cockpit'); return }
      if (e.key === '2') { setView('pipeline'); return }
      if (e.key === '3') { setView('gantt'); return }
      if (e.key === '4') { setView('emergence'); return }
      if (e.key === '5') { setView('strategy'); return }
      if (e.key === '6') { setView('terminal'); return }
      if (e.key === '7') { setView('diagrams'); return }
      if (e.key === '8') { setView('logs'); return }
      if (e.key === '9') { setView('docs'); return }

      // Escape — back to cockpit
      if (e.key === 'Escape') {
        if (currentView !== 'cockpit') {
          selectAgent(null)
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentView, selectedAgentId])
}

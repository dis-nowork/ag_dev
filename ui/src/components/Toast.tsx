import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, type ToastType } from '../stores/toastStore'
import { colors } from '../lib/theme'

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; color: string; bg: string }> = {
  success: {
    icon: <CheckCircle size={16} />,
    color: colors.status.complete,
    bg: colors.status.complete + '15',
  },
  error: {
    icon: <AlertCircle size={16} />,
    color: colors.status.error,
    bg: colors.status.error + '15',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    color: colors.status.blocked,
    bg: colors.status.blocked + '15',
  },
  info: {
    icon: <Info size={16} />,
    color: colors.accent,
    bg: colors.accent + '15',
  },
}

export const ToastContainer = memo(function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = TOAST_CONFIG[toast.type]
          return (
            <motion.div
              key={toast.id}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto"
              style={{
                backgroundColor: colors.bg.surface,
                borderColor: config.color + '40',
              }}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <span style={{ color: config.color }}>{config.icon}</span>
              <span className="text-sm flex-1" style={{ color: colors.text.primary }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: colors.text.muted }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
})

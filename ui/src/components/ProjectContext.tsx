import { useState, useEffect, useRef } from 'react'
import { FileText, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { useStore } from '../store'

interface FileCardProps {
  filename: string
  content: string
  isReadOnly?: boolean
  onSave?: (content: string) => void
}

function FileCard({ filename, content, isReadOnly = false, onSave }: FileCardProps) {
  const [editedContent, setEditedContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditedContent(content)
  }, [content])

  // Auto-scroll for read-only files (like PROGRESS.md)
  useEffect(() => {
    if (isReadOnly && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [content, isReadOnly])

  const handleSave = async () => {
    if (!onSave || isReadOnly) return

    setSaving(true)
    try {
      await onSave(editedContent)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = editedContent !== content && !isReadOnly

  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-accent-primary" />
          <span className="font-medium text-text-primary">{filename}</span>
          {isReadOnly && (
            <span className="text-xs px-2 py-1 bg-bg-primary text-text-muted rounded">
              read-only
            </span>
          )}
        </div>
        
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : hasChanges
                ? 'bg-accent-primary text-bg-primary hover:brightness-110'
                : 'bg-bg-primary text-text-muted border border-bg-border cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle size={14} />
                💾 Saved
              </>
            ) : (
              <>
                <Save size={14} />
                💾 Save
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => !isReadOnly && setEditedContent(e.target.value)}
          readOnly={isReadOnly}
          className={`w-full h-48 bg-black text-green-400 font-mono text-sm p-3 rounded-lg border border-bg-border resize-none focus:outline-none ${
            isReadOnly 
              ? 'cursor-not-allowed' 
              : 'focus:ring-2 focus:ring-accent-primary'
          }`}
          placeholder={isReadOnly ? 'Auto-updated by agents...' : `Enter ${filename} content...`}
        />
      </div>
    </div>
  )
}

export function ProjectContext() {
  const { projectContext, setProjectContext } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load project context on mount
  useEffect(() => {
    loadProjectContext()
  }, [])

  const loadProjectContext = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/context')
      if (response.ok) {
        const data = await response.json()
        setProjectContext(data.files || {})
      } else {
        setError('Failed to load project context')
      }
    } catch (e) {
      console.error('Failed to load context:', e)
      setError('Failed to load project context')
    } finally {
      setLoading(false)
    }
  }

  const saveFile = async (filename: string, content: string) => {
    try {
      const response = await fetch(`/api/context/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        // Update local state
        setProjectContext({
          ...projectContext,
          [filename]: content
        })
      } else {
        throw new Error('Failed to save file')
      }
    } catch (e) {
      console.error('Failed to save file:', e)
      throw e
    }
  }

  // Define file order and properties
  const files = [
    { name: 'GOALS.md', readOnly: false },
    { name: 'STACK.md', readOnly: false },
    { name: 'PROGRESS.md', readOnly: true },
    { name: 'CONSTRAINTS.md', readOnly: false }
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
            Loading project context...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
          <button
            onClick={loadProjectContext}
            className="mt-2 px-3 py-1.5 bg-accent-primary text-bg-primary text-sm font-medium rounded-lg hover:brightness-110 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-accent-primary" size={20} />
          <h1 className="text-xl font-bold text-text-primary">📋 Project Context</h1>
        </div>
        <p className="text-text-secondary text-sm">
          These files are shared with all agents and define the project scope, stack, and constraints.
        </p>
      </div>

      <div className="space-y-6">
        {files.map((file) => (
          <FileCard
            key={file.name}
            filename={file.name}
            content={projectContext[file.name] || ''}
            isReadOnly={file.readOnly}
            onSave={file.readOnly ? undefined : (content) => saveFile(file.name, content)}
          />
        ))}

        {/* Show additional files that might exist */}
        {Object.keys(projectContext)
          .filter(filename => !files.some(f => f.name === filename))
          .map((filename) => (
            <FileCard
              key={filename}
              filename={filename}
              content={projectContext[filename]}
              onSave={(content) => saveFile(filename, content)}
            />
          ))}
      </div>
    </div>
  )
}
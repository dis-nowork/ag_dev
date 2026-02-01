import { memo, useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { ChevronRight, ChevronDown, File, Folder, Save, RefreshCw } from 'lucide-react'
import { colors } from '../lib/theme'

interface DocFile {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: DocFile[]
}

interface DocGroup {
  category: string
  files: DocFile[]
}

export const DocsView = memo(function DocsView() {
  const [groups, setGroups] = useState<DocGroup[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/docs')
      if (!res.ok) throw new Error('Failed to fetch docs')
      const data = await res.json()
      if (data.groups) {
        setGroups(data.groups)
      } else if (data.files || Array.isArray(data)) {
        const files = data.files || data
        const grouped = new Map<string, DocFile[]>()
        for (const f of files) {
          const cat = f.path?.includes('/') ? f.path.split('/')[0] : 'root'
          if (!grouped.has(cat)) grouped.set(cat, [])
          grouped.get(cat)!.push(f)
        }
        setGroups(Array.from(grouped.entries()).map(([category, files]) => ({ category, files })))
      }
    } catch {
      setGroups([{ category: 'docs', files: [{ name: 'README.md', path: 'docs/README.md', type: 'file' }] }])
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openFile = useCallback(async (path: string) => {
    setLoading(true)
    setSelectedFile(path)
    try {
      const res = await fetch(`/api/docs/file?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to load file')
      const data = await res.json()
      setFileContent(data.content || '')
      setOriginalContent(data.content || '')
    } catch {
      setFileContent(`// Could not load ${path}`)
      setOriginalContent('')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveFile = useCallback(async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent }),
      })
      setOriginalContent(fileContent)
    } catch {
      // save failed silently
    } finally {
      setSaving(false)
    }
  }, [selectedFile, fileContent])

  const toggleGroup = (cat: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const hasChanges = fileContent !== originalContent
  const language = selectedFile?.endsWith('.yaml') || selectedFile?.endsWith('.yml')
    ? 'yaml'
    : selectedFile?.endsWith('.json')
    ? 'json'
    : selectedFile?.endsWith('.ts') || selectedFile?.endsWith('.tsx')
    ? 'typescript'
    : selectedFile?.endsWith('.js') || selectedFile?.endsWith('.jsx')
    ? 'javascript'
    : 'markdown'

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar: file tree */}
      <aside
        className="w-64 flex-shrink-0 border-r flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: colors.bg.border }}>
          <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>📄 Documents</span>
          <button
            onClick={fetchDocs}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} style={{ color: colors.text.secondary }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {groups.map(group => (
            <div key={group.category}>
              <button
                onClick={() => toggleGroup(group.category)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium hover:bg-white/5 transition-colors"
                style={{ color: colors.text.secondary }}
              >
                {collapsedGroups.has(group.category)
                  ? <ChevronRight size={12} />
                  : <ChevronDown size={12} />
                }
                <Folder size={12} style={{ color: colors.accent }} />
                {group.category}
                <span className="ml-auto text-[9px]" style={{ color: colors.text.muted }}>
                  {group.files.length}
                </span>
              </button>
              {!collapsedGroups.has(group.category) && (
                <div>
                  {group.files.map(file => (
                    <FileNode key={file.path} file={file} selectedFile={selectedFile} onSelect={openFile} depth={1} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-[10px] text-center py-8" style={{ color: colors.text.muted }}>
              No documents found
            </p>
          )}
        </div>
      </aside>

      {/* Editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ backgroundColor: colors.bg.surface, borderColor: colors.bg.border }}
        >
          <div className="flex items-center gap-2">
            {selectedFile ? (
              <span className="text-xs font-mono" style={{ color: colors.text.primary }}>
                {selectedFile}
              </span>
            ) : (
              <span className="text-xs" style={{ color: colors.text.muted }}>
                Select a file to edit
              </span>
            )}
            {hasChanges && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: colors.status.blocked + '20', color: colors.status.blocked }}>
                Modified
              </span>
            )}
          </div>
          {selectedFile && (
            <button
              onClick={saveFile}
              disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all disabled:opacity-40"
              style={{
                backgroundColor: hasChanges ? colors.accent : colors.bg.surfaceHover,
                color: hasChanges ? '#fff' : colors.text.secondary,
              }}
            >
              <Save size={12} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        {/* Monaco editor */}
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs animate-pulse" style={{ color: colors.text.muted }}>Loading...</span>
              </div>
            ) : (
              <Editor
                height="100%"
                language={language}
                value={fileContent}
                onChange={(v) => setFileContent(v || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'gutter',
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <File size={40} style={{ color: colors.text.muted }} />
              <p className="text-sm" style={{ color: colors.text.muted }}>
                Select a document from the sidebar
              </p>
              <p className="text-[11px]" style={{ color: colors.text.muted }}>
                Supports Markdown, YAML, JSON, and code files
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

/** Recursive file tree node */
function FileNode({
  file,
  selectedFile,
  onSelect,
  depth,
}: {
  file: DocFile
  selectedFile: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = selectedFile === file.path
  const paddingLeft = 12 + depth * 16

  if (file.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1 text-[11px] hover:bg-white/5 transition-colors"
          style={{ paddingLeft, color: colors.text.secondary }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <Folder size={11} style={{ color: colors.accent }} />
          {file.name}
        </button>
        {expanded && file.children && (
          <div>
            {file.children.map(child => (
              <FileNode key={child.path} file={child} selectedFile={selectedFile} onSelect={onSelect} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(file.path)}
      className="w-full flex items-center gap-1.5 py-1 text-[11px] hover:bg-white/5 transition-colors"
      style={{
        paddingLeft,
        color: isSelected ? colors.text.primary : colors.text.secondary,
        backgroundColor: isSelected ? colors.bg.surfaceActive : 'transparent',
      }}
    >
      <File size={11} style={{ color: isSelected ? colors.accent : colors.text.muted }} />
      {file.name}
    </button>
  )
}

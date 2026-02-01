// AG Dev Design Tokens — Based on DESIGN-SPEC.md

export const colors = {
  bg: {
    primary: '#0A0A0B',
    surface: '#141416',
    surfaceHover: '#1C1C1F',
    surfaceActive: '#222226',
    border: '#2A2A2E',
    borderLight: '#35353A',
  },
  text: {
    primary: '#EDEDEF',
    secondary: '#8B8B8E',
    muted: '#5A5A5D',
    inverse: '#0A0A0B',
  },
  squads: {
    builders: { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.1)', glow: 'rgba(59,130,246,0.3)' },
    thinkers: { main: '#A855F7', light: '#C084FC', bg: 'rgba(168,85,247,0.1)', glow: 'rgba(168,85,247,0.3)' },
    guardians: { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.1)', glow: 'rgba(239,68,68,0.3)' },
    creators: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.1)', glow: 'rgba(16,185,129,0.3)' },
  },
  status: {
    idle: '#6B7280',
    working: '#10B981',
    blocked: '#EAB308',
    error: '#EF4444',
    complete: '#10B981',
    paused: '#F59E0B',
  },
  accent: '#3B82F6',
} as const

export const motion = {
  fast: { duration: 0.1 },
  normal: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  slow: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  pulse: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
} as const

// Squad assignments for agents
export type SquadId = string

export interface SquadColorSet {
  main: string
  light: string
  bg: string
  glow: string
}

export interface SquadDef {
  label: string
  icon: string
  agents: string[]
}

export interface AgentMeta {
  id: string
  name: string
  shortName: string
  icon: string
  squad: SquadId
  role: string
}

// ── Dynamic color palette for unknown squads ──
const SQUAD_COLOR_PALETTE: Array<{ main: string; light: string }> = [
  { main: '#3B82F6', light: '#60A5FA' },  // blue
  { main: '#A855F7', light: '#C084FC' },  // purple
  { main: '#EF4444', light: '#F87171' },  // red
  { main: '#10B981', light: '#34D399' },  // green
  { main: '#F59E0B', light: '#FBBF24' },  // amber
  { main: '#EC4899', light: '#F472B6' },  // pink
  { main: '#06B6D4', light: '#22D3EE' },  // cyan
  { main: '#8B5CF6', light: '#A78BFA' },  // violet
]

// Known squad colors (keep existing assignments stable)
const KNOWN_SQUAD_COLORS: Record<string, SquadColorSet> = {
  builders: colors.squads.builders,
  thinkers: colors.squads.thinkers,
  guardians: colors.squads.guardians,
  creators: colors.squads.creators,
}

// Cache for dynamically assigned squad colors
const dynamicSquadColorCache: Record<string, SquadColorSet> = {}
let nextPaletteIndex = 0

function makeSquadColorSet(c: { main: string; light: string }): SquadColorSet {
  return {
    main: c.main,
    light: c.light,
    bg: `${c.main}1A`,   // ~10% opacity
    glow: `${c.main}4D`, // ~30% opacity
  }
}

export function getSquadColorDynamic(squadId: string): SquadColorSet {
  // Known squad — return existing color
  if (KNOWN_SQUAD_COLORS[squadId]) return KNOWN_SQUAD_COLORS[squadId]
  // Already assigned
  if (dynamicSquadColorCache[squadId]) return dynamicSquadColorCache[squadId]
  // Assign from palette (cycle)
  const palette = SQUAD_COLOR_PALETTE[nextPaletteIndex % SQUAD_COLOR_PALETTE.length]
  nextPaletteIndex++
  const cs = makeSquadColorSet(palette)
  dynamicSquadColorCache[squadId] = cs
  return cs
}

export function getAgentMetaDynamic(id: string, metas: AgentMeta[]): AgentMeta | undefined {
  return metas.find(a => a.id === id)
}

// ── Default / fallback data ──

export const DEFAULT_SQUADS: Record<string, SquadDef> = {
  builders: { label: 'Builders', icon: '🏗️', agents: ['dev', 'devops', 'data-engineer', 'architect'] },
  thinkers: { label: 'Thinkers', icon: '🧠', agents: ['analyst', 'pm', 'po'] },
  guardians: { label: 'Guardians', icon: '🛡️', agents: ['qa', 'sm', 'aios-master'] },
  creators: { label: 'Creators', icon: '🎨', agents: ['ux-design-expert', 'squad-creator'] },
}

export const DEFAULT_AGENTS: AgentMeta[] = [
  // Builders
  { id: 'dev', name: 'Developer', shortName: 'DEV', icon: '⚡', squad: 'builders', role: 'Fullstack development' },
  { id: 'devops', name: 'DevOps', shortName: 'OPS', icon: '🔧', squad: 'builders', role: 'Infrastructure & CI/CD' },
  { id: 'data-engineer', name: 'Data Engineer', shortName: 'DAT', icon: '📊', squad: 'builders', role: 'Data pipelines & storage' },
  { id: 'architect', name: 'Architect', shortName: 'ARC', icon: '🏛️', squad: 'builders', role: 'System design & architecture' },
  // Thinkers
  { id: 'analyst', name: 'Analyst', shortName: 'ANL', icon: '🔍', squad: 'thinkers', role: 'Research & analysis' },
  { id: 'pm', name: 'Product Manager', shortName: 'PM', icon: '📋', squad: 'thinkers', role: 'Product definition & PRD' },
  { id: 'po', name: 'Product Owner', shortName: 'PO', icon: '✅', squad: 'thinkers', role: 'Validation & acceptance' },
  // Guardians
  { id: 'qa', name: 'QA Engineer', shortName: 'QA', icon: '🧪', squad: 'guardians', role: 'Testing & quality' },
  { id: 'sm', name: 'Scrum Master', shortName: 'SM', icon: '📌', squad: 'guardians', role: 'Sprint management' },
  { id: 'aios-master', name: 'AIOS Master', shortName: 'AIO', icon: '🤖', squad: 'guardians', role: 'System orchestration' },
  // Creators
  { id: 'ux-design-expert', name: 'UX Designer', shortName: 'UX', icon: '🎨', squad: 'creators', role: 'User experience & design' },
  { id: 'squad-creator', name: 'Squad Creator', shortName: 'SQD', icon: '👥', squad: 'creators', role: 'Team formation & squads' },
]

// ── Legacy exports (aliases for backward compat) ──

export const SQUADS = DEFAULT_SQUADS
export const AGENTS = DEFAULT_AGENTS

export function getAgentMeta(id: string): AgentMeta | undefined {
  return DEFAULT_AGENTS.find(a => a.id === id)
}

export function getSquadColor(squad: string): SquadColorSet {
  return getSquadColorDynamic(squad)
}

export function getAgentSquad(agentId: string): SquadId {
  return DEFAULT_AGENTS.find(a => a.id === agentId)?.squad || 'builders'
}

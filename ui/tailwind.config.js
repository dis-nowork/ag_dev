export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0B',
          surface: '#141416',
          surfaceHover: '#1C1C1F',
          surfaceActive: '#222226',
          border: '#2A2A2E',
          borderLight: '#35353A',
          terminal: '#000000',
        },
        text: {
          primary: '#EDEDEF',
          secondary: '#8B8B8E',
          muted: '#5A5A5D',
          inverse: '#0A0A0B',
        },
        squads: {
          builders: '#3B82F6',
          thinkers: '#A855F7',
          guardians: '#EF4444',
          creators: '#10B981',
        },
        status: {
          idle: '#6B7280',
          working: '#10B981',
          blocked: '#EAB308',
          error: '#EF4444',
          complete: '#10B981',
          paused: '#F59E0B',
        },
        accent: {
          primary: '#3B82F6',
          secondary: '#A855F7',
          success: '#10B981',
          warning: '#EAB308',
          error: '#EF4444',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      }
    }
  },
  plugins: []
}
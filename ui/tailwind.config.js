export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#08080A',
          surface: '#141416',
          surfaceHover: '#1C1C1F',
          surfaceActive: '#222226',
          border: '#2A2A2E',
          borderLight: '#35353A',
          terminal: '#000000',
          card: 'rgba(20,20,24,0.7)',
          cardHover: 'rgba(28,28,35,0.8)',
          glow: 'rgba(139,92,246,0.15)',
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
          primary: '#F97316',
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
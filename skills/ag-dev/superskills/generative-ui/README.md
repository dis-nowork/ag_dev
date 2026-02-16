# SuperSkill: Generative UI (Tambo AI)

## Overview
Build agent-driven interfaces where AI selects and renders React components based on user intent. Powered by Tambo AI SDK.

## When to Use
- Dashboards that adapt to what the user asks
- Chat interfaces with rich component rendering
- Data visualization driven by natural language
- Any frontend where user intent → dynamic component selection

## Stack
- `@tambo-ai/react` — React SDK with hooks and providers
- `zod` — Schema definitions for component props
- BYOK: OpenAI, Anthropic, Gemini, Mistral

## How It Works
1. **Register** React components with Zod schemas describing their props
2. **Connect** to Tambo (cloud or self-hosted)
3. **User speaks** → Agent picks the right component → Props stream in real-time
4. **Component renders** with live data

## Key Concepts
- **Component Registration**: Each component gets a name, description, and Zod schema
- **Agent Selection**: LLM chooses which component to render based on user intent
- **Streaming Props**: Props arrive incrementally as the LLM generates them
- **State Management**: Tambo handles conversation state and component lifecycle

## Integration with AG Dev
- **Primary Agent**: UX (Uma) — designs and implements generative UI components
- **Supporting Agents**: Dev (builds), Architect (designs system), QA (tests interactions)
- **Workflow**: Any greenfield-ui or fullstack workflow can leverage Tambo for frontend

## Setup
```bash
npm install @tambo-ai/react zod
```

Get API key at https://tambo.co or self-host via Docker.

## Resources
- Docs: https://docs.tambo.co
- GitHub: https://github.com/tambo-ai/tambo
- Component Library: https://ui.tambo.co
- Templates: https://github.com/tambo-ai/tambo-template

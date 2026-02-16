# Greenfield UI/Frontend Workflow

Build a new frontend application or UI from scratch.

## Agent Sequence & Handoffs

1. **analyst** → UI Requirements Analysis
   - Analyze user requirements, target audience, use cases
   - Define user journeys and interaction patterns
   - Output: `.agdev/handoff/ui-brief.md`

2. **ux** → UX Design & Wireframes
   - Create user experience design, wireframes, component architecture
   - Define design system, accessibility requirements
   - Input: `ui-brief.md`
   - Output: `.agdev/handoff/ux-design.md`

3. **architect** → Frontend Architecture
   - Choose tech stack, state management, routing strategy
   - Define component hierarchy, build process, deployment
   - Input: `ux-design.md`
   - Output: `.agdev/handoff/frontend-architecture.md`

4. **po** → Component Stories
   - Break UX design into implementable component stories
   - Create acceptance criteria for each component/page
   - Input: `ux-design.md`, `frontend-architecture.md`
   - Output: `.agdev/handoff/ui-stories/`

## Development Cycle (Repeat per Component)

5. **dev** → Component Implementation
   - Build React/Vue components, styling, interactions
   - Implement responsive design and accessibility features
   - Input: Current component story
   - Output: Code changes + `.agdev/handoff/dev-output.md`

6. **ux** → UX Review
   - Review component implementation for design consistency
   - Check accessibility, responsive behavior, user experience
   - Verdict: APPROVE/REJECT with design feedback
   - Input: `dev-output.md` + component code
   - Output: `.agdev/handoff/ux-review.md`

7. **qa** → Quality Review
   - Cross-browser testing, performance testing, functionality
   - Input: `dev-output.md` + component code
   - Output: `.agdev/handoff/qa-review.md`

8. **dev** → Fix Issues (if needed)
   - Address UX and QA feedback
   - Input: `ux-review.md`, `qa-review.md`
   - Repeat until approved

## Final Steps

9. **devops** → Frontend Deployment
   - Setup build process, CDN, caching strategy
   - Configure staging and production deployments
   - Input: Approved frontend code
   - Output: Live frontend application
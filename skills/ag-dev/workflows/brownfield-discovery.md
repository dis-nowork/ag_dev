# Brownfield Discovery Workflow

Audit and analyze an existing codebase to understand its structure, quality, and improvement opportunities.

## Agent Sequence & Handoffs

1. **analyst** → Initial Assessment
   - High-level codebase scanning, technology audit
   - Identify main components, dependencies, architecture patterns
   - Output: `.agdev/handoff/initial-assessment.md`

2. **architect** → Architecture Review (Parallel)
   - Deep dive into system architecture, design patterns
   - Identify architectural debt, scaling bottlenecks
   - Input: `initial-assessment.md`
   - Output: `.agdev/handoff/architecture-review.md`

3. **dev** → Code Quality Analysis (Parallel)
   - Code quality metrics, test coverage, technical debt
   - Identify code smells, security vulnerabilities
   - Input: `initial-assessment.md`
   - Output: `.agdev/handoff/code-quality-analysis.md`

4. **qa** → Testing Assessment (Parallel)
   - Analyze existing test suite, coverage gaps
   - Identify testing strategies, automation opportunities
   - Input: `initial-assessment.md`
   - Output: `.agdev/handoff/testing-assessment.md`

5. **devops** → Infrastructure Review (Parallel)
   - Review deployment processes, CI/CD, monitoring
   - Identify infrastructure improvements, security concerns
   - Input: `initial-assessment.md`
   - Output: `.agdev/handoff/infrastructure-review.md`

## Consolidation Phase

6. **analyst** → Discovery Report
   - Consolidate all parallel assessments into comprehensive report
   - Prioritize recommendations, estimate effort/impact
   - Input: All review documents
   - Output: `.agdev/handoff/discovery-report.md`

7. **pm** → Improvement Roadmap
   - Create actionable roadmap from discovery findings
   - Prioritize improvements, define milestones
   - Input: `discovery-report.md`
   - Output: `.agdev/handoff/improvement-roadmap.md`

8. **po** → Story Creation
   - Convert roadmap items into implementable stories
   - Define acceptance criteria for each improvement
   - Input: `improvement-roadmap.md`
   - Output: `.agdev/handoff/improvement-stories/`

## Output

- Comprehensive codebase audit
- Prioritized improvement roadmap
- Ready-to-implement improvement stories
- Risk assessment and mitigation strategies
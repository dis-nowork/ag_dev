# Brownfield Full-Stack Workflow

Add features or make changes to an existing full-stack application.

## Agent Sequence & Handoffs

1. **analyst** → Codebase Analysis
   - Analyze existing codebase structure, dependencies, architecture
   - Understand current features, identify technical debt
   - Output: `.agdev/handoff/codebase-analysis.md`

2. **architect** → Impact Assessment
   - Assess how new requirements fit with existing architecture
   - Identify refactoring needs, breaking changes, migration paths
   - Input: `codebase-analysis.md` + new requirements
   - Output: `.agdev/handoff/impact-assessment.md`

3. **pm** → Feature Planning
   - Plan feature implementation within existing constraints
   - Define backward compatibility, rollback strategy
   - Input: `impact-assessment.md`
   - Output: `.agdev/handoff/feature-plan.md`

4. **po** → Story Refinement
   - Break feature plan into implementable stories
   - Consider existing workflows, user patterns
   - Input: `feature-plan.md`
   - Output: `.agdev/handoff/brownfield-stories/`

## Development Cycle (Repeat per Story)

5. **dev** → Feature Implementation
   - Implement new feature within existing codebase patterns
   - Update existing tests, add new tests, maintain consistency
   - Input: Current story file + existing codebase
   - Output: Code changes + `.agdev/handoff/dev-output.md`

6. **qa** → Regression Testing
   - Test new feature + regression testing on existing features
   - Check backwards compatibility, performance impact
   - Verdict: APPROVE/REJECT with issues list
   - Input: `dev-output.md` + code changes
   - Output: `.agdev/handoff/qa-review.md`

7. **dev** → Issue Resolution (if needed)
   - Fix issues maintaining existing functionality
   - Input: `qa-review.md`
   - Repeat until approved

## Final Steps

8. **devops** → Safe Deployment
   - Deploy with rollback strategy, feature flags if needed
   - Monitor performance impact, user adoption
   - Input: Approved feature code
   - Output: Feature deployed to production
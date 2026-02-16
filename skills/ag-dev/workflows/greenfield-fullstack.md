# Greenfield Full-Stack Application Workflow

Build a full-stack app from concept to development.

## Agent Sequence & Handoffs

1. **devops** → Bootstrap project
   - Setup development environment, git repo, project structure
   - Output: `.agdev/handoff/environment-report.md`

2. **analyst** → Discovery
   - Create project brief from user requirements
   - Output: `.agdev/handoff/project-brief.md`

3. **pm** → PRD Creation
   - Create Product Requirements Document from project brief
   - Input: `project-brief.md`
   - Output: `.agdev/handoff/prd.md`

4. **architect** → UX Specification
   - Create front-end specification from PRD
   - Input: `prd.md`
   - Output: `.agdev/handoff/front-end-spec.md`

5. **architect** → Architecture Design
   - Create fullstack architecture from PRD + front-end spec
   - Input: `prd.md`, `front-end-spec.md`
   - Output: `.agdev/handoff/architecture.md`

6. **pm** → PRD Update (if needed)
   - Update PRD with architect's suggestions
   - Condition: architect flagged PRD changes
   - Input: `architecture.md`
   - Output: `prd.md` (updated)

7. **po** → Validation
   - Validate all artifacts for consistency and completeness
   - Input: all handoff documents
   - Output: `.agdev/handoff/validation-report.md`

8. **po** → Sharding
   - Break PRD into development-ready shards (epics → stories)
   - Input: `prd.md`
   - Output: `.agdev/handoff/sharded-docs/`

## Development Cycle (Repeat per Story)

9. **dev** → Implementation
   - Implement story, write code + tests
   - Input: Current story file
   - Output: Code changes + `.agdev/handoff/dev-output.md`

10. **qa** → Review (Optional)
    - Review implementation: APPROVE/REJECT
    - Input: `dev-output.md` + code changes
    - Output: `.agdev/handoff/qa-review.md`

11. **dev** → Fix Issues (if QA rejected)
    - Fix issues from QA review
    - Input: `qa-review.md`
    - Repeat until QA approves

## Final Steps

12. **devops** → Deployment
    - Final deployment and CI/CD setup
    - Input: Approved code
    - Output: Live application
# Greenfield Service/API Workflow

Build a new backend service or API from scratch.

## Agent Sequence & Handoffs

1. **analyst** → Service Discovery
   - Analyze service requirements and scope
   - Define API contract and data requirements
   - Output: `.agdev/handoff/service-brief.md`

2. **architect** → Service Architecture
   - Design service architecture, database schema, API design
   - Choose tech stack, define deployment strategy
   - Input: `service-brief.md`
   - Output: `.agdev/handoff/service-architecture.md`

3. **data-engineer** → Database Design
   - Create database schema, migrations, relationships
   - Design data access patterns and RLS policies
   - Input: `service-architecture.md`
   - Output: `.agdev/handoff/database-design.md`

4. **po** → Story Creation
   - Break architecture into implementable stories
   - Create acceptance criteria for each endpoint/feature
   - Input: `service-architecture.md`, `database-design.md`
   - Output: `.agdev/handoff/service-stories/`

## Development Cycle (Repeat per Story)

5. **dev** → Implementation
   - Implement API endpoints, business logic, tests
   - Follow API design patterns and security best practices
   - Input: Current story file
   - Output: Code changes + `.agdev/handoff/dev-output.md`

6. **qa** → Testing & Review
   - API testing, integration tests, security review
   - Verdict: APPROVE/REJECT with issues list
   - Input: `dev-output.md` + code changes
   - Output: `.agdev/handoff/qa-review.md`

7. **dev** → Fix Issues (if needed)
   - Address QA feedback
   - Input: `qa-review.md`
   - Repeat until approved

## Final Steps

8. **devops** → Deployment Setup
   - Configure CI/CD, containerization, monitoring
   - Setup staging and production environments
   - Input: Approved service code
   - Output: Deployed service with monitoring
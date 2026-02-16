# Code Review Workflow

Multi-agent code review process for critical code changes.

## Agent Sequence & Handoffs

This workflow provides comprehensive code review through multiple specialized perspectives.

## Review Phases (Parallel)

### 1. Architecture Review
**Agent: architect**
- Review system design decisions, architectural patterns
- Check integration points, scalability considerations
- Validate against architectural standards and best practices
- Input: Code changes + architecture documentation
- Output: `.agdev/handoff/architecture-code-review.md`

### 2. Quality Assurance Review
**Agent: qa**
- Review code quality, test coverage, error handling
- Check adherence to coding standards and conventions
- Validate against acceptance criteria and requirements
- Input: Code changes + test suite
- Output: `.agdev/handoff/qa-code-review.md`

### 3. Security Review
**Agent: devops**
- Review security implications, vulnerability assessment
- Check authentication, authorization, input validation
- Review secrets management, logging, monitoring
- Input: Code changes + security requirements
- Output: `.agdev/handoff/security-code-review.md`

## Consolidation Phase

### 4. Review Consolidation
**Agent: architect** (as lead reviewer)
- Consolidate feedback from all reviewers
- Prioritize issues by severity and impact
- Create unified feedback with clear action items
- Input: All review documents
- Output: `.agdev/handoff/consolidated-code-review.md`

## Resolution Cycle

### 5. Issue Resolution
**Agent: dev**
- Address feedback from consolidated review
- Implement security fixes, quality improvements
- Update tests and documentation as needed
- Input: `consolidated-code-review.md`
- Output: Updated code + `.agdev/handoff/resolution-report.md`

### 6. Final Verification
**Agent: qa**
- Verify all issues have been addressed adequately
- Perform final quality check on updated code
- Decision: APPROVE or request additional changes
- Input: `resolution-report.md` + updated code
- Output: `.agdev/handoff/final-approval.md`

## Exit Conditions

### Approval Path
- All reviewers approve the changes
- Critical security issues resolved
- Code quality standards met

### Rejection Path
- Critical issues remain unresolved
- Security vulnerabilities identified
- Requires architectural changes

## Output

- Multi-perspective code review feedback
- Security and quality validation
- Approved and thoroughly reviewed code changes
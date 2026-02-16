# QA Loop Workflow

Quality assurance review cycle with iterative feedback and improvement.

## Agent Sequence & Handoffs

This workflow creates a feedback loop between development and quality assurance to ensure high-quality deliverables.

## Loop Pattern

### Initial Review
1. **qa** → Quality Assessment
   - Review implementation against acceptance criteria
   - Test functionality, performance, security, accessibility
   - Check code quality, test coverage, documentation
   - Input: Implementation + acceptance criteria
   - Output: `.agdev/handoff/qa-review.md`

### Decision Point
- **If APPROVE**: Proceed to next phase or completion
- **If REJECT**: Continue to fix cycle

### Fix Cycle (Repeat until APPROVE or Max Iterations)
2. **dev** → Issue Resolution
   - Address specific issues identified by QA
   - Maintain code quality standards during fixes
   - Input: `qa-review.md`
   - Output: Updated code + `.agdev/handoff/dev-fix-output.md`

3. **qa** → Re-Review
   - Verify fixes address original issues
   - Ensure no new issues were introduced
   - Re-test affected functionality
   - Input: `dev-fix-output.md` + updated code
   - Output: Updated `.agdev/handoff/qa-review.md`

## Quality Gates

- **Maximum 5 iterations** per story/feature
- If QA rejects 5 times, escalate to human review
- Each iteration must show measurable improvement
- Document lessons learned for future iterations

## Exit Conditions

### Success Path
- QA approves implementation
- All acceptance criteria met
- Code quality standards satisfied

### Escalation Path
- Maximum iterations reached
- Blocked by external dependencies
- Architectural changes required

## Output

- Quality-assured implementation
- Documentation of issues found and resolved
- Quality metrics and improvement trends
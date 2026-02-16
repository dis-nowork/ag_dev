# Spec Pipeline Workflow

Transform requirements into detailed technical specifications ready for development.

## Agent Sequence & Handoffs

This workflow focuses on creating comprehensive specifications before development begins.

1. **analyst** → Requirements Gathering
   - Gather and analyze user requirements, business needs
   - Conduct stakeholder interviews, competitive analysis
   - Define problem statement and success criteria
   - Output: `.agdev/handoff/requirements-analysis.md`

2. **pm** → Product Specification
   - Create detailed Product Requirements Document (PRD)
   - Define user stories, acceptance criteria, MVP scope
   - Include success metrics, risks, assumptions
   - Input: `requirements-analysis.md`
   - Output: `.agdev/handoff/product-spec.md`

3. **architect** → Technical Specification
   - Design system architecture, technology decisions
   - Create API specifications, data models
   - Define non-functional requirements (performance, security)
   - Input: `product-spec.md`
   - Output: `.agdev/handoff/technical-spec.md`

4. **ux** → User Experience Specification
   - Design user journeys, wireframes, interaction patterns
   - Define design system, accessibility requirements
   - Create component specifications and design tokens
   - Input: `product-spec.md`
   - Output: `.agdev/handoff/ux-spec.md`

5. **data-engineer** → Data Specification
   - Design database schema, data flow, integration points
   - Define data validation, migration, backup strategies
   - Plan data privacy and compliance requirements
   - Input: `technical-spec.md`
   - Output: `.agdev/handoff/data-spec.md`

## Validation Phase

6. **po** → Specification Validation
   - Cross-check all specifications for consistency
   - Validate against original requirements
   - Ensure all user stories are covered
   - Input: All specification documents
   - Output: `.agdev/handoff/validation-report.md`

7. **po** → Story Creation
   - Break specifications into development-ready stories
   - Create detailed acceptance criteria
   - Prioritize stories for development sequence
   - Input: All specification documents + validation report
   - Output: `.agdev/handoff/development-stories/`

## Output

- Complete technical and product specifications
- Development-ready user stories
- Clear acceptance criteria and definition of done
- Risk analysis and mitigation strategies
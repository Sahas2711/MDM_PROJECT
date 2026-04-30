# Contributing

## Branching

Use feature-oriented branch names:

- feature/dashboard-ux-polish
- fix/crop-recommendation-validation
- chore/docs-update

## Commit Guidelines

Prefer clear, scoped messages:

- feat: add market intelligence scatter legend
- fix: improve sell timing tooltip formatting
- docs: add architecture and routes guides

## Development Workflow

1. Pull latest changes.
2. Create a dedicated branch.
3. Implement focused changes.
4. Run lint and build locally.
5. Open pull request with summary and screenshots for UI changes.

## Code Style

- Keep components small and reusable.
- Reuse existing primitives before creating new ones.
- Preserve dark theme consistency and token-based styling.
- Avoid hardcoding colors when token options exist.
- Prefer explainability text for model-driven outputs.

## Quality Checklist Before PR

- npm run lint passes
- npm run build passes
- routes function correctly
- responsive layout verified on mobile and desktop
- no broken chart rendering

## UI Contribution Rules

- Avoid generic admin visuals.
- Keep AI-product feel through subtle motion and informative copy.
- Favor cards, charts, and insight blocks over plain data tables.

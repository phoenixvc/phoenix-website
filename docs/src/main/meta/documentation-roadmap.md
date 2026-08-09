# Documentation Roadmap {: #documentation-roadmap}

**Current as of:** 9 August 2026

This is a directional product-documentation roadmap. Baton is the operational
task graph for owners, status, sequencing, and closeout evidence.

## Principles {: #principles}

- Document the repository and deployed architecture that exist now.
- Keep build, deployment, live health, authentication, and authentic user-flow
  acceptance as separate claims.
- Prefer one canonical page per topic and retain small redirect pages only when
  an existing link must remain stable.
- Validate links and a strict MkDocs build before publishing documentation.
- Never include credentials, cookies, sessions, or private operational data.

## Now {: #now}

1. Reconcile the root README, TODO, setup commands, repository naming, workflow
   badges, Storybook guidance, and deployment claims.
2. Replace expired 2025 planning text and remove placeholders that imply MkDocs
   is still under evaluation.
3. Document the corrected portfolio stages and canonical project links.
4. Capture exact verification expectations for the blocked security dependency
   updates and repository-policy approval.
5. Close documentation work that is already satisfied, including the existing
   devcontainer, without erasing the historical GitHub record.

## Next {: #next}

1. Add strict MkDocs link/build validation to CI.
2. Add missing web and design-system build/type-check gates to pull-request CI.
3. Reconcile deployment and operator runbooks against current Azure resources
   and current workflow behavior.
4. Audit the theme runtime and Theme Designer, then document the chosen reusable
   theme architecture only after the investigation is complete.
5. Publish contributor guidance for the pinned pnpm workflow and Commitlint
   enforcement once the Husky hook is implemented.

## Later {: #later}

1. Establish a lightweight documentation review cadence and ownership model.
2. Add release notes or changelog conventions tied to shipped behavior.
3. Document cross-repository theme adoption after the website proof and first
   sibling pilot are complete.
4. Consolidate overlapping legacy deployment and DNS pages as their live
   replacements are verified.

## Definition of done {: #definition-of-done}

Documentation work is complete when the content matches current source and
runtime evidence, links resolve, `mkdocs build --strict` succeeds, and the Baton
task records the PR or commit plus any acceptance that remains operator-held.

## History {: #history}

The previous roadmap used a fully expired February-August 2025 timeline and
proposed evaluating MkDocs even though MkDocs was already the active platform.
It was replaced with this evidence-based rolling roadmap on 9 August 2026.

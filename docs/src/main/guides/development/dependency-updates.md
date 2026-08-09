# Dependency Updates

Renovate is the repository's only dependency-update pull request authority.
GitHub Dependabot alerts remain enabled as a detection signal, but Dependabot
version-update configuration and automated security-fix pull requests must stay
disabled. This keeps GitHub's vulnerability reporting without creating
competing update branches.

## Renovate policy

- Vulnerability-remediation pull requests are created immediately and labelled
  `security` and `dependencies`.
- Routine updates wait for explicit approval in the Renovate Dependency
  Dashboard before Renovate creates a branch or pull request.
- Dependency pull requests never automerge. The repository's normal review,
  build, and branch-protection gates still apply.
- Renovate creates at most two pull requests per hour and rebases branches that
  fall behind the default branch.
- Storybook packages update as one pinned package family so core, addons,
  framework adapters, and ESLint integration cannot drift to incompatible
  versions.
- MkDocs ecosystem packages update together so one strict documentation build
  verifies the complete toolchain.
- Major updates receive the `breaking-change` label.

## Review requirements

Before merging, refresh the pull request's exact head and base, review the
dependency and lockfile diff, and run the checks appropriate to the affected
workspace. A visible lint check alone is not sufficient. Examples include:

- web or design-system type-check and production build for frontend tooling;
- API TypeScript build for server dependencies;
- static Storybook build for Storybook changes; and
- locked Poetry install plus strict MkDocs build for documentation packages.

Keep dependency alerts separate from update automation: disabling Dependabot
pull requests must not disable GitHub vulnerability alerts or the dependency
graph.

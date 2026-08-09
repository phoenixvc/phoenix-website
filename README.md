# Phoenix Website

The public Phoenix VC website, portfolio experience, design-system workspace,
Azure Functions API, and MkDocs documentation live in this repository.

[![Continuous Integration](https://github.com/phoenixvc/phoenix-website/actions/workflows/ci.yml/badge.svg)](https://github.com/phoenixvc/phoenix-website/actions/workflows/ci.yml)
[![Deploy phoenixvc-web](https://github.com/phoenixvc/phoenix-website/actions/workflows/deploy-phoenixvc-web.yml/badge.svg)](https://github.com/phoenixvc/phoenix-website/actions/workflows/deploy-phoenixvc-web.yml)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](package.json)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

The production workflow targets the Azure Static Web App serving
[phoenixvc.tech](https://phoenixvc.tech). A green workflow proves that specific
run completed; it is not a standing uptime or user-flow guarantee.

## Workspace

| Area            | Location             | Purpose                                                     |
| --------------- | -------------------- | ----------------------------------------------------------- |
| Website         | `apps/web`           | React, TypeScript, and Vite public site                     |
| Design system   | `apps/design-system` | Shared components, tokens, Storybook, and visual prototypes |
| API             | `apps/api`           | Azure Functions API                                         |
| Documentation   | `docs`               | MkDocs source and configuration                             |
| Infrastructure  | `infra`              | Azure Bicep modules and deployment assets                   |
| Shared packages | `packages`           | Workspace packages used across applications                 |

The root workspace is managed by pnpm. Do not use npm to install or update
workspace dependencies.

## Prerequisites

- Node.js 20 or newer
- Corepack
- pnpm 10.30.3 (declared by `packageManager` in `package.json`)
- Python 3.12 and Poetry for documentation work
- Azure CLI only for authorized infrastructure or deployment operations

## Get started

```bash
git clone https://github.com/phoenixvc/phoenix-website.git
cd phoenix-website
corepack enable
corepack prepare pnpm@10.30.3 --activate
pnpm install --frozen-lockfile
pnpm web
```

The Vite development server is normally available at
`http://localhost:5173`.

## Verification and development commands

| Command                                                  | Purpose                              |
| -------------------------------------------------------- | ------------------------------------ |
| `pnpm web`                                               | Start the website development server |
| `pnpm design`                                            | Start the design-system Vite app     |
| `pnpm build:web`                                         | Build the production website bundle  |
| `pnpm build:design`                                      | Build the design-system bundle       |
| `pnpm type-check:web`                                    | Type-check the website               |
| `pnpm type-check:design`                                 | Type-check the design system         |
| `pnpm lint`                                              | Run the root ESLint configuration    |
| `pnpm format-check`                                      | Check repository formatting          |
| `pnpm --filter @phoenixvc/design-system storybook`       | Start Storybook on port 6006         |
| `pnpm --filter @phoenixvc/design-system build-storybook` | Build static Storybook output        |

The pull-request CI workflow currently runs frozen installation, ESLint, and
the formatting check. Before opening a PR, also run the build and type-check
commands for every changed application; those gates are not yet enforced by
CI.

## Documentation

MkDocs is already the documentation platform; it is not an option still under
evaluation.

```bash
poetry install
poetry run mkdocs build --strict -f docs/mkdocs.yml
```

`pnpm docs` starts an interactive documentation helper and development server.
The current documentation priorities are maintained in the
[documentation roadmap](docs/src/main/meta/documentation-roadmap.md).

## Design system and themes

The website contains a multi-theme runtime, built-in theme definitions, token
validation and storage managers, and an in-progress Theme Designer. Exact
cross-repository reuse architecture is intentionally undecided until the
existing implementation and potentially relevant older repositories have been
fully investigated. See [theme documentation](docs/src/main/design/themes/README.md)
and the live Baton project for scoped implementation work.

## Deployment

`.github/workflows/deploy-phoenixvc-web.yml` runs on relevant pushes to `main`
and by manual dispatch. It installs with pnpm 10.30.3, builds the design system
and website, and uploads `apps/web/dist` plus the API location to Azure Static
Web Apps using the configured production secret.

Deployment, live health, authentication, and authentic user-flow acceptance
are separate checks. Do not infer all four from a successful build or deploy
job.

## Contributions

1. Start from current `origin/main` in a focused branch or isolated worktree.
2. Preserve unrelated work and follow `AGENTS.md` and `CLAUDE.md`.
3. Install with pnpm and keep `pnpm-lock.yaml` synchronized.
4. Run formatting, lint, type-check, and relevant builds before committing.
5. Use Conventional Commit messages and describe validation evidence in the PR.

Commitlint is configured, but the repository does not yet have a Husky
`commit-msg` hook. Until that follow-up lands, validate commit messages
explicitly when preparing a PR.

## Security

Do not report vulnerabilities in public issues. Send reports to
`security@phoenixvc.tech` with reproduction steps, impact, and any suggested
mitigation. Never commit credentials, sessions, or deployment tokens.

## License

Proprietary software. See [LICENSE](LICENSE).

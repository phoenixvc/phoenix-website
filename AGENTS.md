# AGENTS.md - Guidance for AI Coding Agents in Phoenix Website

This file bridges Antigravity (Gemini), Claude Code, and other AI agents into the Phoenix Website repository. It is automatically loaded by the Antigravity CLI.

## Startup Protocol

On session start, you **MUST** read and conform to:
1. [CLAUDE.md](file:///C:/Users/smitj/repos/phoenix-website/CLAUDE.md) - For the repository overview, build/test commands, and project conventions.

## Execution Rules

- **Lockfile Integrity**: Always run `pnpm install` after updating dependencies to keep the lockfile synchronized.
- **Verification**: Run format checks and build locally before committing.

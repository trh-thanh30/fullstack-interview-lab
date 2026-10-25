<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project test organization

- Never colocate `*.test.*`, `*.spec.*` or integration test files with production files.
- Put tests in the nearest module's `tests/` directory while preserving the production filename, for example `src/content/tests/source-registry.test.ts`.
- Put module-specific mocks and fixtures under `tests/mocks/` and `tests/fixtures/` inside that module.
- Put repository-wide test setup and architecture tests in the root `tests/` directory.
- Tool configuration files such as `vitest.config.mts`, `eslint.config.mjs` and `postcss.config.mjs` stay at the repository root because their tools discover them there; they are not test files.
- Run `pnpm check:test-layout` before handing off changes. The full `pnpm quality` command runs this check automatically.

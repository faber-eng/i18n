# @faber-eng/i18n

Generic, type-safe i18n package, published to npmjs as a public scoped package. Public repo: no client names, internal URLs or secrets in code, tests or docs.

Standards: `faber-principles` and `faber-typescript-principles` (castell). `MEMORY.md` records why the package is shaped this way.

## Conventions

- Bun for install and scripts. Biome (tabs), strict TypeScript with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. ESM only.
- The gate: `bun run typecheck`, `bun run check`, `bun run test` (Vitest with `--typecheck`, so `tests/types.test-d.ts` runs), `bun run build`.
- No runtime dependencies. `react` and `vitest` are optional peers, used only by `src/react.tsx` and `src/testing.ts`.
- `src/core.ts` and `src/seo.ts` import no React (a test asserts it). `src/seo.ts` never reads env: `siteUrl` and `indexable` are parameters.
- `locale` is a required argument everywhere. No helper defaults to the default locale at the head level.
- A new public type or function gets a case in `tests/` and, for types, a `// @ts-expect-error` case in `tests/types.test-d.ts`.
- Never publish from a task. Publishing is a separate step the engineer approves.

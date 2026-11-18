# Memory

Decisions and gotchas for `@faber-eng/i18n`, newest last.

## 2026-11-18 · The package is extracted from fabrica-landing

`defineI18n` returns a pure instance (locales, slugs, messages, path helpers). React, SEO and test helpers are separate entry points so a consumer pays only for what it imports.

## 2026-11-18 · `pageFromPathname` uses the slug table of the detected locale

Landing matched only default-locale slugs, so `/en/about` fell back to `home`. The page is now looked up in the slug table of the locale the pathname belongs to. `/about` on the default (Indonesian) locale is not `about`; it is an unknown segment and gives the home page.

## 2026-11-18 · The root head has no locale

Source: fabrica-landing `memory/2026-09-07-root-head-has-no-locale.md`. A root `head()` runs once with no pathname, so default-locale text there ships on every page and no test fails. Every helper takes `locale` as a required argument; none defaults. The README carries the gotcha.

## 2026-11-18 · `defineI18n` infers the message type from the whole `messages` object, not only the default entry

`messages` is typed `Ms & Record<L, Ms[D]>`. A missing key or a wrong leaf type in another locale fails to compile. An extra key does not (the inferred `Ms` includes it), so each non-default locale file is annotated `Messages<typeof default>`; the annotation is what catches extras. Tried first: `Record<D, M> & Record<Exclude<L, D>, NoInfer<M>>`. TypeScript infers `M` from every property of a `Record`, so the first member did not isolate the default entry.

## 2026-11-18 · The root page is the page whose default-locale slug is `/`

`pageFromPathname` falls back to it for an unknown segment. `defineI18n` throws at startup when no page has that slug, so the fallback cannot be undefined.

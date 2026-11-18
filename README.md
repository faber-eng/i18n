# @faber-eng/i18n

Type-safe i18n for Faber sites: locales, per-locale page slugs, hreflang and sitemap helpers, and a typed React provider. ESM only, no runtime dependencies.

- [Documentation](#documentation): install, the API, what is checked, and the root-head gotcha
- [How to implement this package](#how-to-implement-this-package): a step-by-step setup for a TanStack Start site

## Documentation

### Install

```sh
bun add @faber-eng/i18n
```

`react` (^19) is an optional peer, needed only by `@faber-eng/i18n/react`. `vitest` is an optional peer, needed only by `@faber-eng/i18n/testing`. TypeScript 5.4 or newer is required (the types use `NoInfer`).

### Define your site

```ts
// src/i18n/messages/id.ts
export const id = {
	title: "Fabrica",
	nav: { home: "Beranda", about: "Tentang kami" },
	faq: { items: ["Pertama", "Kedua"] },
};
```

```ts
// src/i18n/messages/en.ts
import type { Messages } from "@faber-eng/i18n";
import type { id } from "./id";

export const en: Messages<typeof id> = {
	title: "Fabrica",
	nav: { home: "Home", about: "About us" },
	faq: { items: ["First", "Second"] },
};
```

```ts
// src/i18n/index.ts
import { defineI18n } from "@faber-eng/i18n";
import { en } from "./messages/en";
import { id } from "./messages/id";

export const i18n = defineI18n({
	locales: {
		id: { htmlLang: "id", ogLocale: "id_ID" },
		en: { htmlLang: "en", ogLocale: "en_US" },
	},
	defaultLocale: "id",
	pages: {
		home: { id: "/", en: "/" },
		faq: { id: "/faq", en: "/faq" },
		about: { id: "/tentang-kami", en: "/about" },
	},
	messages: { id, en },
});
```

The default locale is served without a prefix. Every other locale uses its `prefix`, which defaults to `/${locale}`. The page with the slug `/` is home: `/` for the default locale and `/en` (never `/en/`) for a prefixed one.

### Entry points

#### `@faber-eng/i18n`

`defineI18n(config)` returns the instance. It has no React in it.

```ts
i18n.locales; // ["id", "en"]
i18n.pathForPage("about", "en"); // "/en/about"
i18n.pathForLocale("en"); // "/en"
i18n.localeFromPathname("/en/faq"); // "en"
i18n.pageFromPathname("/en/about"); // "about"
i18n.pageFromPathname("/tentang-kami"); // "about"
i18n.isLocale("fr"); // false
i18n.htmlLang("en"); // "en"
i18n.ogLocale("en"); // "en_US"
i18n.messages("en"); // the en messages
```

`pageFromPathname` reads the slug table of the locale it detects, ignores a trailing slash, the query string and the hash, and returns the page with the slug `/` for an unknown segment.

Type helpers: `LocaleOf<typeof i18n>`, `PageOf<typeof i18n>`, `MessagesOf<typeof i18n>`, `Messages<typeof defaultLocaleMessages>`.

#### `@faber-eng/i18n/react`

```tsx
import { createI18nReact } from "@faber-eng/i18n/react";
import { i18n } from "./i18n";

export const { LocaleProvider, useLocale } = createI18nReact(i18n);

<LocaleProvider locale="en">
	<App />
</LocaleProvider>;

const { locale, t } = useLocale(); // t is typed from the default-locale messages
```

The context holds only the locale. `useLocale` outside a provider returns the default locale.

#### `@faber-eng/i18n/seo`

Framework-free: it imports no React and never reads an env variable. `siteUrl` (no trailing slash; `stripTrailingSlash` removes one) and `indexable` are parameters.

```ts
import {
	alternateLinks,
	canonicalLink,
	robotsDirective,
	robotsTxt,
	sitemapXml,
} from "@faber-eng/i18n/seo";

alternateLinks(i18n, siteUrl, "about"); // one per locale, plus x-default at the default-locale URL
canonicalLink(i18n, siteUrl, "about", "en");
sitemapXml(i18n, siteUrl, { changefreq: "weekly", priority: "1.0" }); // options are optional
robotsTxt(indexable, siteUrl, ["GPTBot"]); // the crawler list is optional
robotsDirective(indexable); // "index, follow, max-image-preview:large" or "noindex, nofollow"
```

Also exported: `stripTrailingSlash` and `hreflangFor(i18n, locale)`, which returns the locale's `htmlLang`.

#### `@faber-eng/i18n/testing`

```ts
import { expectSameShape } from "@faber-eng/i18n/testing";

it("every locale has the default locale's shape", () => {
	expectSameShape({ id, en }, "id");
});
```

`expectSameShape(messages, defaultLocale)` checks that every locale has the same keys and array lengths as the default locale, and that no leaf is `undefined` or an empty string. `shapeSignature(value)` returns the list of key paths it compares.

### What is checked, and when

| Rule | Compile time | Runtime |
| --- | --- | --- |
| A page or locale argument is one of the configured values | yes, when `locales` keeps its literal keys (see below) | no |
| Every page has a slug for every locale | yes | no |
| A slug starts with `/` | yes | `defineI18n` throws at startup |
| A slug other than `/` does not end with `/` and has no `//` | no | `defineI18n` throws at startup |
| `defaultLocale` is one of the locales | yes | no |
| A locale is missing a key that the default locale has | yes (in `defineI18n` and with `Messages<typeof default>`) | `expectSameShape` |
| A locale has a key the default locale lacks | with `Messages<typeof default>` on that locale's file; `defineI18n` does not catch it | `expectSameShape` |
| A key in `messages` is not in `locales` | no | no |
| A locale in a `pages` slug map is not in `locales` | yes | no |
| A leaf has the wrong type, such as `string[]` for `string` | yes | no |
| Array lengths match | no | `expectSameShape` |
| Two pages share a slug in one locale | no | `defineI18n` throws at startup |
| A page uses the slug `/` in the default locale | no | `defineI18n` throws at startup |
| A prefix starts with `/` and does not end with `/` | no | `defineI18n` throws at startup |
| Two locales have equal or nested prefixes, such as `/en` and `/en/gb` (`/en` and `/enx` are fine) | no | `defineI18n` throws at startup |
| An empty object `{}` is present in one locale and not the other | no | `expectSameShape` |
| `sitemapXml` values contain `&`, `<`, `>` or quotes | no | escaped in `loc`, `href` and `hreflang` |
| A leaf is an empty string | no | `expectSameShape` |
| A pathname segment is unknown | no | `pageFromPathname` falls back to the `/` page |
| A route file exists for each page and locale | no | no (your router decides) |

Two accuracy notes:

- A locale key in `messages` that is not in `locales` is not rejected at compile time. An extra locale in a `pages` slug map is.
- If `locales` is typed as a widened `Record<string, LocaleMeta>`, every page and locale check collapses to `string`. Declare the config inline or with `as const`.

Annotate each non-default locale file with `Messages<typeof default>`, as in the example. Without the annotation a locale with an extra key passes the compiler.

### Gotcha: the root head has no locale

`locale` is a required argument in every helper. None of them falls back to the default locale, because a silent fallback hides the bug below.

In TanStack Router, `createRootRouteWithContext().head()` runs once, with no route match and no pathname, so it cannot know the locale. A head built there with the default locale ships default-locale strings on every page. In one site, `/en` served an English `<meta name="description">` next to Indonesian structured-data descriptions, and no test failed. The root component can read the locale (it can call `useRouterState`), which is why `<html lang>` was right while the head was wrong.

Build everything that varies by locale (meta, canonical, hreflang, structured data, share images) in a per-page head function that the route calls with its locale. Keep only locale-free tags in the root head. A test that asserts the English page carries English strings catches this; a test that only checks a tag exists does not.

## How to implement this package

A step-by-step setup for a TanStack Start site, the Faber frontend stack. The router parts (steps 5, 7 and 9) are TanStack-specific. Everything else works with any React app, and the `.` and `./seo` entry points work without React.

The code in steps 1 to 10 was compiled with `tsc --strict` against the built package. The router files themselves (`createFileRoute`, `shellComponent`) were not run here, so check them against your router version.

Final layout:

```
src/
  i18n/
    messages/id.ts        default locale, defines the shape
    messages/en.ts        other locales, annotated with Messages<typeof id>
    index.ts              defineI18n + exported types
    react.ts              LocaleProvider, useLocale
  pages/about.tsx         shared page component, takes a locale prop
  seo.ts                  your pageHead(page, locale)
  routes/
    __root.tsx            <html lang>, locale-free head only
    index.tsx             home, default locale
    tentang-kami.tsx      about, default locale
    en/index.tsx          home, English
    en/about.tsx          about, English
    sitemap[.]xml.tsx
    robots[.]txt.tsx
  i18n/i18n.test.ts       shape, round-trip and English-head tests
```

### 1. Install

```sh
bun add @faber-eng/i18n
```

### 2. Write the messages

The default locale comes first. Its object defines the shape that every other locale must match. Put the SEO text for each page under a `seo` key named after the page, so `pageHead` can look it up.

```ts
// src/i18n/messages/id.ts
export const id = {
	title: "Fabrica",
	nav: { home: "Beranda", about: "Tentang kami" },
	seo: {
		home: { title: "Fabrica", description: "Buat website dengan AI." },
		about: { title: "Tentang Fabrica", description: "Tentang kami." },
	},
};
```

Annotate every other locale with `Messages<typeof id>`. A missing key, a wrong leaf type and an extra key are then compile errors in that file.

```ts
// src/i18n/messages/en.ts
import type { Messages } from "@faber-eng/i18n";
import type { id } from "./id";

export const en: Messages<typeof id> = {
	title: "Fabrica",
	nav: { home: "Home", about: "About us" },
	seo: {
		home: { title: "Fabrica", description: "Build a website with AI." },
		about: { title: "About Fabrica", description: "About us." },
	},
};
```

### 3. Define the instance

One `defineI18n` call, in one file. Write the config inline so the locale and page names keep their literal types.

```ts
// src/i18n/index.ts
import {
	defineI18n,
	type LocaleOf,
	type MessagesOf,
	type PageOf,
} from "@faber-eng/i18n";
import { en } from "./messages/en";
import { id } from "./messages/id";

export const i18n = defineI18n({
	locales: {
		id: { htmlLang: "id", ogLocale: "id_ID" },
		en: { htmlLang: "en", ogLocale: "en_US" },
	},
	defaultLocale: "id",
	pages: {
		home: { id: "/", en: "/" },
		about: { id: "/tentang-kami", en: "/about" },
	},
	messages: { id, en },
});

export type TLocale = LocaleOf<typeof i18n>; // "id" | "en"
export type TPage = PageOf<typeof i18n>; // "home" | "about"
export type TMessages = MessagesOf<typeof i18n>;
```

Rules the call enforces:

- The page with the slug `/` is home. One page must have it.
- Slugs start with `/` and do not end with `/`.
- Two pages cannot share a slug in the same locale.
- The default locale has no URL prefix. Other locales use `prefix`, which defaults to `/<locale>`.
- Two locales cannot have equal or nested prefixes.

A rule that fails stops the app at startup with a named error.

### 4. Create the React bindings (skip if you do not use React)

```ts
// src/i18n/react.ts
import { createI18nReact } from "@faber-eng/i18n/react";
import { i18n } from "#/i18n";

export const { LocaleProvider, useLocale } = createI18nReact(i18n);
```

`useLocale()` returns `{ locale, t }`. `t` is typed from your default-locale messages, so `t.nav.home` autocompletes and `t.nope` fails to compile.

### 5. Add one route file per page and locale

TanStack file routes need a static file for each URL, and the package cannot generate them. Keep each file thin: it names the page and the locale, and the shared page component does the rest.

```tsx
// src/routes/tentang-kami.tsx
import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "#/pages/about";
import { pageHead } from "#/seo";

export const Route = createFileRoute("/tentang-kami")({
	head: () => pageHead("about", "id"),
	component: () => <AboutPage locale="id" />,
});
```

```tsx
// src/routes/en/about.tsx
import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "#/pages/about";
import { pageHead } from "#/seo";

export const Route = createFileRoute("/en/about")({
	head: () => pageHead("about", "en"),
	component: () => <AboutPage locale="en" />,
});
```

The shared page takes the locale as a prop and wraps its content in the provider:

```tsx
// src/pages/about.tsx
import type { TLocale } from "#/i18n";
import { LocaleProvider, useLocale } from "#/i18n/react";

function About() {
	const { t } = useLocale();
	return <h1>{t.nav.about}</h1>;
}

export default function AboutPage({ locale }: { locale: TLocale }) {
	return (
		<LocaleProvider locale={locale}>
			<About />
		</LocaleProvider>
	);
}
```

The route path and the slug in `pages` must agree. `i18n.pathForPage("about", "en")` gives `/en/about`, so the file is `routes/en/about.tsx`. The package cannot check this. Step 10 adds a test for it.

### 6. Build `pageHead` in your app

The package gives you the canonical and hreflang links. Your app owns the rest of the head (titles, Open Graph tags, structured data), because those differ per site.

```ts
// src/seo.ts
import { alternateLinks, canonicalLink } from "@faber-eng/i18n/seo";
import { i18n, type TLocale, type TPage } from "#/i18n";

const SITE_URL = "https://example.com"; // read it from your env, no trailing slash

export function pageHead(page: TPage, locale: TLocale) {
	const { title, description } = i18n.messages(locale).seo[page];
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ property: "og:locale", content: i18n.ogLocale(locale) },
		],
		links: [
			canonicalLink(i18n, SITE_URL, page, locale),
			...alternateLinks(i18n, SITE_URL, page),
		],
	};
}
```

`pageHead("about")` without a locale and `pageHead("nope", "en")` are compile errors. That is on purpose. See "Gotcha: the root head has no locale" above.

### 7. Set `<html lang>` in the root, and nothing else that depends on the locale

The root route's `head()` runs once with no pathname, so it cannot know the locale. Put only locale-free tags there (charset, viewport, icons, stylesheet). The root component can read the pathname, so it sets `lang`:

```tsx
// src/routes/__root.tsx (shell component only)
import { useRouterState } from "@tanstack/react-router";
import { i18n } from "#/i18n";

function RootDocument({ children }: { children: React.ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const lang = i18n.htmlLang(i18n.localeFromPathname(pathname));

	return (
		<html lang={lang}>
			<head>{/* HeadContent goes here */}</head>
			<body>{children}</body>
		</html>
	);
}
```

### 8. Add a language switch

A switch is one link per locale. `pathForPage` gives the right URL, including the different slug per locale.

```tsx
import { i18n, type TPage } from "#/i18n";
import { useLocale } from "#/i18n/react";

export function LanguageSwitch({ page }: { page: TPage }) {
	const { locale } = useLocale();

	return (
		<nav>
			{i18n.locales.map((l) => (
				<a
					key={l}
					href={i18n.pathForPage(page, l)}
					hrefLang={i18n.htmlLang(l)}
					aria-current={l === locale ? "page" : undefined}
				>
					{l}
				</a>
			))}
		</nav>
	);
}
```

### 9. Serve `sitemap.xml` and `robots.txt`

```ts
// src/routes/sitemap[.]xml.tsx
import { createFileRoute } from "@tanstack/react-router";
import { sitemapXml } from "@faber-eng/i18n/seo";
import { i18n } from "#/i18n";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () =>
				new Response(sitemapXml(i18n, SITE_URL), {
					headers: { "content-type": "application/xml; charset=utf-8" },
				}),
		},
	},
});
```

```ts
// src/routes/robots[.]txt.tsx
import { createFileRoute } from "@tanstack/react-router";
import { robotsTxt } from "@faber-eng/i18n/seo";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(robotsTxt(INDEXABLE, SITE_URL, ["GPTBot"]), {
					headers: { "content-type": "text/plain; charset=utf-8" },
				}),
		},
	},
});
```

`SITE_URL` and `INDEXABLE` come from your env. The package never reads env itself. Pass `indexable = false` on staging so the site is not indexed. The crawler list is optional and is yours to choose.

### 10. Write the tests

Three tests catch what the compiler cannot.

```ts
// src/i18n/i18n.test.ts
import { expectSameShape } from "@faber-eng/i18n/testing";
import { describe, expect, it } from "vitest";
import { i18n } from "#/i18n";
import { en } from "#/i18n/messages/en";
import { id } from "#/i18n/messages/id";

describe("i18n", () => {
	it("every locale has the default locale's shape", () => {
		expectSameShape({ id, en }, "id");
	});

	it("every page URL maps back to the same page and locale", () => {
		for (const locale of i18n.locales) {
			for (const page of i18n.pages) {
				const path = i18n.pathForPage(page, locale);
				expect(i18n.localeFromPathname(path)).toBe(locale);
				expect(i18n.pageFromPathname(path)).toBe(page);
			}
		}
	});

	it("the English page carries English strings in its head", async () => {
		const { pageHead } = await import("#/seo");
		const head = pageHead("about", "en");
		expect(head.meta).toContainEqual({ title: en.seo.about.title });
		expect(head.meta).not.toContainEqual({ title: id.seo.about.title });
	});
});
```

The first test checks array lengths and empty strings. The second checks the slug table. The third is the guard for the root-head trap: it asserts the actual English text, not only that a tag exists.

To check that a route file exists for every page and locale, list the files in `src/routes` and compare them with `i18n.pathForPage`. The package does not do this for you.

### Add a page

1. Add the page to `pages` in `src/i18n/index.ts`, with a slug for every locale. The compiler stops you if a locale is missing.
2. Add its `seo` entry and any text to `id.ts` and to every other locale file.
3. Add one route file per locale, and call `pageHead(page, locale)` in each.
4. Run the tests.

### Add a locale

1. Add it to `locales` with its `htmlLang` and `ogLocale`. Add a `prefix` if the default `/<locale>` is wrong.
2. Add a slug for it to every page in `pages`.
3. Create its messages file, annotated with `Messages<typeof id>`, and add it to `messages`.
4. Create the route folder (`src/routes/<locale>/`) with one file per page.
5. Run the tests. `localeFromPathname` and `pageFromPathname` pick it up from the config.

### Move an existing hand-written setup to this package

1. Keep the old output as a baseline: save `/sitemap.xml`, `/robots.txt` and the `<head>` of each page from the running site.
2. Replace the old locale and slug code with `defineI18n`. Keep your old exported names as type aliases (`TLocale`, `TPage`) to avoid editing every import at once.
3. Replace the hreflang, sitemap and robots code with the `./seo` helpers. Pass your own `changefreq`, `priority` and crawler list so the output stays the same.
4. Run the site again and diff the new output against the baseline. The diff must be empty.
5. Delete the old code.

`pageFromPathname` now reads the slug table of the detected locale. If your old code compared every locale against the default locale's slugs, a page like `/en/about` may have resolved to the wrong page before. The new result is the correct one.

## Publishing

`prepublishOnly` runs the tests and the build. The package is published to npmjs as public and scoped (`publishConfig.access: public`). Files shipped: `dist`, `README.md`, `LICENSE`.

## Scripts

`bun run test`, `bun run typecheck`, `bun run lint`, `bun run check`, `bun run build`, `bun run dev`.

## License

MIT

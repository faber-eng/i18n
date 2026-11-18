# @faber-eng/i18n

A TypeScript package for multi-language sites with **type-safe locales, pages and messages**. You describe your locales, your pages and the URL slug of each page in each locale once. The package gives you the URL for any page in any locale, finds the locale and page from a URL, builds the hreflang, canonical and sitemap output, and gives React components a typed `useLocale()`. A wrong locale, an unknown page, a missing translation key or a page without a slug for one locale fails the TypeScript compile, not the production site.

It is extracted from the i18n code of `fabrica-landing`. ESM only, no runtime dependencies.

## Features

- **One config, everything typed**: locale names, page names and the message shape are inferred from your config. Nothing is declared twice.
- **Per-locale URLs**: `about` can be `/tentang-kami` in Indonesian and `/about` in English. The default locale has no prefix, the others do (`/en/about`).
- **Both directions**: build a URL from `(page, locale)` and read `(page, locale)` back from a pathname.
- **Typed messages**: `t.nav.home` autocompletes, `t.nope` does not compile, and a locale that misses a key does not compile.
- **SEO output**: hreflang links with `x-default`, canonical links, `sitemap.xml` with all alternates, `robots.txt` and the robots meta value.
- **Framework-free core**: `.` and `./seo` import no React and read no environment variables. React is needed only for `./react`.
- **Startup checks**: duplicate slugs, bad slugs, clashing prefixes and a missing home page stop the app at startup with a named error.
- **Test helper**: `expectSameShape` checks that every locale has the same keys, array lengths and no empty strings.

## Installation

```sh
bun add @faber-eng/i18n
# or: npm install @faber-eng/i18n
```

- TypeScript 5.4 or newer is required (the types use `NoInfer`).
- `react` (^19) is an optional peer, needed only by `@faber-eng/i18n/react`.
- `vitest` (>=5.1) is an optional peer, needed only by `@faber-eng/i18n/testing`.

## Quick Start

### Define the instance

```ts
// src/i18n/index.ts
import { defineI18n } from "@faber-eng/i18n";

const id = {
	title: "Fabrica",
	nav: { home: "Beranda", about: "Tentang kami" },
};

const en = {
	title: "Fabrica",
	nav: { home: "Home", about: "About us" },
};

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
```

### Use it

```ts
i18n.pathForPage("about", "id"); // "/tentang-kami"
i18n.pathForPage("about", "en"); // "/en/about"
i18n.pathForPage("home", "en"); // "/en"

i18n.localeFromPathname("/en/about"); // "en"
i18n.pageFromPathname("/en/about"); // "about"
i18n.pageFromPathname("/tentang-kami"); // "about"

i18n.messages("en").nav.about; // "About us"
```

### Catch mistakes at compile time

```ts
i18n.pathForPage("nope", "id"); // error: "nope" is not a page
i18n.pathForPage("about", "fr"); // error: "fr" is not a locale

defineI18n({
	// ...
	pages: { home: { id: "/", en: "/" }, about: { id: "/tentang-kami" } }, // error: about has no "en" slug
	messages: { id, en: { title: "Fabrica" } }, // error: en is missing "nav"
});
```

### Use it in React

```tsx
// src/i18n/react.ts
import { createI18nReact } from "@faber-eng/i18n/react";
import { i18n } from "./index";

export const { LocaleProvider, useLocale } = createI18nReact(i18n);
```

```tsx
function Header() {
	const { locale, t } = useLocale(); // locale: "id" | "en", t: typed from the id messages
	return <h1>{t.nav.home}</h1>;
}

<LocaleProvider locale="en">
	<Header />
</LocaleProvider>;
```

For a full site (routes, head tags, sitemap, tests) see [Usage Examples](#usage-examples).

## How It Works

### Locales and prefixes

`locales` is a record. Its keys are the locale names, and each entry says what to write in `<html lang>` (`htmlLang`) and in `og:locale` (`ogLocale`).

The `defaultLocale` has **no URL prefix**. Every other locale has one, taken from its `prefix` or, if you do not set it, `/<locale>`.

| Locale | Prefix | `about` URL |
| --- | --- | --- |
| `id` (default) | none | `/tentang-kami` |
| `en` | `/en` | `/en/about` |
| `en` with `prefix: "/en-gb"` | `/en-gb` | `/en-gb/about` |

### Pages and slugs

`pages` is a record. Its keys are the page names. Each page lists its slug for every locale. The slug is the path after the locale prefix, so a slug can differ per locale.

The page whose slug is `/` in the default locale is the **root page** (home). A home page is `/` in the default locale and the bare prefix in the others: `/en`, never `/en/`.

### From (page, locale) to a URL

`pathForPage(page, locale)` joins the locale's prefix and the page's slug. The package builds all paths once, when `defineI18n` runs, so each call is a lookup.

### From a URL to (locale, page)

```
pathname  "/en/about/?utm=1#top"
   │ strip query and hash
   ▼
path      "/en/about/"
   │ find the locale whose prefix matches ("/en" matches "/en" and "/en/…", not "/enx")
   ▼
locale    "en"           (no prefix matches → default locale)
   │ remove the prefix, strip trailing slashes
   ▼
slug      "/about"
   │ look it up in the slug table of THAT locale
   ▼
page      "about"        (not found → the root page)
```

The lookup uses the slug table of the locale it found. This is why `/en/about` and `/tentang-kami` both give `about`, and why `/about` on the default locale is an unknown segment that gives the home page.

| Pathname | Locale | Page |
| --- | --- | --- |
| `/` | `id` | `home` |
| `/tentang-kami` | `id` | `about` |
| `/en` | `en` | `home` |
| `/en/` | `en` | `home` |
| `/en/about?x=1#y` | `en` | `about` |
| `/enx` | `id` | `home` (`/enx` is not the prefix `/en`) |
| `/en/unknown` | `en` | `home` |
| `/about` | `id` | `home` (that slug is English) |

### How the types flow

Three type parameters come out of the config, and everything else is built from them:

- The **locale** type comes from the keys of `locales`.
- The **page** type comes from the keys of `pages`.
- The **message** type comes from the default locale's entry in `messages`.

`pages` is typed so that each page needs a slug for every locale, and each slug must start with `/`. `messages` is typed so that every locale must match the default locale's shape. `defaultLocale` must be one of the locale names.

Use `LocaleOf`, `PageOf` and `MessagesOf` to get these types in your own code:

```ts
import type { LocaleOf, MessagesOf, PageOf } from "@faber-eng/i18n";

export type TLocale = LocaleOf<typeof i18n>; // "id" | "en"
export type TPage = PageOf<typeof i18n>; // "home" | "about"
export type TMessages = MessagesOf<typeof i18n>;
```

One limit: TypeScript catches a *missing* key in another locale inside `defineI18n`, but not an *extra* key. To catch extras, write each non-default locale file with the `Messages` annotation (see [step 2](#2-write-the-messages)). The table in [What Is Checked](#what-is-checked-and-when) lists every check and when it runs.

### SEO output

`./seo` builds output from the instance and plain strings:

- `alternateLinks` returns one `hreflang` link per locale, plus `x-default` pointing at the default-locale URL.
- `canonicalLink` returns the canonical link of one page in one locale.
- `sitemapXml` returns a sitemap with one `<url>` for each page and locale, and all alternates inside each entry. Values are XML-escaped.
- `robotsTxt` and `robotsDirective` return the `robots.txt` text and the robots meta value for an indexable or non-indexable site.

`siteUrl` and `indexable` are parameters. The package never reads your env.

### Startup checks

`defineI18n` checks what the types cannot, and throws one named error the first time it runs. See [Error Handling](#error-handling).

## API Reference

### `@faber-eng/i18n`

#### `defineI18n(config)`

```ts
function defineI18n(config: {
	locales: Record<L, { htmlLang: string; ogLocale: string; prefix?: string }>;
	defaultLocale: L;
	pages: Record<P, Record<L, `/${string}`>>;
	messages: Record<L, Messages>; // every locale matches the default locale's shape
}): I18n<L, P, Messages>;
```

`L`, `P` and `Messages` are inferred. You never write them.

#### The instance

| Member | Returns | Notes |
| --- | --- | --- |
| `locales` | `readonly L[]` | In config order. |
| `defaultLocale` | `L` | |
| `pages` | `readonly P[]` | In config order. |
| `isLocale(value)` | `value is L` | Narrows a `string` to a locale. |
| `localeFromPathname(pathname)` | `L` | Ignores query and hash. No match gives the default locale. |
| `pageFromPathname(pathname)` | `P` | Uses the slug table of the detected locale. No match gives the root page. |
| `pathForPage(page, locale)` | `string` | `"/en/about"`. |
| `pathForLocale(locale)` | `string` | The locale's home: `"/"` or `"/en"`. |
| `htmlLang(locale)` | `string` | The `htmlLang` you configured. |
| `ogLocale(locale)` | `string` | The `ogLocale` you configured. |
| `messages(locale)` | `Messages` | The locale's message object. |

#### Type helpers

| Type | Meaning |
| --- | --- |
| `LocaleOf<typeof i18n>` | Union of the locale names. |
| `PageOf<typeof i18n>` | Union of the page names. |
| `MessagesOf<typeof i18n>` | The message type, taken from the default locale. |
| `Messages<typeof defaultMessages>` | Annotation for a non-default locale file. It makes extra keys a compile error. |

### `@faber-eng/i18n/react`

```ts
const { LocaleProvider, useLocale } = createI18nReact(i18n);
```

| Member | Notes |
| --- | --- |
| `LocaleProvider` | Props `{ locale, children }`. The context holds only the locale. |
| `useLocale()` | Returns `{ locale, t }`. Outside a provider it returns the default locale. |

`createI18nReact` uses the React 19 `<Context value>` form.

### `@faber-eng/i18n/seo`

| Function | Returns |
| --- | --- |
| `alternateLinks(i18n, siteUrl, page)` | `{ rel: "alternate", hrefLang, href }[]`, one per locale plus `x-default`. |
| `canonicalLink(i18n, siteUrl, page, locale)` | `{ rel: "canonical", href }`. |
| `sitemapXml(i18n, siteUrl, options?)` | The sitemap XML string. `options`: `changefreq` (default `"weekly"`), `priority` (default `"1.0"`). |
| `robotsTxt(indexable, siteUrl, crawlers?)` | `robots.txt` text. `crawlers` is an optional list of extra user agents to allow. |
| `robotsDirective(indexable)` | `"index, follow, max-image-preview:large"` or `"noindex, nofollow"`. |
| `hreflangFor(i18n, locale)` | The locale's `htmlLang`. |
| `stripTrailingSlash(url)` | `url` without trailing slashes. |

`siteUrl` has no trailing slash. When `indexable` is `false`, `robotsTxt` returns `User-agent: *\nDisallow: /\n`.

### `@faber-eng/i18n/testing`

| Function | Notes |
| --- | --- |
| `expectSameShape(messages, defaultLocale)` | Fails if a locale has different keys or array lengths than the default locale, or has an `undefined` or empty-string leaf, or has an empty object where the default does not. |
| `shapeSignature(value)` | The list of key paths the check compares. |

## Usage Examples

### A TanStack Start site, step by step

The router parts (steps 5, 7 and 9) are TanStack-specific. Everything else works with any React app, and the `.` and `./seo` entry points work without React.

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

#### 1. Install

```sh
bun add @faber-eng/i18n
```

#### 2. Write the messages

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

#### 3. Define the instance

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

#### 4. Create the React bindings (skip if you do not use React)

```ts
// src/i18n/react.ts
import { createI18nReact } from "@faber-eng/i18n/react";
import { i18n } from "#/i18n";

export const { LocaleProvider, useLocale } = createI18nReact(i18n);
```

`useLocale()` returns `{ locale, t }`. `t` is typed from your default-locale messages, so `t.nav.home` autocompletes and `t.nope` fails to compile.

#### 5. Add one route file per page and locale

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

#### 6. Build `pageHead` in your app

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

`pageHead("about")` without a locale and `pageHead("nope", "en")` are compile errors. That is on purpose. See [The root head has no locale](#the-root-head-has-no-locale) under Gotchas.

#### 7. Set `<html lang>` in the root, and nothing else that depends on the locale

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

#### 8. Add a language switch

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

#### 9. Serve `sitemap.xml` and `robots.txt`

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

#### 10. Write the tests

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

#### Add a page

1. Add the page to `pages` in `src/i18n/index.ts`, with a slug for every locale. The compiler stops you if a locale is missing.
2. Add its `seo` entry and any text to `id.ts` and to every other locale file.
3. Add one route file per locale, and call `pageHead(page, locale)` in each.
4. Run the tests.

#### Add a locale

1. Add it to `locales` with its `htmlLang` and `ogLocale`. Add a `prefix` if the default `/<locale>` is wrong.
2. Add a slug for it to every page in `pages`.
3. Create its messages file, annotated with `Messages<typeof id>`, and add it to `messages`.
4. Create the route folder (`src/routes/<locale>/`) with one file per page.
5. Run the tests. `localeFromPathname` and `pageFromPathname` pick it up from the config.

#### Move an existing hand-written setup to this package

1. Keep the old output as a baseline: save `/sitemap.xml`, `/robots.txt` and the `<head>` of each page from the running site.
2. Replace the old locale and slug code with `defineI18n`. Keep your old exported names as type aliases (`TLocale`, `TPage`) to avoid editing every import at once.
3. Replace the hreflang, sitemap and robots code with the `./seo` helpers. Pass your own `changefreq`, `priority` and crawler list so the output stays the same.
4. Run the site again and diff the new output against the baseline. The diff must be empty.
5. Delete the old code.

`pageFromPathname` now reads the slug table of the detected locale. If your old code compared every locale against the default locale's slugs, a page like `/en/about` may have resolved to the wrong page before. The new result is the correct one.

### Other frameworks

The core (`.`) and `./seo` are plain functions. They need no React and no router, so they work in any server or build script. A minimal handler, written for the web-standard `Request` and `Response`:

```ts
import { sitemapXml } from "@faber-eng/i18n/seo";
import { i18n } from "./i18n";

export function handle(request: Request): Response {
	const { pathname } = new URL(request.url);

	if (pathname === "/sitemap.xml") {
		return new Response(sitemapXml(i18n, "https://example.com"), {
			headers: { "content-type": "application/xml; charset=utf-8" },
		});
	}

	const locale = i18n.localeFromPathname(pathname);
	const page = i18n.pageFromPathname(pathname);
	return new Response(`${page} in ${locale}`);
}
```

This was compiled, but not run in a specific framework. Routing, rendering and head management are yours.

## What Is Checked, and When

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

## Gotchas

### The root head has no locale

`locale` is a required argument in every helper. None of them falls back to the default locale, because a silent fallback hides the bug below.

In TanStack Router, `createRootRouteWithContext().head()` runs once, with no route match and no pathname, so it cannot know the locale. A head built there with the default locale ships default-locale strings on every page. In one site, `/en` served an English `<meta name="description">` next to Indonesian structured-data descriptions, and no test failed. The root component can read the locale (it can call `useRouterState`), which is why `<html lang>` was right while the head was wrong.

Build everything that varies by locale (meta, canonical, hreflang, structured data, share images) in a per-page head function that the route calls with its locale. Keep only locale-free tags in the root head. A test that asserts the English page carries English strings catches this; a test that only checks a tag exists does not.

### Other things that surprise people

- **Annotate non-default locale files.** Without `Messages<typeof id>` on `en.ts`, an extra key in `en` compiles. Use the annotation, and run `expectSameShape` as a second guard.
- **`siteUrl` has no trailing slash.** Pass `stripTrailingSlash(url)` if it can have one. Otherwise canonical and sitemap URLs get a double slash.
- **A slug belongs to one locale.** `/about` is the English slug in the example. On the default locale it is an unknown segment and gives the home page, not `about`.
- **Keep the config inline.** If `locales` is typed as a widened `Record<string, …>`, the page and locale checks collapse to `string`.
- **The package does not make routes.** Your router needs one file per page and locale. Test that they match the slug table, as in step 10.

## Error Handling

`defineI18n` throws an `Error` with a message that starts with `i18n:`. It throws the first time it runs, which is at module load for the usual setup, so a bad config never reaches a request.

| Cause | Message |
| --- | --- |
| A prefix does not start with `/` or ends with `/` | `i18n: prefix "<prefix>" of locale "<locale>" must start with "/" and not end with "/"` |
| Two locales have equal or nested prefixes | `i18n: prefix "<a>" of locale "<l1>" conflicts with prefix "<b>" of locale "<l2>"` |
| A slug does not start with `/`, ends with `/`, or contains `//` | `i18n: slug "<slug>" of page "<page>" in locale "<locale>" must start with "/", not end with "/" and not contain "//"` |
| Two pages share a slug in one locale | `i18n: duplicate slug "<slug>" in locale "<locale>" (pages "<p1>" and "<p2>")` |
| No page has the slug `/` in the default locale | `i18n: no root page: one page must use the slug "/" in the default locale` |

Lookups at runtime do not throw for unknown input. An unknown pathname segment gives the root page, and an unknown locale prefix gives the default locale.

## Testing

The package has 67 tests in five files, run with Vitest:

| File | What it covers |
| --- | --- |
| `tests/core.test.ts` | Paths, prefixes, slug and prefix validation, locale and page detection (including the cases in the table under [From a URL to (locale, page)](#from-a-url-to-locale-page)), `isLocale`, `htmlLang`, `ogLocale`. |
| `tests/seo.test.ts` | hreflang with `x-default`, canonical links, sitemap golden output, XML escaping, robots output, and a check that `src/seo.ts` and `src/core.ts` import no React. |
| `tests/react.test.tsx` | Provider and hook, the default locale outside a provider, different locales giving different strings. |
| `tests/testing.test.ts` | `expectSameShape` passing on equal shapes and failing on each kind of difference. |
| `tests/types.test-d.ts` | Type-level tests: each mistake in [What Is Checked](#what-is-checked-and-when) that should fail to compile does, and the inferred types are the exact unions. |

```sh
bun run test        # vitest run --typecheck
bun run typecheck   # tsc --noEmit
bun run check       # biome check
bun run build       # tsdown
```

## Contributing

1. Branch from `main`: `git checkout -b feat/<short-description>`.
2. Write the failing test first, then the code.
3. Run `bun run check`, `bun run typecheck`, `bun run test` and `bun run build`. All four must pass.
4. Use conventional commits (`feat(core): …`, `fix(seo): …`).
5. Open a pull request against `main`.

`MEMORY.md` records why the package works the way it does. Add an entry when you make a decision a later reader would otherwise question.

## Publishing

`prepublishOnly` runs the tests and the build. The package is published to npmjs as public and scoped (`publishConfig.access: public`). Files shipped: `dist`, `README.md`, `LICENSE`.

## Scripts

`bun run test`, `bun run typecheck`, `bun run lint`, `bun run check`, `bun run build`, `bun run dev`.

## License

MIT

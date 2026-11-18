# @faber-eng/i18n

Type-safe i18n for Faber sites: locales, per-locale page slugs, hreflang and sitemap helpers, and a typed React provider. ESM only, no runtime dependencies.

## Install

```sh
bun add @faber-eng/i18n
```

`react` (^19) is an optional peer, needed only by `@faber-eng/i18n/react`. `vitest` is an optional peer, needed only by `@faber-eng/i18n/testing`. TypeScript 5.4 or newer is required (the types use `NoInfer`).

## Define your site

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

## Entry points

### `@faber-eng/i18n`

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

### `@faber-eng/i18n/react`

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

### `@faber-eng/i18n/seo`

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

### `@faber-eng/i18n/testing`

```ts
import { expectSameShape } from "@faber-eng/i18n/testing";

it("every locale has the default locale's shape", () => {
	expectSameShape({ id, en }, "id");
});
```

`expectSameShape(messages, defaultLocale)` checks that every locale has the same keys and array lengths as the default locale, and that no leaf is `undefined` or an empty string. `shapeSignature(value)` returns the list of key paths it compares.

## What is checked, and when

| Rule | Compile time | Runtime |
| --- | --- | --- |
| A page or locale argument is one of the configured values | yes | no |
| Every page has a slug for every locale | yes | no |
| A slug starts with `/` | yes | `defineI18n` throws at startup |
| A slug other than `/` does not end with `/` and has no `//` | no | `defineI18n` throws at startup |
| `defaultLocale` is one of the locales | yes | no |
| A locale is missing a key that the default locale has | yes (in `defineI18n` and with `Messages<typeof default>`) | `expectSameShape` |
| A locale has a key the default locale lacks | with `Messages<typeof default>` on that locale's file; `defineI18n` does not catch it | `expectSameShape` |
| A leaf has the wrong type, such as `string[]` for `string` | yes | no |
| Array lengths match | no | `expectSameShape` |
| Two pages share a slug in one locale | no | `defineI18n` throws at startup |
| A page uses the slug `/` in the default locale | no | `defineI18n` throws at startup |
| A prefix starts with `/` and does not end with `/` | no | `defineI18n` throws at startup |
| Two locales have equal or nested prefixes, such as `/en` and `/en/gb` (`/en` and `/enx` are fine) | no | `defineI18n` throws at startup |
| An empty object `{}` is present in one locale and not the other | no | `expectSameShape` |
| A leaf is an empty string | no | `expectSameShape` |
| A pathname segment is unknown | no | `pageFromPathname` falls back to the `/` page |
| A route file exists for each page and locale | no | no (your router decides) |

Annotate each non-default locale file with `Messages<typeof default>`, as in the example. Without the annotation a locale with an extra key passes the compiler.

## Gotcha: the root head has no locale

`locale` is a required argument in every helper. None of them falls back to the default locale, because a silent fallback hides the bug below.

In TanStack Router, `createRootRouteWithContext().head()` runs once, with no route match and no pathname, so it cannot know the locale. A head built there with the default locale ships default-locale strings on every page. In one site, `/en` served an English `<meta name="description">` next to Indonesian structured-data descriptions, and no test failed. The root component can read the locale (it can call `useRouterState`), which is why `<html lang>` was right while the head was wrong.

Build everything that varies by locale (meta, canonical, hreflang, structured data, share images) in a per-page head function that the route calls with its locale. Keep only locale-free tags in the root head. A test that asserts the English page carries English strings catches this; a test that only checks a tag exists does not.

## Publishing

`prepublishOnly` runs the tests and the build. The package is published to npmjs as public and scoped (`publishConfig.access: public`). Files shipped: `dist`, `README.md`, `LICENSE`.

## Scripts

`bun run test`, `bun run typecheck`, `bun run lint`, `bun run check`, `bun run build`, `bun run dev`.

## License

MIT

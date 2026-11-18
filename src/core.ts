export interface LocaleMeta {
	htmlLang: string;
	ogLocale: string;
	prefix?: string;
}

type Slug = `/${string}`;

export interface I18nConfig<
	L extends string,
	P extends string,
	D extends L,
	Ms extends Record<L, object>,
> {
	locales: Record<L, LocaleMeta>;
	defaultLocale: D;
	pages: Record<P, Record<NoInfer<L>, Slug>>;
	messages: Ms & Record<NoInfer<L>, NoInfer<Ms>[NoInfer<D>]>;
}

export interface I18n<L extends string, P extends string, M extends object> {
	locales: readonly L[];
	defaultLocale: L;
	pages: readonly P[];
	isLocale(value: string): value is L;
	localeFromPathname(pathname: string): L;
	pageFromPathname(pathname: string): P;
	pathForPage(page: P, locale: L): string;
	pathForLocale(locale: L): string;
	htmlLang(locale: L): string;
	ogLocale(locale: L): string;
	messages(locale: L): M;
}

export type LocaleOf<I> = I extends { locales: readonly (infer L)[] }
	? L
	: never;
export type PageOf<I> = I extends { pages: readonly (infer P)[] } ? P : never;
export type MessagesOf<I> = I extends { messages(locale: never): infer M }
	? M
	: never;
export type Messages<D extends object> = D;

function keysOf<K extends string>(record: Record<K, unknown>): K[] {
	return Object.keys(record) as K[];
}

function stripQueryAndHash(pathname: string): string {
	const end = pathname.search(/[?#]/);
	return end === -1 ? pathname : pathname.slice(0, end);
}

function stripTrailingSlashes(path: string): string {
	return path.replace(/\/+$/, "");
}

function prefixOf(locale: string, meta: LocaleMeta): string {
	const prefix = meta.prefix ?? `/${locale}`;
	if (!prefix.startsWith("/") || prefix.endsWith("/")) {
		throw new Error(
			`i18n: prefix "${prefix}" of locale "${locale}" must start with "/" and not end with "/"`,
		);
	}
	return prefix;
}

function assertValidSlug(slug: string, page: string, locale: string): void {
	if (slug === "/") return;
	const valid =
		slug.startsWith("/") && !slug.endsWith("/") && !slug.includes("//");
	if (!valid) {
		throw new Error(
			`i18n: slug "${slug}" of page "${page}" in locale "${locale}" must start with "/", not end with "/" and not contain "//"`,
		);
	}
}

function joinPath(prefix: string, slug: string): string {
	if (slug === "/") return prefix === "" ? "/" : prefix;
	return `${prefix}${slug}`;
}

export function defineI18n<
	const L extends string,
	const P extends string,
	const D extends L,
	Ms extends Record<L, object>,
>(config: I18nConfig<L, P, D, Ms>): I18n<L, P, Ms[D]> {
	const locales = keysOf(config.locales);
	const pages = keysOf(config.pages);
	const defaultLocale: L = config.defaultLocale;
	const messages: Record<L, Ms[D]> = config.messages;

	const prefixes = new Map<L, string>();
	for (const locale of locales) {
		const isDefault = locale === defaultLocale;
		prefixes.set(
			locale,
			isDefault ? "" : prefixOf(locale, config.locales[locale]),
		);
	}

	function prefixFor(locale: L): string {
		const prefix = prefixes.get(locale);
		if (prefix === undefined)
			throw new Error(`i18n: unknown locale "${locale}"`);
		return prefix;
	}

	const pathByPage = new Map<string, string>();
	const pageBySlug = new Map<L, Map<string, P>>();
	for (const locale of locales) {
		const slugs = new Map<string, P>();
		for (const page of pages) {
			const slug = config.pages[page][locale];
			assertValidSlug(slug, page, locale);
			const taken = slugs.get(slug);
			if (taken !== undefined) {
				throw new Error(
					`i18n: duplicate slug "${slug}" in locale "${locale}" (pages "${taken}" and "${page}")`,
				);
			}
			slugs.set(slug, page);
			pathByPage.set(`${locale}:${page}`, joinPath(prefixFor(locale), slug));
		}
		pageBySlug.set(locale, slugs);
	}

	const foundRoot = pageBySlug.get(defaultLocale)?.get("/");
	if (foundRoot === undefined) {
		throw new Error(
			`i18n: no root page: one page must use the slug "/" in the default locale`,
		);
	}
	const rootPage: P = foundRoot;

	function isLocale(value: string): value is L {
		return (locales as readonly string[]).includes(value);
	}

	function matchesPrefix(path: string, prefix: string): boolean {
		return path === prefix || path.startsWith(`${prefix}/`);
	}

	function localeFromPathname(pathname: string): L {
		const path = stripQueryAndHash(pathname);
		for (const locale of locales) {
			const prefix = prefixFor(locale);
			if (prefix !== "" && matchesPrefix(path, prefix)) return locale;
		}
		return defaultLocale;
	}

	function pageFromPathname(pathname: string): P {
		const locale = localeFromPathname(pathname);
		const path = stripQueryAndHash(pathname);
		const rest = stripTrailingSlashes(path.slice(prefixFor(locale).length));
		const slug = rest === "" ? "/" : rest;
		return pageBySlug.get(locale)?.get(slug) ?? rootPage;
	}

	function pathForPage(page: P, locale: L): string {
		const path = pathByPage.get(`${locale}:${page}`);
		if (path === undefined) {
			throw new Error(`i18n: no path for page "${page}" in locale "${locale}"`);
		}
		return path;
	}

	return {
		locales,
		defaultLocale,
		pages,
		isLocale,
		localeFromPathname,
		pageFromPathname,
		pathForPage,
		pathForLocale: (locale) => joinPath(prefixFor(locale), "/"),
		htmlLang: (locale) => config.locales[locale].htmlLang,
		ogLocale: (locale) => config.locales[locale].ogLocale,
		messages: (locale) => messages[locale],
	};
}

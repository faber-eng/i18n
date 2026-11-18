import type { I18n } from "./core";

export interface LinkTag {
	rel: string;
	href: string;
	hrefLang?: string;
}

export interface SitemapOptions {
	changefreq?: string;
	priority?: string;
}

type SeoSource<L extends string, P extends string> = Pick<
	I18n<L, P, object>,
	"locales" | "defaultLocale" | "pages" | "pathForPage" | "htmlLang"
>;

export function stripTrailingSlash(url: string): string {
	return url.replace(/\/+$/, "");
}

export function robotsDirective(indexable: boolean): string {
	if (indexable) return "index, follow, max-image-preview:large";
	return "noindex, nofollow";
}

export function robotsTxt(
	indexable: boolean,
	siteUrl: string,
	crawlers: readonly string[] = [],
): string {
	if (!indexable) return "User-agent: *\nDisallow: /\n";

	const groups = ["User-agent: *", "Allow: /"];
	for (const crawler of crawlers) {
		groups.push("", `User-agent: ${crawler}`, "Allow: /");
	}
	groups.push("", `Sitemap: ${siteUrl}/sitemap.xml`, "");

	return groups.join("\n");
}

export function hreflangFor<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	locale: L,
): string {
	return i18n.htmlLang(locale);
}

function pageUrl<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	page: P,
	locale: L,
): string {
	return `${siteUrl}${i18n.pathForPage(page, locale)}`;
}

export function canonicalLink<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	page: P,
	locale: L,
): LinkTag {
	return { rel: "canonical", href: pageUrl(i18n, siteUrl, page, locale) };
}

export function alternateLinks<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	page: P,
): LinkTag[] {
	const links: LinkTag[] = i18n.locales.map((locale) => ({
		rel: "alternate",
		hrefLang: hreflangFor(i18n, locale),
		href: pageUrl(i18n, siteUrl, page, locale),
	}));
	links.push({
		rel: "alternate",
		hrefLang: "x-default",
		href: pageUrl(i18n, siteUrl, page, i18n.defaultLocale),
	});
	return links;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function sitemapAlternates<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	page: P,
): string {
	return alternateLinks(i18n, siteUrl, page)
		.map(
			(link) =>
				`\t\t<xhtml:link rel="alternate" hreflang="${escapeXml(link.hrefLang ?? "")}" href="${escapeXml(link.href)}" />`,
		)
		.join("\n");
}

function sitemapEntry<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	page: P,
	locale: L,
	options: Required<SitemapOptions>,
): string {
	return `\t<url>
\t\t<loc>${escapeXml(pageUrl(i18n, siteUrl, page, locale))}</loc>
${sitemapAlternates(i18n, siteUrl, page)}
\t\t<changefreq>${options.changefreq}</changefreq>
\t\t<priority>${options.priority}</priority>
\t</url>`;
}

export function sitemapXml<L extends string, P extends string>(
	i18n: SeoSource<L, P>,
	siteUrl: string,
	options: SitemapOptions = {},
): string {
	const resolved = {
		changefreq: options.changefreq ?? "weekly",
		priority: options.priority ?? "1.0",
	};
	const entries = i18n.pages.flatMap((page) =>
		i18n.locales.map((locale) =>
			sitemapEntry(i18n, siteUrl, page, locale, resolved),
		),
	);

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

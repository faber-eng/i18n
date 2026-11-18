import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	alternateLinks,
	canonicalLink,
	hreflangFor,
	robotsDirective,
	robotsTxt,
	sitemapXml,
	stripTrailingSlash,
} from "../src/seo";
import { i18n } from "./fixtures/app";

const SITE = "https://example.com";

describe("alternateLinks", () => {
	it("has one entry per locale plus x-default at the default-locale URL", () => {
		expect(alternateLinks(i18n, SITE, "about")).toEqual([
			{
				rel: "alternate",
				hrefLang: "id",
				href: "https://example.com/tentang-kami",
			},
			{
				rel: "alternate",
				hrefLang: "en",
				href: "https://example.com/en/about",
			},
			{
				rel: "alternate",
				hrefLang: "x-default",
				href: "https://example.com/tentang-kami",
			},
		]);
	});
});

describe("canonicalLink", () => {
	it("points at the page URL of the given locale", () => {
		expect(canonicalLink(i18n, SITE, "home", "en")).toEqual({
			rel: "canonical",
			href: "https://example.com/en",
		});
		expect(canonicalLink(i18n, SITE, "home", "id")).toEqual({
			rel: "canonical",
			href: "https://example.com/",
		});
	});
});

describe("hreflangFor", () => {
	it("returns the html lang of the locale", () => {
		expect(hreflangFor(i18n, "en")).toBe("en");
	});
});

describe("sitemapXml", () => {
	const xml = sitemapXml(i18n, SITE);

	it("has one <url> per page and locale, each with every alternate", () => {
		expect(xml.match(/<url>/g)).toHaveLength(6);
		expect(xml.match(/<xhtml:link /g)).toHaveLength(18);
	});

	it("matches the golden output", () => {
		expect(xml).toBe(GOLDEN_SITEMAP);
	});

	it("escapes XML special characters in loc and href values", () => {
		const escaped = sitemapXml(i18n, "https://example.com/?a=1&b=2");
		expect(escaped).toContain("<loc>https://example.com/?a=1&amp;b=2/</loc>");
		expect(escaped).toContain('href="https://example.com/?a=1&amp;b=2/en"');
		expect(escaped).not.toMatch(/&(?!amp;)/);
	});

	it("takes changefreq and priority from the options", () => {
		const custom = sitemapXml(i18n, SITE, {
			changefreq: "daily",
			priority: "0.8",
		});
		expect(custom).toContain("<changefreq>daily</changefreq>");
		expect(custom).toContain("<priority>0.8</priority>");
		expect(custom).not.toContain("weekly");
	});
});

describe("robotsTxt", () => {
	it("disallows everything when not indexable", () => {
		expect(robotsTxt(false, SITE)).toBe("User-agent: *\nDisallow: /\n");
	});

	it("allows everything and names the sitemap when indexable", () => {
		expect(robotsTxt(true, SITE)).toBe(
			"User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n",
		);
	});

	it("adds one group per listed crawler", () => {
		expect(robotsTxt(true, SITE, ["GPTBot"])).toBe(
			"User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n",
		);
	});
});

describe("robotsDirective", () => {
	it("returns the robots meta content", () => {
		expect(robotsDirective(true)).toBe(
			"index, follow, max-image-preview:large",
		);
		expect(robotsDirective(false)).toBe("noindex, nofollow");
	});
});

describe("stripTrailingSlash", () => {
	it("removes every trailing slash", () => {
		expect(stripTrailingSlash("")).toBe("");
		expect(stripTrailingSlash("/")).toBe("");
		expect(stripTrailingSlash("a//")).toBe("a");
		expect(stripTrailingSlash("https://example.com/")).toBe(
			"https://example.com",
		);
		expect(stripTrailingSlash("a/b")).toBe("a/b");
	});
});

describe("framework-free entry", () => {
	function importSpecifiers(source: string): string[] {
		const pattern = /(?:from|import)\s+["']([^"']+)["']/g;
		return [...source.matchAll(pattern)].map((match) => match[1] ?? "");
	}

	function collectImports(file: string, seen: Set<string>): string[] {
		const found: string[] = [];
		for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
			found.push(specifier);
			if (!specifier.startsWith(".")) continue;
			const next = resolve(dirname(file), `${specifier}.ts`);
			if (seen.has(next)) continue;
			seen.add(next);
			found.push(...collectImports(next, seen));
		}
		return found;
	}

	it("does not import react from src/seo.ts or src/core.ts", () => {
		for (const entry of ["../src/seo.ts", "../src/core.ts"]) {
			const file = resolve(import.meta.dirname, entry);
			const imports = collectImports(file, new Set([file]));
			expect(imports.filter((name) => name.startsWith("react"))).toEqual([]);
		}
	});
});

const GOLDEN_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
\t<url>
\t\t<loc>https://example.com/</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://example.com/en</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://example.com/faq</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/faq" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/faq" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/faq" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://example.com/en/faq</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/faq" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/faq" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/faq" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://example.com/tentang-kami</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/tentang-kami" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/about" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/tentang-kami" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://example.com/en/about</loc>
\t\t<xhtml:link rel="alternate" hreflang="id" href="https://example.com/tentang-kami" />
\t\t<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/about" />
\t\t<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/tentang-kami" />
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
</urlset>
`;

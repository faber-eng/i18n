import { describe, expect, it } from "vitest";
import { defineI18n } from "../src/core";
import { en, i18n, id } from "./fixtures/app";

const locales = {
	id: { htmlLang: "id", ogLocale: "id_ID" },
	en: { htmlLang: "en", ogLocale: "en_US" },
};

describe("defineI18n", () => {
	it("throws on a duplicate slug within one locale", () => {
		expect(() =>
			defineI18n({
				locales,
				defaultLocale: "id",
				pages: {
					home: { id: "/", en: "/" },
					faq: { id: "/faq", en: "/faq" },
					help: { id: "/bantuan", en: "/faq" },
				},
				messages: { id, en },
			}),
		).toThrow(/duplicate slug "\/faq".*"en"/);
	});

	it("allows the same slug in different locales", () => {
		expect(i18n.pathForPage("faq", "id")).toBe("/faq");
		expect(i18n.pathForPage("faq", "en")).toBe("/en/faq");
	});

	it("throws when no page has the root slug", () => {
		expect(() =>
			defineI18n({
				locales,
				defaultLocale: "id",
				pages: { faq: { id: "/faq", en: "/faq" } },
				messages: { id, en },
			}),
		).toThrow(/root page/);
	});

	it("throws on a prefix that does not start with a slash", () => {
		expect(() =>
			defineI18n({
				locales: { ...locales, en: { ...locales.en, prefix: "en" } },
				defaultLocale: "id",
				pages: { home: { id: "/", en: "/" } },
				messages: { id, en },
			}),
		).toThrow(/prefix/);
	});

	it("exposes locales, default locale and pages", () => {
		expect(i18n.locales).toEqual(["id", "en"]);
		expect(i18n.defaultLocale).toBe("id");
		expect(i18n.pages).toEqual(["home", "faq", "about"]);
	});

	it("returns the messages of a locale", () => {
		expect(i18n.messages("en").nav.about).toBe("About us");
		expect(i18n.messages("id").nav.about).toBe("Tentang kami");
	});
});

describe("pathForPage", () => {
	it("leaves the default locale unprefixed", () => {
		expect(i18n.pathForPage("home", "id")).toBe("/");
		expect(i18n.pathForPage("about", "id")).toBe("/tentang-kami");
	});

	it("prefixes other locales and never leaves a trailing slash on home", () => {
		expect(i18n.pathForPage("home", "en")).toBe("/en");
		expect(i18n.pathForPage("about", "en")).toBe("/en/about");
	});

	it("uses a custom prefix when the locale sets one", () => {
		const custom = defineI18n({
			locales: { ...locales, en: { ...locales.en, prefix: "/english" } },
			defaultLocale: "id",
			pages: {
				home: { id: "/", en: "/" },
				about: { id: "/tentang-kami", en: "/about" },
			},
			messages: { id, en },
		});
		expect(custom.pathForPage("home", "en")).toBe("/english");
		expect(custom.pathForPage("about", "en")).toBe("/english/about");
		expect(custom.localeFromPathname("/english/about")).toBe("en");
		expect(custom.localeFromPathname("/en/about")).toBe("id");
	});
});

describe("pathForLocale", () => {
	it("returns the home path of the locale", () => {
		expect(i18n.pathForLocale("id")).toBe("/");
		expect(i18n.pathForLocale("en")).toBe("/en");
	});
});

describe("localeFromPathname", () => {
	it("detects a prefixed locale", () => {
		expect(i18n.localeFromPathname("/en/faq")).toBe("en");
		expect(i18n.localeFromPathname("/en")).toBe("en");
		expect(i18n.localeFromPathname("/en/")).toBe("en");
	});

	it("falls back to the default locale", () => {
		expect(i18n.localeFromPathname("/")).toBe("id");
		expect(i18n.localeFromPathname("/faq")).toBe("id");
		expect(i18n.localeFromPathname("/enx")).toBe("id");
		expect(i18n.localeFromPathname("/enx/en")).toBe("id");
	});

	it("ignores the query string and hash", () => {
		expect(i18n.localeFromPathname("/en?x=1")).toBe("en");
		expect(i18n.localeFromPathname("/en#top")).toBe("en");
	});
});

describe("pageFromPathname", () => {
	it("reads the slug of the detected locale", () => {
		expect(i18n.pageFromPathname("/en/about")).toBe("about");
		expect(i18n.pageFromPathname("/tentang-kami")).toBe("about");
		expect(i18n.pageFromPathname("/en/faq")).toBe("faq");
		expect(i18n.pageFromPathname("/faq")).toBe("faq");
	});

	it("does not match a slug of another locale", () => {
		expect(i18n.pageFromPathname("/about")).toBe("home");
		expect(i18n.pageFromPathname("/en/tentang-kami")).toBe("home");
	});

	it("returns home for the root of each locale", () => {
		expect(i18n.pageFromPathname("/")).toBe("home");
		expect(i18n.pageFromPathname("/en")).toBe("home");
		expect(i18n.pageFromPathname("")).toBe("home");
	});

	it("falls back to home for an unknown segment", () => {
		expect(i18n.pageFromPathname("/nope")).toBe("home");
		expect(i18n.pageFromPathname("/en/nope")).toBe("home");
		expect(i18n.pageFromPathname("/faq/nope")).toBe("home");
	});

	it("ignores a trailing slash and the query string", () => {
		expect(i18n.pageFromPathname("/en/about/")).toBe("about");
		expect(i18n.pageFromPathname("/tentang-kami/")).toBe("about");
		expect(i18n.pageFromPathname("/en/about?ref=nav")).toBe("about");
		expect(i18n.pageFromPathname("/faq#top")).toBe("faq");
		expect(i18n.pageFromPathname("/en/?x=1")).toBe("home");
	});
});

describe("isLocale", () => {
	it("accepts configured locales only", () => {
		expect(i18n.isLocale("en")).toBe(true);
		expect(i18n.isLocale("id")).toBe(true);
		expect(i18n.isLocale("")).toBe(false);
		expect(i18n.isLocale("fr")).toBe(false);
	});
});

describe("locale metadata", () => {
	it("returns the configured htmlLang and ogLocale", () => {
		expect(i18n.htmlLang("id")).toBe("id");
		expect(i18n.htmlLang("en")).toBe("en");
		expect(i18n.ogLocale("id")).toBe("id_ID");
		expect(i18n.ogLocale("en")).toBe("en_US");
	});
});

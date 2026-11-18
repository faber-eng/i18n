import { describe, expectTypeOf, it } from "vitest";
import {
	defineI18n,
	type LocaleOf,
	type Messages,
	type MessagesOf,
	type PageOf,
} from "../src/core";
import { createI18nReact } from "../src/react";
import { en, i18n, id } from "./fixtures/app";

const locales = {
	id: { htmlLang: "id", ogLocale: "id_ID" },
	en: { htmlLang: "en", ogLocale: "en_US" },
};
const pages = { home: { id: "/", en: "/" } } as const;

describe("defineI18n config", () => {
	it("rejects a locale missing a key", () => {
		defineI18n({
			locales,
			defaultLocale: "id",
			pages,
			messages: {
				id,
				// @ts-expect-error title is missing
				en: { nav: { home: "x", about: "x" }, faq: { items: ["x"] } },
			},
		});
	});

	it("rejects an extra key in a file annotated with Messages", () => {
		const extra: Messages<typeof id> = {
			...en,
			// @ts-expect-error extra is not in the default locale
			extra: "x",
		};
		expectTypeOf(extra).toEqualTypeOf<typeof id>();
	});

	it("rejects string[] where string is expected", () => {
		defineI18n({
			locales,
			defaultLocale: "id",
			pages,
			messages: {
				id,
				// @ts-expect-error title must be a string
				en: { ...en, title: ["x"] },
			},
		});
	});

	it("rejects a slug map missing a locale", () => {
		defineI18n({
			locales,
			defaultLocale: "id",
			// @ts-expect-error en slug is missing
			pages: { home: { id: "/" } },
			messages: { id, en },
		});
	});

	it("rejects a slug that does not start with a slash", () => {
		defineI18n({
			locales,
			defaultLocale: "id",
			// @ts-expect-error slug must start with /
			pages: { home: { id: "/", en: "about" } },
			messages: { id, en },
		});
	});

	it("rejects a default locale that is not in locales", () => {
		defineI18n({
			locales,
			// @ts-expect-error fr is not a configured locale
			defaultLocale: "fr",
			pages,
			messages: { id, en },
		});
	});
});

describe("instance types", () => {
	it("rejects unknown pages and locales", () => {
		// @ts-expect-error nope is not a page
		i18n.pathForPage("nope", "id");
		// @ts-expect-error fr is not a locale
		i18n.pathForPage("home", "fr");
		// @ts-expect-error locale is required
		i18n.pathForPage("home");
		// @ts-expect-error fr is not a locale
		i18n.messages("fr");
	});

	it("resolves exact literal unions", () => {
		expectTypeOf<LocaleOf<typeof i18n>>().toEqualTypeOf<"id" | "en">();
		expectTypeOf<PageOf<typeof i18n>>().toEqualTypeOf<
			"home" | "faq" | "about"
		>();
		expectTypeOf<MessagesOf<typeof i18n>>().toEqualTypeOf<typeof id>();
	});

	it("narrows with isLocale and returns typed messages", () => {
		expectTypeOf(i18n.messages("en")).toEqualTypeOf<typeof id>();
		expectTypeOf(i18n.localeFromPathname("/")).toEqualTypeOf<"id" | "en">();
		expectTypeOf(i18n.pageFromPathname("/")).toEqualTypeOf<
			"home" | "faq" | "about"
		>();
	});
});

describe("react types", () => {
	const { useLocale } = createI18nReact(i18n);
	type T = ReturnType<typeof useLocale>["t"];

	it("types t from the instance", () => {
		const known = (t: T) => t.nav.about;
		expectTypeOf(known).returns.toBeString();
		// @ts-expect-error nope is not a message key
		const unknown = (t: T) => t.nope;
		expectTypeOf(unknown).toBeFunction();
	});

	it("types locale as the locale union", () => {
		expectTypeOf<ReturnType<typeof useLocale>["locale"]>().toEqualTypeOf<
			"id" | "en"
		>();
	});
});

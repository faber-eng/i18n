import { describe, expect, it } from "vitest";
import { expectSameShape, shapeSignature } from "../src/testing";

const base = {
	title: "Fabrica",
	nav: { home: "Beranda" },
	faq: { items: ["Satu", "Dua"] },
};

describe("shapeSignature", () => {
	it("lists key paths, leaf types and array lengths", () => {
		expect(shapeSignature(base)).toEqual([
			".title:string",
			".nav.home:string",
			".faq.items[2]",
			".faq.items[0]:string",
			".faq.items[1]:string",
		]);
	});
});

describe("expectSameShape", () => {
	it("passes on equal shapes with different strings", () => {
		const en = {
			title: "Fabrica",
			nav: { home: "Home" },
			faq: { items: ["One", "Two"] },
		};
		expect(() => expectSameShape({ id: base, en }, "id")).not.toThrow();
	});

	it("fails on a missing key", () => {
		const en = { title: "Fabrica", faq: { items: ["One", "Two"] } };
		expect(() => expectSameShape({ id: base, en }, "id")).toThrow();
	});

	it("fails on a different array length", () => {
		const en = { ...base, faq: { items: ["One"] } };
		expect(() => expectSameShape({ id: base, en }, "id")).toThrow();
	});

	it("fails on an empty string", () => {
		const en = { ...base, title: "" };
		expect(() => expectSameShape({ id: base, en }, "id")).toThrow();
	});

	it("fails on an undefined leaf", () => {
		const en = { ...base, title: undefined };
		expect(() => expectSameShape({ id: base, en }, "id")).toThrow();
	});

	it("fails when the default locale itself has an empty string", () => {
		const id = { ...base, title: "" };
		expect(() => expectSameShape({ id, en: id }, "id")).toThrow();
	});

	it("fails when the default locale is not in the messages", () => {
		expect(() => expectSameShape({ id: base }, "en")).toThrow();
	});
});

describe("empty objects", () => {
	it("makes an empty-object leaf visible in the signature", () => {
		expect(shapeSignature({ a: {} })).not.toEqual(shapeSignature({}));
	});

	it("fails when one locale has an empty object the default lacks", () => {
		expect(() => expectSameShape({ id: {}, en: { a: {} } }, "id")).toThrow();
	});

	it("passes when both have the empty object", () => {
		expect(() =>
			expectSameShape({ id: { a: {} }, en: { a: {} } }, "id"),
		).not.toThrow();
	});
});

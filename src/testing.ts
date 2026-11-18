import { expect } from "vitest";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectShape(value: unknown, path: string, out: string[]): void {
	if (Array.isArray(value)) {
		out.push(`${path}[${value.length}]`);
		for (const [index, item] of value.entries()) {
			collectShape(item, `${path}[${index}]`, out);
		}
		return;
	}
	if (isRecord(value)) {
		const entries = Object.entries(value);
		if (entries.length === 0) out.push(`${path}{}`);
		for (const [key, child] of entries) {
			collectShape(child, `${path}.${key}`, out);
		}
		return;
	}
	out.push(`${path}:${value === null ? "null" : typeof value}`);
}

function collectEmptyLeaves(value: unknown, path: string, out: string[]): void {
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			collectEmptyLeaves(item, `${path}[${index}]`, out);
		}
		return;
	}
	if (isRecord(value)) {
		for (const [key, child] of Object.entries(value)) {
			collectEmptyLeaves(child, `${path}.${key}`, out);
		}
		return;
	}
	if (value === undefined || value === "") out.push(path);
}

export function shapeSignature(value: unknown): string[] {
	const out: string[] = [];
	collectShape(value, "", out);
	return out;
}

export function expectSameShape(
	messages: Record<string, unknown>,
	defaultLocale: string,
): void {
	const reference = messages[defaultLocale];
	expect(
		reference,
		`no messages for default locale "${defaultLocale}"`,
	).toBeDefined();
	const expected = shapeSignature(reference);

	for (const [locale, entry] of Object.entries(messages)) {
		expect(
			shapeSignature(entry),
			`${locale} differs from ${defaultLocale}`,
		).toEqual(expected);
		const empty: string[] = [];
		collectEmptyLeaves(entry, "", empty);
		expect(empty, `${locale} has undefined or empty leaves`).toEqual([]);
	}
}

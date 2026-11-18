import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createI18nReact } from "../src/react";
import { i18n } from "./fixtures/app";

const { LocaleProvider, useLocale } = createI18nReact(i18n);

function Probe() {
	const { locale, t } = useLocale();
	return (
		<p>
			{locale}|{t.nav.about}|{t.faq.items.join(",")}
		</p>
	);
}

function text(html: string): string {
	return html.replace(/<[^>]+>/g, "").replace(/<!-- -->/g, "");
}

describe("useLocale", () => {
	it("returns the locale of the provider and its messages", () => {
		const html = renderToString(
			<LocaleProvider locale="en">
				<Probe />
			</LocaleProvider>,
		);
		expect(text(html)).toBe("en|About us|First,Second");
	});

	it("returns the default locale outside a provider", () => {
		expect(text(renderToString(<Probe />))).toBe(
			"id|Tentang kami|Pertama,Kedua",
		);
	});

	it("gives different strings for a different locale", () => {
		const render = (locale: "id" | "en") =>
			text(
				renderToString(
					<LocaleProvider locale={locale}>
						<Probe />
					</LocaleProvider>,
				),
			);
		expect(render("id")).not.toBe(render("en"));
	});
});

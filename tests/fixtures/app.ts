import { defineI18n, type Messages } from "../../src/core";

export const id = {
	title: "Fabrica",
	nav: { home: "Beranda", about: "Tentang kami" },
	faq: { items: ["Pertama", "Kedua"] },
};

export const en: Messages<typeof id> = {
	title: "Fabrica",
	nav: { home: "Home", about: "About us" },
	faq: { items: ["First", "Second"] },
};

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

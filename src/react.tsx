import { createContext, type ReactNode, useContext } from "react";
import type { I18n } from "./core";

export interface LocaleProviderProps<L extends string> {
	locale: L;
	children: ReactNode;
}

export function createI18nReact<
	L extends string,
	P extends string,
	M extends object,
>(i18n: I18n<L, P, M>) {
	const LocaleContext = createContext<L>(i18n.defaultLocale);

	// biome-ignore lint/correctness/noComponentHookFactories: the factory runs once at module level and returns instance-typed bindings
	function LocaleProvider({ locale, children }: LocaleProviderProps<L>) {
		return <LocaleContext value={locale}>{children}</LocaleContext>;
	}

	// biome-ignore lint/correctness/noComponentHookFactories: the factory runs once at module level and returns instance-typed bindings
	function useLocale(): { locale: L; t: M } {
		const locale = useContext(LocaleContext);
		return { locale, t: i18n.messages(locale) };
	}

	return { LocaleProvider, useLocale };
}

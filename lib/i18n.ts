import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

import en from "~/locales/en.json";
import es from "~/locales/es.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

const LANG_KEY = "preferred_language";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
const supportedLang = SUPPORTED_LANGUAGES.some((l) => l.code === deviceLang)
  ? deviceLang
  : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: supportedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/** Called once at startup to apply any stored language preference over device default. */
export async function loadStoredLanguage(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(LANG_KEY);
    if (stored && stored !== i18n.language && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // non-critical — fall back to device language
  }
}

/** Persist and immediately apply a language choice. */
export async function setLanguage(code: string): Promise<void> {
  await SecureStore.setItemAsync(LANG_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;

import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";

// Import locale files
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import ru from "./locales/ru.json";

// Set the key-value pairs for the different languages you want to support.
const translations = {
  en,
  ru,
  ja,
};

const i18n = new I18n(translations);

// Set the locale once at the beginning of your app.
const locales = getLocales();
i18n.locale = locales[0]?.languageCode ?? "en";

// When a value is missing from a language it'll fall back to English.
i18n.enableFallback = true;

export default i18n;

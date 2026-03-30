import { en } from "./en"
import { es } from "./es"

const dictionaries: Record<string, Record<string, string>> = { en, es }

export function t(
  key: string,
  lang: string = "en",
  vars?: Record<string, string>
): string {
  const dict = dictionaries[lang] || dictionaries.en
  let text = dict[key] || en[key] || key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v)
    })
  }
  return text
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const

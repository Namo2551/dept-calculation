import { en } from "./en";
import { th, type Dict } from "./th";
import type { Lang } from "./types";

export type { Dict, Lang };

export function getDict(lang: Lang): Dict {
  return lang === "en" ? en : th;
}

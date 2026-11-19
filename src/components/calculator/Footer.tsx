import { getDict } from "@/i18n";
import type { Lang } from "@/i18n/types";

export function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <footer className="raised rounded-panel p-5 sm:p-7 mt-8 text-muted text-[0.93rem]">
      <h2 className="text-lg font-semibold text-text mb-2">{t.footer.title}</h2>
      <ul className="list-disc pl-5 grid gap-1">
        {t.footer.items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </footer>
  );
}

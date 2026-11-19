import { copy as t } from "@/copy";

export function Footer() {
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

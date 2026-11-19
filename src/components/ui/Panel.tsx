// A raised neumorphic section. Sections are the only "cards" on the page.
export function Panel({ id, className = "", children, testId }: { id?: string; className?: string; children: React.ReactNode; testId?: string }) {
  return (
    <section id={id} data-testid={testId} className={`raised rounded-panel p-5 sm:p-7 min-w-0 ${className}`}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, as: Tag = "h2" }: { children: React.ReactNode; as?: "h2" | "h3" }) {
  return <Tag className={`${Tag === "h2" ? "text-xl sm:text-2xl" : "text-lg"} font-semibold tracking-tight mb-4`}>{children}</Tag>;
}

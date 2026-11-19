// An inset card holding one section: surface fill and a 1px hairline, no shadow.
export function Panel({ id, className = "", children, testId }: { id?: string; className?: string; children: React.ReactNode; testId?: string }) {
  return (
    <section id={id} data-testid={testId} className={`inset-card p-5 sm:p-7 min-w-0 ${className}`}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, as: Tag = "h2" }: { children: React.ReactNode; as?: "h2" | "h3" }) {
  return <Tag className={`${Tag === "h2" ? "text-2xl sm:text-[28px]" : "text-xl"} font-display font-medium tracking-[-0.01em] mb-4`}>{children}</Tag>;
}

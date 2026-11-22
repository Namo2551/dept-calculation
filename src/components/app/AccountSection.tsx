// A titled block on app pages: hairline on top, display-font heading, content below.
export function AccountSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? id + "-h" : undefined} className="border-t border-hair pt-8 scroll-mt-24">
      <h2 id={id ? id + "-h" : undefined} className="font-display font-medium text-[26px] leading-tight tracking-[-0.01em] mb-5">
        {title}
      </h2>
      {children}
    </section>
  );
}

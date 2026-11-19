export function PageIntro({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="pt-12 min-[900px]:pt-16">
      <h1 className="font-display font-medium text-[50px] leading-[1.04] min-[900px]:text-[67px] min-[900px]:leading-[1.02] tracking-[-0.025em] text-balance">{title}</h1>
      <p className="mt-6 max-w-[60ch] text-muted">{intro}</p>
    </header>
  );
}

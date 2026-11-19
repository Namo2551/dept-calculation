export function PageIntro({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="pt-8">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 max-w-[65ch] text-muted">{intro}</p>
    </header>
  );
}

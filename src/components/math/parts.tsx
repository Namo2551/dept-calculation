// Small building blocks shared by the math explainer.
export function Formula({ children }: { children: React.ReactNode }) {
  return <code className="pressed block rounded-well px-4 py-3 my-3 font-mono text-[0.9rem] leading-7 overflow-x-auto">{children}</code>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="pressed-sm inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-accent mb-3">{children}</span>;
}

export function Check({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-semibold text-good">{children}</p>;
}

export function Box({ label, children, testId }: { label: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="raised-sm rounded-well p-3 text-sm">
      {label}
      <b className="num block text-base mt-1">{children}</b>
    </div>
  );
}

export const Bsub = ({ i }: { i: React.ReactNode }) => (
  <>
    B<sub>{i}</sub>
  </>
);

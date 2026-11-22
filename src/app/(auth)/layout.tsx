// Auth pages: one narrow column, the same page title style as the rest of the site.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[460px] pb-8">{children}</div>;
}

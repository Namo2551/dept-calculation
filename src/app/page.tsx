import Link from "next/link";

// Placeholder until the real home page lands.
export default function HomePage() {
  return (
    <>
      <h1 className="pt-8 text-4xl font-semibold tracking-tight">Paydown</h1>
      <p className="mt-4">
        <Link href="/calculator" className="underline">Open the calculator</Link>
      </p>
    </>
  );
}

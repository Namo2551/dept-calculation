import type { Metadata } from "next";
import { RedirectTo } from "@/components/calculator/ShowTarget";

export const metadata: Metadata = { title: "Charts" };

// The charts now live on the calculator page; this address forwards there.
export default function ChartsPage() {
  return <RedirectTo to="/calculator?show=chart" />;
}

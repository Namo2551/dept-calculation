import type { Metadata } from "next";
import { RedirectTo } from "@/components/calculator/ShowTarget";

export const metadata: Metadata = { title: "Why it happens" };

// The math now lives on the calculator page (closed until opened); this address forwards there with it open.
export default function WhyPage() {
  return <RedirectTo to="/calculator?show=math" />;
}

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// jsdom has no matchMedia. Report reduced motion so count-up animations render their final value at once.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

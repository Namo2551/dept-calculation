"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener?.("change", onChange);
  return () => mq?.removeEventListener?.("change", onChange);
}

// True when the visitor asked the system for less motion. False during server rendering.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  );
}

// Same check for event handlers (outside render).
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.(QUERY).matches ?? false);
}

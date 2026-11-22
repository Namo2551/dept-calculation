"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Whether a session exists in this browser, for choosing header buttons only (never for security: private
// pages check the user on the server). null until known; false when Supabase isn't configured (e.g. tests).
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let client: ReturnType<typeof createClient>;
    try {
      client = createClient();
    } catch {
      void Promise.resolve().then(() => setSignedIn(false));
      return;
    }
    let live = true;
    client.auth.getSession().then(({ data }) => {
      if (live) setSignedIn(Boolean(data.session));
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

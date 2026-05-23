"use client";

import { useEffect, useState } from "react";

/**
 * Referral helpers. Share links carry a `?ref=<address>` query param; we persist
 * the first ref a visitor arrives with in localStorage so the referrer can be
 * credited on a leaderboard. Fully non-custodial — this is attribution only.
 */

const REF_KEY = "kickoff.ref";
const REF_PARAM = "ref";

function isAddress(v: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(v);
}

/** Builds an absolute share URL for a path, tagging the sharer's ref if given. */
export function shareUrl(path: string, ref?: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://kickoff";
  const url = new URL(path, origin);
  if (ref && isAddress(ref)) url.searchParams.set(REF_PARAM, ref);
  return url.toString();
}

/** Captures the inbound ?ref= on mount and returns the stored referrer (if any). */
export function useCaptureReferral(): string | undefined {
  const [ref, setRef] = useState<string | undefined>();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const incoming = new URLSearchParams(window.location.search).get(REF_PARAM);
    if (incoming && isAddress(incoming)) {
      // first-touch attribution: don't overwrite an existing referrer
      if (!localStorage.getItem(REF_KEY)) {
        localStorage.setItem(REF_KEY, incoming.toLowerCase());
      }
    }
    setRef(localStorage.getItem(REF_KEY) ?? undefined);
  }, []);
  return ref;
}

/** Reads the stored referrer outside React (e.g. before a trade). */
export function storedReferral(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(REF_KEY) ?? undefined;
}

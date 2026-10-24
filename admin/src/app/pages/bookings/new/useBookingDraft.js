// The New booking form saves itself in localStorage while you type, for 30 minutes after the
// last change: reload the page or leave and come back and nothing is lost. "Clear form" wipes it.
// localStorage can throw (private window, blocked site data) — every access is wrapped, and the
// form works the same without it.
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "pba:new-booking-draft:v1";
export const DRAFT_TTL_MS = 30 * 60 * 1000;

function readDraft() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const { values, savedAt } = JSON.parse(raw);
    if (!values || Date.now() - savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return values;
  } catch {
    return null;
  }
}

function writeDraft(values) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ values, savedAt: Date.now() }));
  } catch {
    /* storage unavailable — the form keeps working in memory */
  }
}

export function clearDraftStorage() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function useBookingDraft(initialValues) {
  const initialRef = useRef(initialValues);
  const [restored] = useState(() => readDraft());
  const [values, setValues] = useState(() => (restored ? { ...initialValues, ...restored } : initialValues));
  const dirty = useRef(false);

  const patch = useCallback((next) => {
    dirty.current = true;
    setValues((prev) => ({ ...prev, ...(typeof next === "function" ? next(prev) : next) }));
  }, []);

  // Debounced save; skipped until the user actually changes something.
  useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => writeDraft(values), 250);
    return () => clearTimeout(t);
  }, [values]);

  const clear = useCallback(() => {
    clearDraftStorage();
    dirty.current = false;
    setValues(initialRef.current);
  }, []);

  return { values, patch, clear, wasRestored: Boolean(restored) };
}

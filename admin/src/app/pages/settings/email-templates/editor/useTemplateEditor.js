// State of the template editor for one email + language:
//   - the content being edited ({ subject, preheader, blocks }), with a local id per block;
//   - autosave of the draft 1.2 s after the last change (a draft never changes what is sent);
//   - live preview from the server (same renderer as real emails) 350 ms after a change;
//   - Publish / Discard changes / Restore original / load an older version / Send test.
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getEmailTemplate,
  previewEmailTemplate,
  publishTemplate,
  restoreTemplateDefault,
  restoreTemplateVersion,
  saveTemplateDraft,
  sendTemplateTest,
} from "services/email";

const AUTOSAVE_MS = 1200;
const PREVIEW_MS = 350;

let seq = 0;
const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;
export const withIds = (content) => ({ ...content, blocks: (content?.blocks ?? []).map((b) => ({ ...b, id: b.id || newId() })) });
export const newBlockId = newId;

export function useTemplateEditor(key, locale) {
  const [template, setTemplate] = useState(null); // server view (status, versions, entry…)
  const [content, setContent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | pending | saving | saved | error
  const [preview, setPreview] = useState(null); // { html, subject, text, problems }
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  const saveTimer = useRef(null);
  const previewTimer = useRef(null);
  const previewAbort = useRef(null);
  const latest = useRef({ key, locale, content: null, pending: false });

  const runPreview = useCallback(async (next) => {
    previewAbort.current?.abort();
    const ctrl = new AbortController();
    previewAbort.current = ctrl;
    setPreviewing(true);
    try {
      const { data } = await previewEmailTemplate(latest.current.key, latest.current.locale, next, { signal: ctrl.signal });
      setPreview(data.data);
    } catch (err) {
      // A newer preview replaced this one: nothing to show.
      if (!ctrl.signal.aborted) setPreview((p) => ({ ...(p ?? {}), problems: [err.message ?? "Preview failed"] }));
    } finally {
      if (previewAbort.current === ctrl) setPreviewing(false);
    }
  }, []);

  const saveNow = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const { key: k, locale: l, content: c, pending } = latest.current;
    if (!pending || !c) return true;
    latest.current.pending = false;
    setSaveState("saving");
    try {
      const { data } = await saveTemplateDraft(k, l, c);
      // Keep what is on screen (the user may still be typing); only the meta changes.
      setTemplate((t) => (t && t.key === k && t.locale === l ? { ...data.data, content: t.content } : t));
      setSaveState("saved");
      return true;
    } catch {
      latest.current.pending = true;
      setSaveState("error");
      return false;
    }
  }, []);

  // ---- Load ----
  useEffect(() => {
    let alive = true;
    latest.current = { key, locale, content: null, pending: false };
    setTemplate(null);
    setContent(null);
    setPreview(null);
    setLoadError(null);
    setSaveState("idle");
    getEmailTemplate(key, locale)
      .then(({ data }) => {
        if (!alive) return;
        const c = withIds(data.data.content);
        latest.current.content = c;
        setTemplate(data.data);
        setContent(c);
        runPreview(c);
      })
      .catch((err) => alive && setLoadError(err.status === 404 ? "not_found" : (err.message ?? "error")));
    return () => {
      alive = false;
    };
  }, [key, locale, runPreview]);

  // Leaving the page (or switching language) saves what is pending.
  useEffect(() => () => void saveNow(), [key, locale, saveNow]);
  useEffect(() => {
    const warn = (e) => {
      if (latest.current.pending) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // ---- Edit ----
  const change = useCallback(
    (updater) => {
      setContent((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        latest.current.content = next;
        latest.current.pending = true;
        return next;
      });
      setSaveState("pending");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(saveNow, AUTOSAVE_MS);
      clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => runPreview(latest.current.content), PREVIEW_MS);
    },
    [runPreview, saveNow],
  );

  // ---- Actions (each resolves to { ok, error? }) ----
  const reload = useCallback(
    (data) => {
      const c = withIds(data.content);
      latest.current.content = c;
      latest.current.pending = false;
      setTemplate(data);
      setContent(c);
      setSaveState("idle");
      runPreview(c);
    },
    [runPreview],
  );

  const act = useCallback(async (call, after) => {
    setBusy(true);
    try {
      const { data } = await call();
      after?.(data.data);
      return { ok: true, data: data.data };
    } catch (err) {
      return { ok: false, error: err };
    } finally {
      setBusy(false);
    }
  }, []);

  const publish = useCallback(async () => {
    clearTimeout(saveTimer.current);
    latest.current.pending = false;
    return act(() => publishTemplate(key, locale, latest.current.content), reload);
  }, [act, key, locale, reload]);

  // Back to what clients get now: the published version, or the original text.
  const discard = useCallback(() => {
    const live = template?.published ?? template?.defaultContent;
    if (live) change(withIds(live));
  }, [change, template]);

  const restoreDefault = useCallback(() => act(() => restoreTemplateDefault(key, locale), reload), [act, key, locale, reload]);
  const restoreVersion = useCallback((id) => act(() => restoreTemplateVersion(key, locale, id), reload), [act, key, locale, reload]);
  const sendTest = useCallback((to) => act(() => sendTemplateTest(key, locale, latest.current.content, to)), [act, key, locale]);

  return { template, content, loadError, saveState, preview, previewing, busy, change, publish, discard, restoreDefault, restoreVersion, sendTest, saveNow };
}

// Template editor (docs/correos.md §4, §6, §9.3) — a guided editor, not a page builder: the brand
// layout is fixed (logo, fonts, signature, footer) and Areli only writes the words.
//
//   left   subject + inbox preview text, then the body as blocks (title, paragraph, button, details
//          box, small print, line). Fields show as [First name] and are inserted from "Insert field".
//   right  live preview with a sample client, desktop or phone width (sticky).
//   bottom floating bar: what's wrong (if anything) · Send test · Publish.
//
// Drafts save themselves; nothing reaches clients until Publish. EN and ES are separate texts.
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ArrowLeftIcon, EllipsisHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { Page } from "components/shared/Page";
import { Skeleton } from "components/ui";
import { loadEmailTemplatesThunk, useEmailStore } from "slices";
import { formatDate, fromNow } from "utils/date";

import { ActionButton, AlertNote } from "../../../bookings/parts";
import { inputClass } from "../../../bookings/new/fields";
import { triggerLabel } from "../../email/labels";
import { TemplateSwitch } from "../../email/parts";
import { readTestAddress, rememberTestAddress } from "../testAddress";
import { BlockList } from "./BlockList";
import { PreviewPane } from "./PreviewPane";
import { makeTokens } from "./tokens";
import { TokenField } from "./TokenField";
import { useTemplateEditor } from "./useTemplateEditor";

const LOCALES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

export default function TemplateEditorPage() {
  const { key } = useParams();
  const [params, setParams] = useSearchParams();
  const locale = params.get("lang") === "es" ? "es" : "en";
  const catalog = useEmailStore((s) => s.templates.data);
  const editor = useTemplateEditor(key, locale);
  const goBack = useGoBack();

  useEffect(() => {
    if (!catalog) loadEmailTemplatesThunk();
  }, [catalog]);

  const entry = catalog?.templates.find((t) => t.key === key) ?? editor.template?.entry;
  const title = entry?.name ?? "Email";

  if (editor.loadError === "not_found") {
    return (
      <Page title="Email not found">
        <div className="px-(--margin-x) pb-12">
          <TopBar goBack={goBack} />
          <p className="mt-10 text-body text-ink">This email doesn’t exist.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title={`${title} · Email`}>
      <div className="px-(--margin-x) pb-32">
        <TopBar goBack={goBack} editor={editor} />
        {!editor.template || !editor.content || !catalog ? (
          editor.loadError ? <AlertNote className="mt-8">{editor.loadError}</AlertNote> : <EditorSkeleton />
        ) : (
          <Editor
            key={`${key}:${locale}`}
            entry={entry}
            catalog={catalog}
            editor={editor}
            locale={locale}
            setLocale={(l) => setParams(l === "en" ? {} : { lang: l }, { replace: true })}
          />
        )}
      </div>
    </Page>
  );
}

function useGoBack() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/settings/email-templates", { replace: true });
  };
}

function TopBar({ goBack, editor }) {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [history, setHistory] = useState(false);
  const t = editor?.template;
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
      <button
        type="button"
        onClick={goBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        <span>Email templates</span>
      </button>
      {t && (
        <Menu as="div" className="relative">
          <MenuButton aria-label="More actions" className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink">
            <EllipsisHorizontalIcon className="size-6" />
          </MenuButton>
          <MenuItems anchor="bottom end" className="z-30 mt-1 w-60 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none">
            <MenuItem disabled={!t.versions.length}>
              <button type="button" onClick={() => setHistory(true)} className="flex min-h-11 w-full items-center px-4 text-left text-body text-ink data-disabled:opacity-40 data-focus:bg-paper-alt">
                Published versions{t.versions.length ? ` (${t.versions.length})` : ""}
              </button>
            </MenuItem>
            <MenuItem disabled={t.status === "default"}>
              <button type="button" onClick={() => setConfirmRestore(true)} className="flex min-h-11 w-full items-center px-4 text-left text-body text-ink data-disabled:opacity-40 data-focus:bg-paper-alt">
                Go back to the original text
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      )}
      {t && (
        <>
          <ConfirmModal
            show={confirmRestore}
            onClose={() => setConfirmRestore(false)}
            confirmLoading={editor.busy}
            onOk={async () => {
              const res = await editor.restoreDefault();
              setConfirmRestore(false);
              if (res.ok) toast.success("Back to the original text");
              else toast.error(res.error?.message ?? "Could not restore it");
            }}
            state="pending"
            messages={{
              pending: {
                title: "Go back to the original text?",
                description: "Your version and its history are removed. Clients get the original text from now on.",
                actionText: "Use the original",
              },
            }}
          />
          <HistoryDialog show={history} onClose={() => setHistory(false)} editor={editor} />
        </>
      )}
    </div>
  );
}

// ─── The editor ─────────────────────────────────────────────────────────

function Editor({ entry, catalog, editor, locale, setLocale }) {
  const { template, content, change, preview, previewing } = editor;
  const [mobileTab, setMobileTab] = useState("edit");
  const tokens = useMemo(() => makeTokens(catalog.variables, ["client", "business", ...entry.vars]), [catalog.variables, entry.vars]);
  const setBlocks = (updater) => change((c) => ({ ...c, blocks: typeof updater === "function" ? updater(c.blocks) : updater }));
  const group = catalog.groups.find((g) => g.key === entry.group)?.label;

  return (
    <>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="caps text-ink-muted">
            {group} · {triggerLabel(entry.trigger)}
          </p>
          <h1 className="mt-2 text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-ink">{entry.name}</h1>
          <p className="mt-2 max-w-xl text-small text-ink-muted">{entry.when}</p>
        </div>
        <div className="flex items-center gap-5">
          <div role="group" aria-label="Language" className="flex border border-line">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={locale === l.id}
                onClick={() => setLocale(l.id)}
                className={clsx("min-h-10 px-4 text-small transition-colors", locale === l.id ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink")}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2 text-small text-ink-muted">
            <TemplateSwitch entry={entry} />
          </span>
        </div>
      </header>

      {!entry.wired && <p className="mt-4 border-l-2 border-line-strong pl-3 text-small text-ink-muted">Not sent yet. {entry.pending}</p>}
      <StatusLine template={template} saveState={editor.saveState} onDiscard={editor.discard} />

      {/* Phone: one column at a time */}
      <div role="group" aria-label="View" className="mt-6 flex border border-line lg:hidden">
        {["edit", "preview"].map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={clsx("min-h-11 flex-1 caps transition-colors", mobileTab === tab ? "bg-ink text-on-ink" : "text-ink-muted")}
          >
            {tab === "edit" ? "Write" : "Preview"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className={clsx(mobileTab !== "edit" && "hidden lg:block")}>
          <section>
            <h2 className="caps border-b border-line pb-2 text-ink-muted">Inbox</h2>
            <div className="mt-5 space-y-6">
              <TokenField label="Subject" value={content.subject} onChange={(subject) => change((c) => ({ ...c, subject }))} tokens={tokens} />
              <TokenField
                label="Preview text"
                value={content.preheader}
                onChange={(preheader) => change((c) => ({ ...c, preheader }))}
                tokens={tokens}
                hint="The grey line after the subject in most inboxes."
              />
            </div>
          </section>
          <section className="mt-10">
            <h2 className="caps border-b border-line pb-2 text-ink-muted">Email</h2>
            <BlockList blocks={content.blocks} onChangeBlocks={setBlocks} tokens={tokens} cards={catalog.cards} availableCards={entry.cards} />
            <p className="mt-6 text-small text-ink-muted">Your logo, signature and contact details are added automatically.</p>
          </section>
        </div>

        <div className={clsx("lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:self-start", mobileTab !== "preview" && "hidden lg:block")}>
          <PreviewPane preview={preview} loading={previewing} />
        </div>
      </div>

      <ActionBar editor={editor} tokens={tokens} />
    </>
  );
}

const SAVE_TEXT = { pending: "Saving…", saving: "Saving…", saved: "Draft saved", error: "Couldn’t save the draft — check your connection" };

function StatusLine({ template, saveState, onDiscard }) {
  const { status } = template;
  const save = SAVE_TEXT[saveState];
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-small" aria-live="polite">
      {status === "default" && <span className="text-ink-muted">Original text. Clients keep getting it until you publish your own.</span>}
      {status === "published" && (
        <span className="text-ink">
          <span className="mr-2 inline-block size-2 rounded-full bg-success align-middle" aria-hidden="true" />
          Your version is live{template.publishedAt ? ` · published ${fromNow(template.publishedAt)}` : ""}.
        </span>
      )}
      {status === "draft" && (
        <>
          <span className="text-warning">Unpublished changes. Clients still get the {template.publishedAt ? "published" : "original"} text.</span>
          <button type="button" onClick={onDiscard} className="text-ink-muted underline underline-offset-4 hover:text-ink">
            Discard changes
          </button>
        </>
      )}
      {save && <span className={clsx(saveState === "error" ? "text-alert" : "text-ink-muted")}>· {save}</span>}
    </div>
  );
}

// ─── Bottom bar ─────────────────────────────────────────────────────────

function ActionBar({ editor, tokens }) {
  const { template, preview, busy, saveState } = editor;
  const [publishErrors, setPublishErrors] = useState(null);
  const problems = (publishErrors ?? preview?.problems ?? []).map((p) => tokens.toDisplay(p));
  const changed = template.status === "draft" || saveState === "pending" || saveState === "saving";

  const publish = async () => {
    setPublishErrors(null);
    const res = await editor.publish();
    if (res.ok) toast.success("Published — clients get this version now");
    else {
      setPublishErrors(res.error?.details?.problems ?? [res.error?.message ?? "Could not publish"]);
    }
  };

  useEffect(() => setPublishErrors(null), [preview]);

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 border border-line-strong bg-paper px-4 py-2 shadow-soft dark:shadow-none">
        <p role={problems.length ? "alert" : undefined} className={clsx("max-w-md text-small", problems.length ? "text-alert" : "text-ink-muted")}>
          {problems.length ? problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : "") : changed ? "Ready to publish" : "Up to date"}
        </p>
        <TestButton editor={editor} />
        <ActionButton solid className="min-h-9" disabled={busy || !changed || problems.length > 0} onClick={publish}>
          {busy ? "Publishing…" : "Publish"}
        </ActionButton>
      </div>
    </div>
  );
}

function TestButton({ editor }) {
  const [to, setTo] = useState(readTestAddress);
  const delivery = useEmailStore((s) => s.settings.data?.status?.delivery);

  const send = async (close) => {
    const res = await editor.sendTest(to.trim());
    if (!res.ok) return toast.error(res.error?.message ?? "Could not send the test");
    rememberTestAddress(to.trim());
    toast.success(delivery?.mode === "mailpit" ? `Test sent — open Mailpit to see it` : `Test on its way to ${to.trim()}`);
    close();
  };

  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex min-h-9 items-center border border-line-strong px-4 caps text-ink transition-colors hover:border-ink">Send test</PopoverButton>
      <PopoverPanel anchor="top end" className="z-50 mb-2 w-80 border border-line-strong bg-paper p-4 shadow-soft dark:shadow-none">
        {({ close }) => (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              send(close);
            }}
          >
            <label htmlFor="test-to" className="field-label">
              Send this draft to
            </label>
            <input id="test-to" type="email" autoFocus value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" className={inputClass} />
            <p className="mt-2 text-small text-ink-muted">With a sample client and “[TEST]” in the subject. It goes out even if emails are paused.</p>
            <ActionButton solid type="submit" className="mt-4 w-full" disabled={editor.busy || !to.trim()}>
              {editor.busy ? "Sending…" : "Send test"}
            </ActionButton>
          </form>
        )}
      </PopoverPanel>
    </Popover>
  );
}

// ─── History ────────────────────────────────────────────────────────────

function HistoryDialog({ show, onClose, editor }) {
  const versions = editor.template?.versions ?? [];
  const [loading, setLoading] = useState(null);
  return (
    <DialogShell show={show} onClose={onClose} title="Published versions">
      <p className="text-small text-ink-muted">Open an older version in the editor. It isn’t sent until you publish it again.</p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {versions.map((v, i) => (
          <li key={v.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-body text-ink">
                Version {v.version}
                {i === 0 && editor.template.publishedAt && <span className="ml-2 caps text-ink-muted">· live</span>}
              </p>
              <p className="truncate text-small text-ink-muted">
                {formatDate(v.publishedAt, "LLL d, yyyy · h:mm a")} · {v.subject}
              </p>
            </div>
            <ActionButton
              className="min-h-9"
              disabled={loading !== null}
              onClick={async () => {
                setLoading(v.id);
                const res = await editor.restoreVersion(v.id);
                setLoading(null);
                if (res.ok) {
                  toast.success(`Version ${v.version} is in the editor`);
                  onClose();
                } else toast.error(res.error?.message ?? "Could not open it");
              }}
            >
              {loading === v.id ? "Opening…" : "Open"}
            </ActionButton>
          </li>
        ))}
      </ul>
    </DialogShell>
  );
}

function DialogShell({ show, onClose, title, children }) {
  return (
    <Transition appear show={show} as={Dialog} onClose={onClose} className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6">
      <TransitionChild as="div" enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0" className="absolute inset-0 bg-black/50" />
      <TransitionChild
        as={DialogPanel}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-y-auto border border-line-strong bg-paper p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[1.5rem] leading-tight text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-mt-2 -mr-2 flex size-11 items-center justify-center text-ink-muted hover:text-ink">
            <XMarkIcon className="size-6" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </TransitionChild>
    </Transition>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" className="mt-4">
      <Skeleton className="h-3 w-40 rounded" />
      <Skeleton className="mt-3 h-10 w-80 max-w-full rounded" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className={i === 2 ? "h-24 w-full rounded" : "h-11 w-full rounded"} />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-[32rem] w-full rounded lg:block" />
      </div>
    </div>
  );
}

TopBar.propTypes = { goBack: PropTypes.func.isRequired, editor: PropTypes.object };
Editor.propTypes = { entry: PropTypes.object, catalog: PropTypes.object, editor: PropTypes.object, locale: PropTypes.string, setLocale: PropTypes.func };
StatusLine.propTypes = { template: PropTypes.object, saveState: PropTypes.string, onDiscard: PropTypes.func };
ActionBar.propTypes = { editor: PropTypes.object, tokens: PropTypes.object };
TestButton.propTypes = { editor: PropTypes.object };
HistoryDialog.propTypes = { show: PropTypes.bool, onClose: PropTypes.func, editor: PropTypes.object };
DialogShell.propTypes = { show: PropTypes.bool, onClose: PropTypes.func, title: PropTypes.string, children: PropTypes.node };

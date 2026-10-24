// /client/welcome · "Choose your password". A client who signed in with the password Areli generated
// (`mustChangePassword`) lands here before anything else; the API also refuses /api/client/* until
// it's done. Only "new" + "repeat": the temporary password was already proven at sign-in, so the API
// doesn't ask for it this first time. The rules (plus "passwords match") stay neutral until they start
// typing or leave the field, then turn green + struck through when met, red with an X when not.
// The API checks the rules again.
import { useId, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import axios from "utils/axios";
import { useAuth } from "app/auth";
import { Button } from "components/ui";
import { LanguageSwitch } from "components/LanguageSwitch";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { Logo } from "components/Logo";
import { RULES, checkPassword, meetsAllRules } from "utils/passwordRules";

// state: idle (not checked yet) | met | unmet
const MARK = {
  idle: "border-line-strong text-transparent",
  met: "border-success bg-success text-white dark:border-success-lighter dark:bg-success-lighter dark:text-dark-900",
  unmet: "border-error text-error dark:border-error-lighter dark:text-error-lighter",
};
const TEXT = {
  idle: "text-ink-muted",
  met: "text-success line-through decoration-1 dark:text-success-lighter",
  unmet: "text-error dark:text-error-lighter",
};

function Mark({ state }) {
  return (
    <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${MARK[state]}`}>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        {state === "unmet" ? (
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" strokeLinecap="round" />
        ) : (
          <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

function Rule({ state, children }) {
  const { t } = useTranslation();
  return (
    <li className={`flex items-center gap-2.5 text-small transition-colors ${TEXT[state]}`}>
      <Mark state={state} />
      <span>{children}</span>
      {state !== "idle" && <span className="sr-only">{state === "met" ? t("password.met") : t("password.notMet")}</span>}
    </li>
  );
}

function PasswordField({ label, shown, onToggle, ...input }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          maxLength={128}
          className="form-input-base form-input border-gray-300 pr-16 focus:border-primary-600 dark:border-dark-450 dark:focus:border-primary-500"
          {...input}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? t("signIn.hidePassword") : t("signIn.showPassword")}
          className="caps absolute inset-y-0 right-0 min-w-14 text-[0.6875rem] text-ink-muted hover:text-ink"
        >
          {shown ? t("signIn.hide") : t("signIn.show")}
        </button>
      </div>
    </div>
  );
}

export default function ChoosePassword() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  // A rule is only judged once they've typed in the field or left it.
  const [touched, setTouched] = useState({ next: false, again: false });
  const touch = (field) => setTouched((s) => (s[field] ? s : { ...s, [field]: true }));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  useDocumentTitle(t("password.title"));

  const names = useMemo(
    () => ({ firstName: user?.firstName, lastName: user?.lastName, displayName: user?.name }),
    [user?.firstName, user?.lastName, user?.name],
  );
  const checks = checkPassword(next, names);
  const matches = next.length > 0 && again === next;
  const canSave = !busy && meetsAllRules(checks) && matches;
  const stateOf = (met, isTouched) => (!isTouched ? "idle" : met ? "met" : "unmet");

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setFormError(null);
    try {
      const { data } = await axios.post("/auth/change-password", { newPassword: next });
      setUser(data.data);
      navigate("/client", { replace: true });
    } catch (err) {
      if (err.code === "SAME_AS_TEMPORARY") setFormError(t("password.errors.sameAsTemporary"));
      else if (err.code === "ALREADY_CHOSEN") setFormError(t("password.errors.alreadyChosen"));
      else if (err.status === 429) setFormError(t("signIn.errors.tooMany"));
      else setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-100vh flex flex-col bg-paper px-4 pt-[calc(var(--safe-top)+2rem)] pb-[calc(var(--safe-bottom)+2rem)] sm:px-12">
      <div className="mx-auto flex w-full max-w-[416px] items-center justify-between">
        <Logo className="h-12" />
        <LanguageSwitch />
      </div>

      <form onSubmit={submit} noValidate className="mx-auto my-auto flex w-full max-w-[416px] flex-col gap-5 py-10">
        <div>
          <h1 className="mb-2.5 text-title-l tracking-[-0.01em] text-ink">{t("password.title")}</h1>
          <p className="text-body text-ink-muted">{t("password.subtitle")}</p>
        </div>

        <PasswordField
          label={t("password.new")}
          autoComplete="new-password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            touch("next");
          }}
          onBlur={() => touch("next")}
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />

        <PasswordField
          label={t("password.repeat")}
          autoComplete="new-password"
          value={again}
          onChange={(e) => {
            setAgain(e.target.value);
            touch("again");
          }}
          onBlur={() => touch("again")}
          shown={shown}
          onToggle={() => setShown((v) => !v)}
        />

        <ul aria-label={t("password.rulesLabel")} aria-live="polite" className="-mt-1 flex flex-col gap-2">
          {RULES.map(({ key, label }) => (
            <Rule key={key} state={stateOf(checks[key], touched.next)}>
              {t(label)}
            </Rule>
          ))}
          <Rule state={stateOf(matches, touched.again)}>{t("password.rules.match")}</Rule>
        </ul>

        {formError && (
          <p role="alert" className="text-small text-alert">
            {formError}
          </p>
        )}

        <Button type="submit" color="primary" className="min-h-12 w-full" disabled={!canSave}>
          {busy ? t("password.saving") : t("password.save")}
        </Button>
        <button type="button" onClick={logout} className="caps min-h-11 text-ink-muted hover:text-ink">
          {t("profile.signOut")}
        </button>
      </form>
    </main>
  );
}

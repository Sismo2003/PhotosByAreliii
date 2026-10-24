// The ONE sign-in page (photosbyareliii.com/login) for Areli and her clients — layout from
// Login.dc.html: photo left, form right; form only on phones. nginx sends /admin/login and
// /client/login here. After signing in, the role the API returns picks the app.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import { DevicePhoneMobileIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

import { Button, Input } from "components/ui";
import { destinationFor, useAuth } from "app/auth";
import { GoTo } from "app/guards";
import { SplashScreen } from "app/layout/SplashScreen";
import { LanguageSwitch } from "components/LanguageSwitch";
import { Logo } from "components/Logo";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { REDIRECT_URL_KEY, SITE_URL } from "constants/app.constant";
import { isValidPhone } from "utils/phone";
import { formatIdentifierInput, identifierKind } from "utils/identifier";

const isEmail = (value) => Yup.string().email().isValidSync(value);

const makeSchema = (t) =>
  Yup.object().shape({
    identifier: Yup.string()
      .trim()
      .required(t("signIn.errors.identifierRequired"))
      // One message per kind: the field already knows which one they're typing.
      .test("email-or-phone", function check(value = "") {
        if (identifierKind(value) === "phone") {
          return isValidPhone(value) || this.createError({ message: t("signIn.errors.phoneInvalid") });
        }
        return isEmail(value) || this.createError({ message: t("signIn.errors.emailInvalid") });
      }),
    password: Yup.string().required(t("signIn.errors.passwordRequired")),
  });

export default function SignIn() {
  const { t, i18n } = useTranslation();
  const { status, user, notice, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get(REDIRECT_URL_KEY);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useDocumentTitle(t("signIn.title"));

  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { identifier: "", password: "" } });

  // Phone → formatted as they type (libphonenumber-js); email → left as typed, without spaces.
  const previousIdentifier = useRef("");
  const identifierField = register("identifier"); // its onChange is replaced below
  const onIdentifierChange = (e) => {
    const next = formatIdentifierInput(e.target.value, previousIdentifier.current);
    previousIdentifier.current = next;
    setValue("identifier", next, { shouldValidate: isSubmitted, shouldDirty: true });
  };
  const kind = identifierKind(watch("identifier"));
  const KindIcon = kind === "phone" ? DevicePhoneMobileIcon : kind === "email" ? EnvelopeIcon : null;

  // Messages follow the language switch.
  useEffect(() => {
    if (isSubmitted) trigger();
  }, [i18n.resolvedLanguage, isSubmitted, trigger]);

  // Already signed in (or just signed in): go where the role belongs.
  const dest = user ? destinationFor(user, redirect) : null;
  useEffect(() => {
    if (dest?.to) navigate(dest.to, { replace: true });
  }, [dest?.to, navigate]);

  if (status === "loading") return <SplashScreen />;
  if (dest?.href) return <GoTo href={dest.href} />;
  if (dest?.to) return <SplashScreen />;

  const onSubmit = async ({ identifier, password }) => {
    setBusy(true);
    setError(null);
    try {
      await login({ identifier: identifier.trim(), password });
    } catch (err) {
      setError(err.status === 401 ? t("signIn.errors.wrong") : err.status === 429 ? t("signIn.errors.tooMany") : err.message);
      setBusy(false);
    }
  };

  // The admin sends ?expired=1 when its session ends mid-work.
  const ended = notice === "sessionEnded" || params.get("expired") === "1";
  const message = error || (ended ? t("signIn.errors.sessionEnded") : null);

  return (
    <main className="min-h-100vh grid w-full bg-paper lg:grid-cols-[minmax(0,1fr)_560px]">
      <img
        src={`${import.meta.env.BASE_URL}login.jpg`}
        alt={t("signIn.photoAlt")}
        className="hidden h-full max-h-screen w-full object-cover lg:sticky lg:top-0 lg:block"
      />

      <div className="flex flex-col px-4 pt-[calc(var(--safe-top)+2rem)] pb-[calc(var(--safe-bottom)+2rem)] sm:px-12 lg:px-[72px] lg:py-9">
        <div className="flex items-center justify-between gap-4">
          <Logo className="h-12" />
          <div className="flex items-center gap-5">
            <LanguageSwitch />
            <a href={SITE_URL} className="caps hidden text-ink-muted hover:text-ink sm:inline">
              {t("signIn.backToSite")}
            </a>
          </div>
        </div>

        <div className="my-auto w-full max-w-[416px] py-10">
          <h1 className="mb-2.5 text-title-l tracking-[-0.01em] text-ink">{t("signIn.title")}</h1>
          <p className="mb-7 text-body text-ink-muted">{t("signIn.subtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Input
              label={t("signIn.identifier")}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("signIn.identifierPlaceholder")}
              {...identifierField}
              onChange={onIdentifierChange}
              classNames={{ input: "pr-9", suffix: "pointer-events-none" }}
              suffix={KindIcon && <KindIcon className="size-5" aria-hidden="true" />}
              error={errors?.identifier?.message}
            />
            <Input
              label={t("signIn.password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              classNames={{ input: "pr-16", suffix: "w-auto" }}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("signIn.hidePassword") : t("signIn.showPassword")}
                  className="caps pointer-events-auto min-h-11 min-w-11 text-[0.6875rem] text-ink-muted hover:text-ink"
                >
                  {showPassword ? t("signIn.hide") : t("signIn.show")}
                </button>
              }
              {...register("password")}
              error={errors?.password?.message}
            />

            {message && (
              <p role="alert" className="text-small text-alert">
                {message}
              </p>
            )}

            <Button type="submit" color="primary" className="min-h-12 w-full" disabled={busy}>
              {busy ? t("signIn.submitting") : t("signIn.submit")}
            </Button>
          </form>

          {/* PENDING(password-reset): no self-service reset yet (docs/portal-cliente-plan.md §11). */}
          <p className="mt-7 border-t border-line pt-5 text-small text-ink-muted">{t("signIn.forgot")}</p>
        </div>
      </div>
    </main>
  );
}

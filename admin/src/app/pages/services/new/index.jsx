// Admin · Add service (/services/new): a name and whether it is bookable. Packages and add-ons
// are added on the service's own page, which opens right after.
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { createServiceThunk } from "slices";
import { todayLabel } from "utils/date";

import { Field, inputClass } from "../../bookings/new/fields";
import { ActionButton, AlertNote, ChoiceGroup } from "../../bookings/parts";
import { STATUS_OPTIONS, servicePath } from "../labels";

export default function NewService() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/services", { replace: true }));

  const submit = async () => {
    if (!name.trim()) {
      setErrors({ name: "Give the service a name" });
      return;
    }
    setErrors({});
    setBusy(true);
    setError(null);
    const res = await createServiceThunk({ name: name.trim(), status });
    setBusy(false);
    if (res.ok) {
      toast.success(`${res.data.name} added`);
      navigate(servicePath(res.data.id), { replace: true, viewTransition: true });
    } else {
      setError(res.error?.message ?? "Could not add the service");
    }
  };

  return (
    <Page title="Add service">
      <div className="page-vt px-(--margin-x) pb-32 lg:pb-12">
        <div className="flex min-h-14 items-center pt-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
            <span>Services</span>
          </button>
        </div>

        <PageHeader eyebrow={todayLabel()} title="Add service" />
        <p className="mt-3 max-w-xl text-ink-muted">A kind of session you offer. Next you add its packages and choose its add-ons.</p>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-6 max-w-xl space-y-6"
        >
          <Field label="Name" error={errors.name} hint="As clients see it — “Maternity”, “Branding”">
            {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={inputClass} />}
          </Field>
          <div>
            <ChoiceGroup label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <p className="mt-2 text-small text-ink-muted">{STATUS_OPTIONS.find((o) => o.value === status)?.hint}</p>
          </div>
          {error && <AlertNote>{error}</AlertNote>}
          <div className="flex gap-3">
            <ActionButton onClick={goBack} disabled={busy}>
              Cancel
            </ActionButton>
            <ActionButton solid type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add service"}
            </ActionButton>
          </div>
        </form>
      </div>
    </Page>
  );
}

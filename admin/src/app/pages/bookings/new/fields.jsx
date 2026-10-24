// Form pieces of the New booking page: same underline inputs as the booking action forms.
import clsx from "clsx";
import PropTypes from "prop-types";
import { useId } from "react";

export const inputClass =
  "mt-1 h-11 w-full border-0 border-b border-line-strong bg-transparent px-0 text-body text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0 disabled:text-ink-muted read-only:text-ink-muted";

/** Label + control + hint/error. The control gets `id` through the render prop. */
export function Field({ label, hint, error, optional, className, children }) {
  const id = useId();
  return (
    <div className={clsx("min-w-0", className)}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 normal-case tracking-normal text-ink-muted">· optional</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p role="alert" className="mt-1 text-small text-alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-small text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextArea(props) {
  return <textarea rows={3} {...props} className={clsx(inputClass, "h-auto resize-y py-2")} />;
}

export function CheckField({ checked, onChange, children, error }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body text-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-4 shrink-0 rounded-none border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p role="alert" className="text-small text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Numbered block of the form: big step number, title, one-line hint. */
export function FormSection({ n, title, hint, children, id }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-8 first:border-t-0">
      <header className="flex items-baseline gap-4">
        <span className="text-[1.75rem] leading-none text-ink-muted">{n}</span>
        <div>
          <h2 className="text-[1.5rem] leading-tight text-ink">{title}</h2>
          {hint && <p className="mt-1 text-small text-ink-muted">{hint}</p>}
        </div>
      </header>
      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.node,
  error: PropTypes.string,
  optional: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.func.isRequired,
};
CheckField.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
  error: PropTypes.string,
};
FormSection.propTypes = {
  n: PropTypes.number,
  title: PropTypes.string.isRequired,
  hint: PropTypes.string,
  children: PropTypes.node,
  id: PropTypes.string,
};

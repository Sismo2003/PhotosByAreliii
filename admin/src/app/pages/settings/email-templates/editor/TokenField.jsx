// A text field that understands fields: it shows [First name] where the template has
// {{ client.firstName }}, and its "Insert" menu drops a field where the cursor is.
import { Menu, MenuButton, MenuItem, MenuItems, MenuSection, MenuHeading } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useId, useRef } from "react";

import { inputClass } from "../../../bookings/new/fields";
import { GROUP_LABEL } from "./tokens";

/** Menu of the fields this email can use, grouped. `onPick(field)`. */
export function FieldMenu({ tokens, onPick, label = "Insert field", only }) {
  const fields = only ? tokens.fields.filter(only) : tokens.fields;
  const groups = [...new Set(fields.map((f) => f.group))];
  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex min-h-8 items-center gap-1 px-1 text-small text-ink-muted transition-colors hover:text-ink data-open:text-ink">
        <PlusIcon className="size-4" aria-hidden="true" />
        {label}
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        modal={false}
        className="z-50 mt-1 max-h-80 w-60 overflow-y-auto border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none"
      >
        {groups.map((g) => (
          <MenuSection key={g}>
            <MenuHeading className="caps px-3 pt-2 pb-1 text-ink-muted">{GROUP_LABEL[g] ?? g}</MenuHeading>
            {fields
              .filter((f) => f.group === g)
              .map((f) => (
                <MenuItem key={f.name}>
                  <button type="button" onClick={() => onPick(f)} className="flex min-h-9 w-full items-center px-3 text-left text-small text-ink data-focus:bg-paper-alt">
                    {f.label}
                  </button>
                </MenuItem>
              ))}
          </MenuSection>
        ))}
      </MenuItems>
    </Menu>
  );
}

export function TokenField({ label, value, onChange, tokens, multiline = false, rows = 3, placeholder, hint, className, inputClassName }) {
  const id = useId();
  const ref = useRef(null);
  const shown = tokens.toDisplay(value);

  const insert = (field) => {
    const el = ref.current;
    const token = tokens.display(field.name);
    const start = el?.selectionStart ?? shown.length;
    const end = el?.selectionEnd ?? start;
    // A space around the token when it would otherwise touch a word.
    const before = shown.slice(0, start);
    const after = shown.slice(end);
    const pre = before && !/\s$/.test(before) ? " " : "";
    const post = after && !/^[\s.,!?;:)]/.test(after) ? " " : "";
    const next = `${before}${pre}${token}${post}${after}`;
    onChange(tokens.fromDisplay(next));
    const caret = (before + pre + token + post).length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const props = {
    id,
    ref,
    value: shown,
    placeholder,
    onChange: (e) => onChange(tokens.fromDisplay(e.target.value)),
    "aria-describedby": hint ? `${id}-hint` : undefined,
  };

  return (
    <div className={clsx("min-w-0", className)}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {tokens.fields.length > 0 && <FieldMenu tokens={tokens} onPick={insert} />}
      </div>
      {multiline ? (
        <textarea {...props} rows={rows} className={clsx(inputClass, "h-auto resize-y py-2 leading-relaxed", inputClassName)} />
      ) : (
        <input {...props} className={clsx(inputClass, inputClassName)} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-small text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

FieldMenu.propTypes = { tokens: PropTypes.object.isRequired, onPick: PropTypes.func.isRequired, label: PropTypes.string, only: PropTypes.func };
TokenField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  tokens: PropTypes.object.isRequired,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  placeholder: PropTypes.string,
  hint: PropTypes.node,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
};

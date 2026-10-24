// "Reorder": the full list with up / down buttons; saving sends every id in the new order
// (PUT …/order). Used for services, a service's packages and add-ons — the order Areli picks is
// the order New booking and /book show them in.
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { ActionButton, AlertNote } from "../bookings/parts";
import { Modal } from "./Modal";

export function ReorderDialog({ show, onClose, title, items, onSave }) {
  const [order, setOrder] = useState(items);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const move = (from, to) =>
    setOrder((list) => {
      const next = [...list];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await onSave(order.map((i) => i.id));
    setBusy(false);
    if (res.ok) {
      toast.success("Order saved");
      onClose();
    } else {
      setError(res.error?.message ?? "Could not save the order");
    }
  };

  const changed = order.some((item, i) => item.id !== items[i]?.id);

  return (
    <Modal show={show} onClose={onClose} busy={busy} title={title} subtitle="The order New booking and /book use.">
      <ol className="mt-5 divide-y divide-line border-y border-line">
        {order.map((item, i) => (
          <li key={item.id} className="flex min-h-12 items-center gap-2">
            <span className="min-w-0 grow truncate py-2 text-body text-ink">{item.label}</span>
            <button
              type="button"
              aria-label={`Move ${item.label} up`}
              disabled={i === 0 || busy}
              onClick={() => move(i, i - 1)}
              className="flex size-11 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-30"
            >
              <ArrowUpIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.label} down`}
              disabled={i === order.length - 1 || busy}
              onClick={() => move(i, i + 1)}
              className="flex size-11 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-30"
            >
              <ArrowDownIcon className="size-5" />
            </button>
          </li>
        ))}
      </ol>
      {error && <AlertNote className="mt-4">{error}</AlertNote>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <ActionButton onClick={onClose} disabled={busy}>
          Cancel
        </ActionButton>
        <ActionButton solid onClick={save} disabled={busy || !changed}>
          {busy ? "Saving…" : "Save order"}
        </ActionButton>
      </div>
    </Modal>
  );
}

ReorderDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, label: PropTypes.string.isRequired })).isRequired,
  onSave: PropTypes.func.isRequired,
};

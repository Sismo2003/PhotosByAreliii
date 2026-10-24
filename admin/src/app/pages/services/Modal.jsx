// Dialog shell of the Services pages (add-on, package, reorder): dimmed backdrop, square paper
// panel with hairline, title + close button. Same look as galleries/gallery/DeliverDialog.jsx.
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";

export function Modal({ show, onClose, busy, title, subtitle, children }) {
  return (
    <Transition appear show={show} as={Dialog} onClose={busy ? () => {} : onClose} className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6">
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
          <div>
            <DialogTitle as="h2" className="text-[1.5rem] leading-tight text-ink">
              {title}
            </DialogTitle>
            {subtitle && <p className="mt-1 text-small text-ink-muted">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="-mt-2 -mr-2 flex size-11 items-center justify-center text-ink-muted hover:text-ink">
            <XMarkIcon className="size-6" />
          </button>
        </div>
        {children}
      </TransitionChild>
    </Transition>
  );
}

Modal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  busy: PropTypes.bool,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node,
};

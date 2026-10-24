// Import Dependencies
import PropTypes from "prop-types";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Label,
  Radio,
  RadioGroup,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Cog6ToothIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

// Local Imports
import { useDisclosure } from "hooks";
import { useThemeContext } from "app/contexts/theme/context";
import { Button, ScrollShadow } from "components/ui";

// ----------------------------------------------------------------------

// Display preferences for the admin. The palette and type are fixed by the design system;
// light/dark, the layout, the card style and where notifications appear can change.
// Opened by the template's spinning gear, restyled: square, ink, flush to the right edge.

const themeModes = [
  { value: "light", label: "Light", bg: "#ffffff", card: "#f6f5f3", ink: "#151515" },
  { value: "dark", label: "Dark", bg: "#0f0f0f", card: "#181818", ink: "#f2f2f0" },
  { value: "system", label: "System", bg: "#ffffff", card: "#f6f5f3", ink: "#151515", split: true },
];

const layouts = [
  { value: "sideblock", label: "Sideblock", hint: "Design · default" },
  { value: "main-layout", label: "Main layout", hint: "Icon rail + panel" },
];

const cardSkins = [
  { value: "bordered", label: "Hairlines" },
  { value: "shadow-sm", label: "Shadow" },
];

const notificationPositions = [
  { value: "top-right", label: "Top right" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-center", label: "Top center" },
  { value: "bottom-center", label: "Bottom center" },
];

export function DisplayButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Display settings"
      data-tooltip
      data-tooltip-content="Display"
      data-tooltip-place="left"
      className="fixed top-1/2 right-0 z-50 flex size-11 -translate-y-1/2 items-center justify-center border border-r-0 border-ink bg-ink text-on-ink outline-hidden hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* Slow spin like the template; still for people who prefer reduced motion. */}
      <Cog6ToothIcon
        className="size-6 stroke-[1.25] motion-safe:animate-spin"
        style={{ animationDuration: "6s" }}
      />
    </button>
  );
}

export default function Customizer({ renderButton }) {
  const [isOpen, { open, close }] = useDisclosure();

  return (
    <>
      {renderButton ? renderButton(open) : <DisplayButton onClick={open} />}

      <Transition show={isOpen}>
        <Dialog open={true} onClose={close} static autoFocus>
          <TransitionChild
            as="div"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            className="fixed inset-0 z-60 bg-gray-900/40 transition-opacity dark:bg-black/50"
          />

          <TransitionChild
            as={DialogPanel}
            enter="ease-out transform-gpu transition-transform duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in transform-gpu transition-transform duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
            className="fixed inset-y-0 right-0 z-61 flex w-screen transform-gpu flex-col border-l border-line bg-paper transition-transform duration-200 sm:w-80"
          >
            <CustomizerContent close={close} />
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

function CustomizerContent({ close }) {
  const theme = useThemeContext();

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <DialogTitle className="caps text-ink">Display</DialogTitle>
        <Button
          onClick={close}
          variant="flat"
          isIcon
          aria-label="Close display settings"
          className="size-11 min-h-0 px-0"
        >
          <XMarkIcon className="size-5" />
        </Button>
      </div>
      <ScrollShadow
        size={4}
        className="custom-scrollbar h-auto overflow-y-auto overscroll-contain px-6 pb-8"
      >
        <RadioGroup
          value={theme.themeMode}
          onChange={theme.setThemeMode}
          className="mt-4"
        >
          <Label className="field-label">Theme</Label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {themeModes.map((mode) => (
              <Radio
                key={mode.value}
                value={mode.value}
                className="cursor-pointer outline-hidden"
              >
                {({ checked, focus }) => (
                  <>
                    <Preview {...mode} checked={checked} focus={focus} />
                    <p className="mt-2 text-center text-small">{mode.label}</p>
                  </>
                )}
              </Radio>
            ))}
          </div>
        </RadioGroup>

        <RadioGroup
          value={theme.themeLayout}
          onChange={theme.setThemeLayout}
          className="mt-7"
        >
          <Label className="field-label">Layout</Label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {layouts.map((layout) => (
              <Radio
                key={layout.value}
                value={layout.value}
                className="cursor-pointer outline-hidden"
              >
                {({ checked, focus }) => (
                  <>
                    <LayoutPreview kind={layout.value} checked={checked} focus={focus} />
                    <p className="mt-2 text-small text-ink">{layout.label}</p>
                    <p className="text-[0.8125rem] leading-4 text-ink-muted">{layout.hint}</p>
                  </>
                )}
              </Radio>
            ))}
          </div>
        </RadioGroup>

        <OptionGroup
          label="Sections"
          value={theme.cardSkin}
          onChange={theme.setCardSkin}
          options={cardSkins}
        />

        <OptionGroup
          label="Notifications"
          value={theme.notification?.position}
          onChange={theme.setNotificationPosition}
          options={notificationPositions}
        />

        <button
          type="button"
          onClick={theme.resetTheme}
          className="caps mt-8 min-h-11 border-b border-ink text-ink"
        >
          Reset to default
        </button>
      </ScrollShadow>
    </>
  );
}

function OptionGroup({ label, value, onChange, options }) {
  return (
    <RadioGroup value={value} onChange={onChange} className="mt-7">
      <Label className="field-label">{label}</Label>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <Radio
            key={opt.value}
            value={opt.value}
            className={({ checked }) =>
              clsx(
                "flex min-h-11 cursor-pointer items-center border px-4 text-small outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ink",
                checked
                  ? "border-ink bg-ink text-on-ink"
                  : "border-line-strong text-ink",
              )
            }
          >
            {opt.label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

// Thumbnails drawn with the theme's own tokens, so they follow light/dark.
function LayoutPreview({ kind, checked, focus }) {
  return (
    <div
      className={clsx(
        "flex h-20 overflow-hidden border bg-paper",
        checked ? "border-ink outline-1 outline-ink" : "border-line",
        focus && "outline-2 outline-offset-2 outline-ink",
      )}
    >
      {kind === "sideblock" ? (
        <div className="flex w-[34%] flex-col gap-1.5 bg-paper-alt p-2">
          <div className="h-1 w-10/12 bg-ink" />
          <div className="mt-1 h-0.5 w-8/12 bg-ink-muted" />
          <div className="h-0.5 w-7/12 bg-ink-muted" />
          <div className="h-0.5 w-9/12 bg-ink-muted" />
          <div className="mt-auto h-1 w-full bg-line" />
        </div>
      ) : (
        <>
          <div className="flex w-[14%] flex-col items-center gap-1.5 bg-paper-alt py-2">
            <div className="size-2 border border-ink" />
            <div className="mt-1 size-1.5 bg-ink" />
            <div className="size-1.5 bg-ink-muted" />
            <div className="size-1.5 bg-ink-muted" />
          </div>
          <div className="flex w-[26%] flex-col gap-1.5 border-x border-line p-2">
            <div className="h-0.5 w-9/12 bg-ink" />
            <div className="h-0.5 w-7/12 bg-ink-muted" />
            <div className="h-0.5 w-8/12 bg-ink-muted" />
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="h-1.5 w-6/12 bg-ink" />
        <div className="mt-1 h-px w-full bg-line" />
        <div className="h-0.5 w-10/12 bg-ink-muted" />
        <div className="h-0.5 w-8/12 bg-ink-muted" />
      </div>
    </div>
  );
}

function Preview({ bg, card, ink, split, checked, focus }) {
  return (
    <div
      className={clsx(
        "relative h-16 overflow-hidden border",
        checked ? "border-ink outline-1 outline-ink" : "border-line",
        focus && "outline-2 outline-offset-2 outline-ink",
      )}
      style={{ backgroundColor: bg }}
    >
      <div className="absolute inset-y-0 left-0 w-1/3" style={{ backgroundColor: card }} />
      <div className="absolute top-3 right-2 left-[42%] space-y-1.5">
        <div className="h-1 w-9/12" style={{ backgroundColor: ink }} />
        <div className="h-px w-full opacity-40" style={{ backgroundColor: ink }} />
        <div className="h-px w-10/12 opacity-40" style={{ backgroundColor: ink }} />
      </div>
      {split && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#0f0f0f",
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
      )}
    </div>
  );
}

Customizer.propTypes = {
  renderButton: PropTypes.func,
};

DisplayButton.propTypes = {
  onClick: PropTypes.func,
};

LayoutPreview.propTypes = {
  kind: PropTypes.string,
  checked: PropTypes.bool,
  focus: PropTypes.bool,
};

CustomizerContent.propTypes = {
  close: PropTypes.func,
};

OptionGroup.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.array,
};

Preview.propTypes = {
  bg: PropTypes.string,
  card: PropTypes.string,
  ink: PropTypes.string,
  split: PropTypes.bool,
  checked: PropTypes.bool,
  focus: PropTypes.bool,
};

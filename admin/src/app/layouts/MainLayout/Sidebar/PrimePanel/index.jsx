// Import Dependencies
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Local Imports
import { StorageBar } from "components/shared/storage/StorageBar";
import { useStorageStatus } from "components/shared/storage/useStorageStatus";
import { Menu } from "./Menu";

// ----------------------------------------------------------------------

export function PrimePanel({ currentSegment, close }) {
  const { t } = useTranslation();
  const storage = useStorageStatus();

  return (
    <div className="prime-panel flex h-full flex-col border-r border-line">
      <div className="flex h-full grow flex-col bg-paper ltr:pl-(--main-panel-width) rtl:pr-(--main-panel-width)">
        <div className="flex h-16 w-full shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
          <p className="caps truncate text-ink">
            {currentSegment ? t(currentSegment.transKey) : "Photos by Areliii"}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close panel"
            className="flex size-11 items-center justify-center text-ink xl:hidden"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {currentSegment?.childs ? (
          <Menu nav={currentSegment.childs} />
        ) : (
          <div className="grow" />
        )}

        <StorageBar
          status={storage.status}
          error={storage.error}
          className="border-t border-line px-5 py-5"
        />
      </div>
    </div>
  );
}

PrimePanel.propTypes = {
  currentSegment: PropTypes.object,
  close: PropTypes.func,
};

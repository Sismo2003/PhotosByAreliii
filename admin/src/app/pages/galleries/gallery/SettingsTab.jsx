// "Settings" tab (design: GallerySettings): downloads, privacy, client experience, expiration and
// the danger zone. Nothing is saved until "Save settings"; only what changed is sent.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { deleteGalleryThunk, extendGalleryThunk, updateGalleryThunk, useGalleriesStore } from "slices";
import { nowInStudio, toStudio } from "utils/date";

import { ActionButton, ChoiceGroup } from "../../bookings/parts";
import { Field, inputClass } from "../../bookings/new/fields";
import { DOWNLOAD_MODES, FAVORITE_LIMITS, PRIVACY, shortDate } from "../labels";
import { Toggle } from "../parts";

const fromGallery = (g) => ({
  title: g.title,
  downloadMode: g.downloadMode,
  pinRequired: g.pinRequired,
  privacy: g.privacy,
  accessPassword: g.accessPassword ?? "",
  favoritesEnabled: g.favoritesEnabled,
  favoritesLimit: g.favoritesLimit == null ? "" : String(g.favoritesLimit),
  watermark: g.watermark,
  socialSharing: g.socialSharing,
  expiresOn: g.expiresAt ? toStudio(g.expiresAt).toFormat("yyyy-LL-dd") : "",
});

function Group({ title, hint, children }) {
  return (
    <section className="py-8 first:pt-0">
      <h2 className="caps border-b border-line pb-2 text-ink-muted">{title}</h2>
      {hint && <p className="mt-3 max-w-xl text-small text-ink-muted">{hint}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

function SwitchRow({ id, title, text, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p id={id} className="text-body text-ink">
          {title}
        </p>
        <p className="mt-1 max-w-md text-small text-ink-muted">{text}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export function SettingsTab({ gallery, onDeleted }) {
  const busy = useGalleriesStore((s) => s.busy);
  const [v, setV] = useState(() => fromGallery(gallery));
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const base = fromGallery(gallery);
  const set = (next) => setV((prev) => ({ ...prev, ...next }));
  const delivered = gallery.status === "DELIVERED";
  const expired = gallery.state?.key === "expired";
  const clientLogin = v.privacy === "CLIENT_LOGIN";
  const dirty = Object.keys(v).some((k) => v[k] !== base[k]);

  const save = async () => {
    setError(null);
    const body = {};
    for (const key of Object.keys(v)) {
      if (v[key] === base[key]) continue;
      if (key === "favoritesLimit") body[key] = v[key] === "" ? null : Number(v[key]);
      else if (key === "accessPassword" && v[key] === "") continue;
      else body[key] = v[key];
    }
    const res = await updateGalleryThunk(gallery.id, body);
    if (res.ok) {
      toast.success("Settings saved");
      setV(fromGallery(res.data));
    } else setError(res.error?.message ?? "Could not save the settings");
  };

  const newPin = async () => {
    const res = await updateGalleryThunk(gallery.id, { newPin: true });
    if (res.ok) toast.success("New download PIN created");
    else toast.error(res.error?.message ?? "Could not create a new PIN");
  };

  const extend = async () => {
    const res = await extendGalleryThunk(gallery.id, 30);
    if (res.ok) {
      toast.success("Extended 30 days");
      setV((prev) => ({ ...prev, expiresOn: fromGallery(res.data).expiresOn }));
    } else toast.error(res.error?.message ?? "Could not extend the gallery");
  };

  return (
    <div className="max-w-3xl divide-y divide-line">
      <Group title="Gallery">
        <Field label="Gallery name">{(p) => <input {...p} value={v.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} />}</Field>
      </Group>

      <Group title="Downloads" hint="High-res is the full original; web size is lighter for social media.">
        <ChoiceGroup label="Who can download" options={DOWNLOAD_MODES} value={v.downloadMode} onChange={(downloadMode) => set({ downloadMode })} />
        {v.downloadMode !== "OFF" && (
          <>
            <SwitchRow
              id="pin-title"
              title="Require download PIN"
              text="A 4-digit PIN is created automatically when you deliver the gallery and sent in the same email. Clients enter it before downloading."
              checked={v.pinRequired}
              onChange={(pinRequired) => set({ pinRequired })}
            />
            {v.pinRequired && (
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-body text-ink">
                  PIN: <span className="tracking-[0.3em] tabular-nums">{gallery.downloadPin ?? "— — — —"}</span>
                </p>
                {gallery.downloadPin && (
                  <ActionButton disabled={busy} onClick={newPin}>
                    Create a new download PIN
                  </ActionButton>
                )}
                <p className="w-full text-small text-ink-muted">{gallery.downloadPin ? "You can always find the PIN here." : "It appears here when you deliver the gallery."}</p>
              </div>
            )}
          </>
        )}
      </Group>

      <Group title="Privacy">
        <ChoiceGroup label="Who can view" options={PRIVACY} value={v.privacy} onChange={(privacy) => set({ privacy })} />
        {v.privacy === "PASSWORD" && (
          <Field label="Gallery password" hint="The client enters it to open the gallery. You can see it again here.">
            {(p) => <input {...p} value={v.accessPassword} onChange={(e) => set({ accessPassword: e.target.value })} autoComplete="off" className={inputClass} />}
          </Field>
        )}
      </Group>

      <Group title="Client experience">
        <SwitchRow
          id="fav-title"
          title="Favorites"
          text={clientLogin ? "Clients tap ♥ on photos they love. Great for choosing prints or a second-round edit." : "Favorites need the client login, so they are off with this privacy."}
          checked={v.favoritesEnabled && clientLogin}
          disabled={!clientLogin}
          onChange={(favoritesEnabled) => set({ favoritesEnabled })}
        />
        {v.favoritesEnabled && clientLogin && (
          <div className="sm:w-60">
            <label htmlFor="fav-limit" className="field-label">
              Favorites limit
            </label>
            <select id="fav-limit" value={v.favoritesLimit} onChange={(e) => set({ favoritesLimit: e.target.value })} className={inputClass}>
              {FAVORITE_LIMITS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <SwitchRow id="wm-title" title="Watermark on previews" text="Adds a small “Photos by Areliii” mark while browsing. Downloads are always clean." checked={v.watermark} onChange={(watermark) => set({ watermark })} />
        <SwitchRow id="share-title" title="Social sharing" text="Show a share button so clients can post a photo with credit to you." checked={v.socialSharing} onChange={(socialSharing) => set({ socialSharing })} />
      </Group>

      <Group title="Expiration" hint="Clients get a reminder 48 hours before it expires. After that the photos are deleted from the server.">
        {delivered ? (
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Gallery available until" className="sm:w-60">
              {(p) => (
                <input
                  {...p}
                  type="date"
                  min={nowInStudio().plus({ days: 1 }).toFormat("yyyy-LL-dd")}
                  value={v.expiresOn}
                  disabled={expired}
                  onChange={(e) => set({ expiresOn: e.target.value })}
                  className={inputClass}
                />
              )}
            </Field>
            {!expired && (
              <ActionButton disabled={busy} onClick={extend}>
                Extend 30 days
              </ActionButton>
            )}
            {expired && <p className="text-small text-alert">Expired {shortDate(gallery.expiresAt)}. Its photos are gone.</p>}
          </div>
        ) : (
          <p className="text-small text-ink-muted">It stays available for 90 days after you deliver it. You can change the date then.</p>
        )}
      </Group>

      <div className="flex flex-wrap items-center gap-3 py-8">
        <ActionButton solid disabled={!dirty || busy} onClick={save}>
          {busy ? "Saving…" : "Save settings"}
        </ActionButton>
        {dirty && (
          <ActionButton
            disabled={busy}
            onClick={() => {
              setV(fromGallery(gallery));
              setError(null);
            }}
          >
            Discard changes
          </ActionButton>
        )}
        {error && (
          <p role="alert" className="text-small text-alert">
            {error}
          </p>
        )}
      </div>

      <Group title="Delete gallery">
        <p className="max-w-xl text-small text-ink-muted">Removes the gallery and all its photos from the disk. This can’t be undone.</p>
        <ActionButton danger disabled={busy} onClick={() => setConfirmDelete(true)}>
          Delete gallery
        </ActionButton>
      </Group>

      <ConfirmModal
        show={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onOk={async () => {
          const res = await deleteGalleryThunk(gallery.id);
          setConfirmDelete(false);
          if (res.ok) {
            toast.success("Gallery deleted");
            onDeleted();
          } else toast.error(res.error?.message ?? "Could not delete the gallery");
        }}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: `Delete “${gallery.title}”?`,
            description: `Its ${gallery.totals.photoCount} photos are removed from the disk and the client loses access. There is no recycle bin.`,
            actionText: "Delete gallery",
          },
        }}
      />
    </div>
  );
}

Group.propTypes = { title: PropTypes.string, hint: PropTypes.string, children: PropTypes.node };
SwitchRow.propTypes = { id: PropTypes.string, title: PropTypes.string, text: PropTypes.string, checked: PropTypes.bool, onChange: PropTypes.func, disabled: PropTypes.bool };
SettingsTab.propTypes = { gallery: PropTypes.object.isRequired, onDeleted: PropTypes.func.isRequired };

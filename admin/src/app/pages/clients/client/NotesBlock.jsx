// "Private notes" of the client page — only Areli sees them. Saved with the button; the button
// is off until something changed.
import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "sonner";

import { updateClientThunk } from "slices";

import { ActionButton } from "../../bookings/parts";
import { Block } from "../../bookings/booking/layout";
import { TextArea } from "../../bookings/new/fields";

export function NotesBlock({ clientId, notes }) {
  const saved = notes ?? "";
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== saved.trim();

  const save = async () => {
    setBusy(true);
    const res = await updateClientThunk(clientId, { privateNotes: text.trim() || null });
    setBusy(false);
    if (res.ok) toast.success("Notes saved");
    else toast.error(res.error?.message ?? "Could not save the notes");
  };

  return (
    <Block title="Private notes" boxed>
      <label htmlFor="client-notes" className="sr-only">
        Private notes
      </label>
      <TextArea
        id="client-notes"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Only you can see this — family names, favorite spots, what they loved last time…"
      />
      <ActionButton solid className="mt-3" disabled={!dirty || busy} onClick={save}>
        {busy ? "Saving…" : "Save notes"}
      </ActionButton>
    </Block>
  );
}

NotesBlock.propTypes = { clientId: PropTypes.number.isRequired, notes: PropTypes.string };

// "Activity" tab (design: GalleryActivity): what the client does after delivery plus the
// gallery's own history. Views, downloads and favorites stay at 0 until the client gallery exists
// (INTEGRATION(client-gallery) — docs/galleries-pendientes.md); the history works today.
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";
import { getGalleryActivity } from "services/galleries";
import { formatDate } from "utils/date";

import { History } from "../../bookings/parts";
import { Block } from "../../bookings/booking/layout";

export function ActivityTab({ gallery }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(false);
  const { stats, status } = gallery;
  const delivered = status === "DELIVERED";
  const name = gallery.client?.firstName ?? gallery.client?.displayName ?? "the client";

  useEffect(() => {
    let alive = true;
    getGalleryActivity(gallery.id)
      .then(({ data }) => alive && setEvents(data.data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [gallery.id, gallery.updatedAt]);

  return (
    <div>
      <StatRow
        className="mt-0"
        items={[
          { label: "Views", value: stats.views },
          { label: "Downloads", value: stats.downloads },
          { label: "Favorites", value: stats.favorites },
          { label: "Last visit", value: stats.lastVisitAt ? formatDate(stats.lastVisitAt, "LLL d") : "—" },
        ]}
      />
      {stats.favorites === 0 && (
        <p className="mt-3 text-small text-ink-muted">
          {delivered ? "Favorites are a good moment to offer prints or an album." : `Favorites appear once ${name} opens the gallery.`}
        </p>
      )}

      <div className="mt-10 max-w-3xl">
        <Block title="History">
          {error ? (
            <p className="text-alert">Couldn’t load the history.</p>
          ) : events === null ? (
            <div aria-busy="true" aria-label="Loading history" className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto overscroll-contain pr-2">
              <History events={events} />
            </div>
          )}
        </Block>
      </div>
    </div>
  );
}

ActivityTab.propTypes = { gallery: PropTypes.object.isRequired };

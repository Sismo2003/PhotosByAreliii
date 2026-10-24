// Overview — numbers from Bookings, the next 14 days, website requests (booked vs not), site
// visits and the disk split by gallery. Each widget loads on its own (docs/api-overview.md).
// Design: AdminDashboard.dc.html.
import { Link } from "react-router";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { StatRow } from "components/shared/layout/StatRow";
import { Button } from "components/ui";
import { getSummary } from "services/bookings";
import { getOverviewBookings, getOverviewStorage, getOverviewVisits } from "services/overview";
import { todayLabel } from "utils/date";

import { money } from "../bookings/labels";
import { Agenda } from "./Agenda";
import { Widget, WidgetError } from "./parts";
import { RequestsChart } from "./RequestsChart";
import { StorageChart } from "./StorageChart";
import { useWidgetData } from "./useWidgetData";
import { VisitsWidget } from "./VisitsWidget";

// ----------------------------------------------------------------------

export default function Overview() {
  const summary = useWidgetData(getSummary);
  const bookings = useWidgetData(getOverviewBookings);
  const storage = useWidgetData(getOverviewStorage);
  const visits = useWidgetData(getOverviewVisits);
  const s = summary.data;

  return (
    <Page title="Overview">
      <div className="px-(--margin-x) pb-12">
        <PageHeader
          eyebrow={todayLabel()}
          title="Overview"
          actions={
            <Button component={Link} to="/bookings" color="primary">
              Open bookings
            </Button>
          }
        >
          <StatRow
            items={[
              { label: "Requests to confirm", value: s?.requests },
              { label: "Sessions this week", value: s?.sessionsThisWeek },
              { label: "Payments pending", value: s ? money(s.paymentsPendingCents) : null },
              { label: "Follow-ups due", value: s?.followupsDue },
            ]}
          />
        </PageHeader>
        {summary.error && <WidgetError message={summary.error} onRetry={summary.reload} />}

        <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Widget title="Coming up">
            {bookings.error && !bookings.data ? (
              <WidgetError message={bookings.error} onRetry={bookings.reload} />
            ) : (
              <Agenda data={bookings.data} />
            )}
          </Widget>

          <div className="flex flex-col gap-10">
            <Widget title="Website visits">
              {visits.error && !visits.data ? (
                <WidgetError message={visits.error} onRetry={visits.reload} />
              ) : (
                <VisitsWidget data={visits.data} />
              )}
            </Widget>
            <Widget title="Requests">
              {bookings.error && !bookings.data ? (
                <WidgetError message={bookings.error} onRetry={bookings.reload} />
              ) : (
                <RequestsChart data={bookings.data} />
              )}
            </Widget>
          </div>
        </div>

        <Widget title="Storage" link="/galleries" linkLabel="All galleries" className="mt-10">
          {storage.error && !storage.data ? (
            <WidgetError message={storage.error} onRetry={() => storage.reload(true)} />
          ) : (
            <StorageChart data={storage.data} />
          )}
        </Widget>
      </div>
    </Page>
  );
}

// Local Imports
import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Placeholder } from "components/shared/layout/Placeholder";
import { todayLabel } from "utils/date";

// ----------------------------------------------------------------------

export default function Mail() {
  return (
    <Page title="Mail">
      <div className="px-(--margin-x) pb-12">
        <PageHeader eyebrow={todayLabel()} title="Mail" />
        <Placeholder design="pending" spec="docs/correos.md §7">
          Sent emails and the Hostinger inbox, with Empty to free space.
        </Placeholder>
      </div>
    </Page>
  );
}

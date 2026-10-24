// Loading placeholder of the service page (/services/:id) — same blocks as <Body/> (identity,
// numbers, packages + side column) so nothing jumps when the data arrives.
import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";

export function ServiceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading service">
      <header className="mt-4 sm:mt-6">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-3 h-9 w-2/3 max-w-md rounded sm:h-11" />
        <Skeleton className="mt-4 h-3 w-24 rounded" />
      </header>

      {/* null values render skeleton numbers */}
      <StatRow
        className="mt-8"
        items={[
          { label: "Packages", value: null },
          { label: "From", value: null },
          { label: "Add-ons", value: null },
          { label: "Bookings", value: null },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 space-y-3">
          <Skeleton className="h-3 w-28 rounded" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </section>
        <aside className="space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-24 w-full rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-28 w-full rounded" />
        </aside>
      </div>
    </div>
  );
}

// Loading placeholder of the booking page (/bookings/:id) — same blocks as <Body/> (identity,
// stage progress, next-step card, stats, two columns) so nothing jumps when the data arrives.
import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";

export function BookingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading booking">
      <header className="mt-4 sm:mt-6">
        <Skeleton className="h-3 w-56 rounded" />
        <Skeleton className="mt-3 h-9 w-2/3 max-w-md rounded sm:h-11" />
        <div className="mt-4 flex gap-5">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </header>

      <div className="mt-8 flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-2 flex-1 rounded-full" />
        ))}
      </div>

      <Skeleton className="mt-8 h-44 w-full rounded-xl" />

      {/* null values render skeleton numbers */}
      <StatRow
        className="mt-8"
        items={[
          { label: "Total", value: null },
          { label: "Paid", value: null },
          { label: "Balance", value: null },
          { label: "Date", value: null },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          {[0, 1].map((i) => (
            <section key={i} className="space-y-3">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </section>
          ))}
        </div>
        <aside className="space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-20 w-full rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-16 w-full rounded" />
        </aside>
      </div>
    </div>
  );
}

// Loading placeholder of the client page (/clients/:id) — same blocks as <Body/> (identity,
// numbers, two columns) so nothing jumps when the data arrives.
import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";

export function ClientSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading client">
      <header className="mt-4 sm:mt-6">
        <Skeleton className="h-3 w-40 rounded" />
        <Skeleton className="mt-3 h-9 w-2/3 max-w-md rounded sm:h-11" />
        <div className="mt-4 flex gap-5">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </header>

      {/* null values render skeleton numbers */}
      <StatRow
        className="mt-8"
        items={[
          { label: "Sessions", value: null },
          { label: "Received", value: null },
          { label: "Balance due", value: null },
          { label: "Next session", value: null },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          {[0, 1].map((i) => (
            <section key={i} className="space-y-3">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-5/6 rounded" />
            </section>
          ))}
        </div>
        <aside className="space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-24 w-full rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-16 w-full rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-20 w-full rounded" />
        </aside>
      </div>
    </div>
  );
}

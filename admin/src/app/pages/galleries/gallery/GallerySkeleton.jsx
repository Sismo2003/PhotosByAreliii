// Loading placeholder of the gallery page — same blocks as the real page (identity, tabs,
// numbers, sets rail + grid) so nothing jumps when the data arrives.
import { StatRow } from "components/shared/layout/StatRow";
import { Skeleton } from "components/ui";

export function GallerySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading gallery">
      <header className="mt-4 sm:mt-6">
        <Skeleton className="h-3 w-56 rounded" />
        <Skeleton className="mt-3 h-9 w-2/3 max-w-lg rounded sm:h-11" />
        <Skeleton className="mt-4 h-3 w-40 rounded" />
      </header>
      <Skeleton className="mt-8 h-12 w-full max-w-md rounded-full" />
      <StatRow
        className="mt-6"
        items={[
          { label: "Photos", value: null },
          { label: "Hidden", value: null },
          { label: "Size", value: null },
          { label: "Available until", value: null },
        ]}
      />
      <div className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

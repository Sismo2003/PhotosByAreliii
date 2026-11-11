// Settings → Email templates (docs/correos.md §2, §9.2): every email clients (and Areli) can get,
// what triggers it, whether its text was changed, and its on/off switch. A row opens the editor.
// Table structure: skill admin-tables (Bookings shell, filters, island, phone cards, Skeleton).
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Section } from "components/shared/layout/Section";
import { FacedtedFilter } from "components/shared/table/FacedtedFilter";
import { Button, Input } from "components/ui";
import { loadEmailTemplatesThunk, useEmailStore } from "slices";

import { BookingsTable } from "../../bookings/BookingsTable";
import { ActionButton, AlertNote } from "../../bookings/parts";
import { templatePath, triggerLabel } from "../email/labels";
import { TemplateCard } from "./cells";
import { TestAllDialog } from "./TestAllDialog";
import { useTemplatesTable } from "./useTemplatesTable";
import { useTemplatesUrlState } from "./useTemplatesUrlState";

export default function EmailTemplates() {
  useTemplatesUrlState();
  const navigate = useNavigate();
  const { data, loading, error } = useEmailStore((s) => s.templates);
  const [testAll, setTestAll] = useState(false);

  useEffect(() => {
    loadEmailTemplatesThunk();
  }, []);

  const rows = useMemo(() => data?.templates.map((t) => ({ ...t, id: t.key })) ?? [], [data]);
  const table = useTemplatesTable(rows);
  const filtered = table.getFilteredRowModel().rows.length;
  const isFiltered = table.getState().columnFilters.length > 0 || Boolean(table.getState().globalFilter);

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-small text-ink-muted">
          What your clients get, and when. Change the words of any email; the design stays the same.
        </p>
        <ActionButton disabled={!data} onClick={() => setTestAll(true)}>
          Send all as test
        </ActionButton>
      </div>

      {error && <AlertNote className="mt-4">{error}</AlertNote>}

      <Section className="mt-4">
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 md:flex-nowrap">
          <Input
            value={table.getState().globalFilter ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4 text-ink-muted" />}
            placeholder="Search emails…"
            aria-label="Search emails"
            classNames={{
              root: "shrink-0",
              input: "h-8 w-56 rounded-none border-0 border-b border-line bg-transparent px-0 text-small text-ink placeholder:text-ink-muted focus:border-ink focus:ring-0",
            }}
          />
          {data && (
            <>
              <FacedtedFilter
                column={table.getColumn("group")}
                title="Group"
                options={data.groups.map((g) => ({ value: g.key, label: g.label }))}
                compact
              />
              <FacedtedFilter
                column={table.getColumn("trigger")}
                title="Sent"
                options={["auto", "manual", "scheduled"].map((t) => ({ value: t, label: triggerLabel(t) }))}
                compact
              />
            </>
          )}
          <Button
            variant="flat"
            className={clsx("h-8 shrink-0 border border-line px-3 text-small text-ink-muted hover:text-ink", !isFiltered && "invisible")}
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter("");
            }}
          >
            Reset filters
          </Button>
        </div>

        <BookingsTable
          table={table}
          onOpen={(key) => navigate(templatePath(key))}
          Card={TemplateCard}
          emptyText={isFiltered ? "No email matches." : "No emails."}
          total={filtered}
          loading={loading}
        />
      </Section>

      <Legend />

      <TestAllDialog show={testAll} onClose={() => setTestAll(false)} count={rows.length} />
    </div>
  );
}

/** One quiet line under the table for the words that need it. */
function Legend() {
  return (
    <p className="mt-4 max-w-2xl text-small text-ink-muted">
      <span className="text-ink">Original</span> — the text that came with the app.{" "}
      <span className="text-ink">Edited</span> — your version is being sent.{" "}
      <span className="text-warning">Unpublished changes</span> — you changed it but clients still get the previous text.
    </p>
  );
}

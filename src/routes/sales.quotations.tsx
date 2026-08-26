import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { CrudWorkspace, fmtCurrency, fmtDate } from "@/components/crud-workspace";
import { salesQuotations, type SalesQuotation } from "@/lib/business-data";

interface QuotationSearch {
  record: string | null;
}

export const Route = createFileRoute("/sales/quotations")({
  validateSearch: (search: Record<string, unknown>): QuotationSearch => ({
    record: typeof search.record === "string" && search.record.trim() ? search.record : null,
  }),
  component: QuotationsPage,
  head: () => ({
    meta: [
      { title: "Quotations — Cossa AI" },
      { name: "description", content: "Draft, send and track every quotation." },
      { property: "og:title", content: "Quotations — Cossa AI" },
      { property: "og:description", content: "Cossa AI quotations." },
    ],
  }),
});

const STATUSES = ["draft", "sent", "accepted", "declined", "expired"];

function Stats({ rows }: { rows: SalesQuotation[] }) {
  const open = rows.filter((r) => ["draft", "sent"].includes(r.status));
  const acceptedQuoteValue = rows
    .filter((r) => r.status === "accepted")
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const openValue = open.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const stats = [
    { label: "Quotes", value: rows.length },
    { label: "Open", value: open.length },
    { label: "Open value", value: fmtCurrency(openValue) },
    { label: "Accepted quote value", value: fmtCurrency(acceptedQuoteValue) },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
          <div className="mt-1 font-display text-2xl font-semibold">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function QuotationsPage() {
  const { record } = Route.useSearch();

  return (
    <CrudWorkspace<SalesQuotation>
      title="Quotations"
      tagline="Track quotation commitments without treating them as cash received"
      icon={FileText}
      queryKey="sales-quotations"
      fetch={salesQuotations.list}
      create={salesQuotations.create}
      update={salesQuotations.update}
      remove={salesQuotations.remove}
      singular="quotation"
      initialRecordId={record}
      Stats={Stats}
      fields={[
        { key: "number", label: "Quote number", required: true, placeholder: "Q-0001" },
        { key: "amount", label: "Amount (R)", type: "number", defaultValue: 0 },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "draft" },
        { key: "valid_until", label: "Valid until", type: "date" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "number", label: "Number", render: (r) => <span className="font-medium">{r.number}</span> },
        { key: "amount", label: "Amount", render: (r) => fmtCurrency(r.amount) },
        { key: "status", label: "Status", render: (r) => (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.status}</span>
        ) },
        { key: "valid_until", label: "Valid until", render: (r) => fmtDate(r.valid_until) },
        { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["number", "status", "notes"]}
    />
  );
}
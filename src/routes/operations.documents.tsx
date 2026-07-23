import { createFileRoute } from "@tanstack/react-router";
import { Files } from "lucide-react";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { opsDocuments, type OpsDocument } from "@/lib/business-data";

export const Route = createFileRoute("/operations/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Documents — Cossa AI" },
      { name: "description", content: "A single library for every business document." },
      { property: "og:title", content: "Documents — Cossa AI" },
      { property: "og:description", content: "Cossa AI documents." },
    ],
  }),
});

const CATEGORIES = ["contracts", "policies", "templates", "reports", "invoices", "other"];

function DocumentsPage() {
  return (
    <CrudWorkspace<OpsDocument>
      title="Documents"
      tagline="One library for everything"
      icon={Files}
      queryKey="ops-documents"
      fetch={opsDocuments.list}
      create={opsDocuments.create}
      update={opsDocuments.update}
      remove={opsDocuments.remove}
      singular="document"
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "category", label: "Category", type: "select", options: CATEGORIES },
        { key: "url", label: "Link", type: "url" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "category", label: "Category" },
        { key: "url", label: "Link", render: (r) => r.url ? (
          <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
        ) : "—" },
        { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["title", "category", "notes"]}
    />
  );
}

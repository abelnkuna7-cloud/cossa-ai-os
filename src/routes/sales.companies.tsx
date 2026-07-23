import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { salesCompanies, type SalesCompany } from "@/lib/business-data";

export const Route = createFileRoute("/sales/companies")({
  component: CompaniesPage,
  head: () => ({
    meta: [
      { title: "Companies — Cossa AI" },
      { name: "description", content: "Account-based intelligence: companies, industries, and activity." },
      { property: "og:title", content: "Companies — Cossa AI" },
      { property: "og:description", content: "Cossa AI company accounts." },
    ],
  }),
});

function CompaniesPage() {
  return (
    <CrudWorkspace<SalesCompany>
      title="Companies"
      tagline="Account-based intelligence"
      description="Track the organisations you sell into."
      icon={Building2}
      queryKey="sales-companies"
      fetch={salesCompanies.list}
      create={salesCompanies.create}
      update={salesCompanies.update}
      remove={salesCompanies.remove}
      singular="company"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "industry", label: "Industry" },
        { key: "website", label: "Website", type: "url" },
        { key: "phone", label: "Phone" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Company", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "industry", label: "Industry" },
        { key: "website", label: "Website", render: (r) => r.website ? (
          <a className="text-primary hover:underline" href={r.website} target="_blank" rel="noreferrer">{r.website}</a>
        ) : "—" },
        { key: "phone", label: "Phone" },
        { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["name", "industry", "website"]}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { UserCheck } from "lucide-react";
import { CrudWorkspace, fmtDate } from "@/components/crud-workspace";
import { salesCustomers, type SalesCustomer } from "@/lib/business-data";

export const Route = createFileRoute("/sales/customers")({
  component: CustomersPage,
  head: () => ({
    meta: [
      { title: "Customers — Cossa AI" },
      { name: "description", content: "Unified customer records across every interaction." },
      { property: "og:title", content: "Customers — Cossa AI" },
      { property: "og:description", content: "Cossa AI customer directory." },
    ],
  }),
});

const STATUSES = ["prospect", "active", "at-risk", "churned", "vip"];

function CustomersPage() {
  return (
    <CrudWorkspace<SalesCustomer>
      title="Customers"
      tagline="Know your customers, deeply"
      description="Central directory of every customer relationship."
      icon={UserCheck}
      queryKey="sales-customers"
      fetch={salesCustomers.list}
      create={salesCustomers.create}
      update={salesCustomers.update}
      remove={salesCustomers.remove}
      singular="customer"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "active" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", render: (r) => (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.status}</span>
        ) },
        { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
      ]}
      searchKeys={["name", "email", "phone", "status"]}
    />
  );
}

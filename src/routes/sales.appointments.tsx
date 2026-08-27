import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { salesAppointments, type SalesAppointment } from "@/lib/business-data";

export const Route = createFileRoute("/sales/appointments")({
  component: AppointmentsPage,
  head: () => ({
    meta: [
      { title: "Appointments — Cossa AI" },
      { name: "description", content: "Every booked meeting, in one place." },
      { property: "og:title", content: "Appointments — Cossa AI" },
      { property: "og:description", content: "Cossa AI appointments." },
    ],
  }),
});

function AppointmentsPage() {
  return (
    <CrudWorkspace<SalesAppointment>
      title="Appointments"
      tagline="Booking without the back and forth"
      icon={CalendarDays}
      queryKey="sales-appointments"
      fetch={salesAppointments.list}
      create={salesAppointments.create}
      update={salesAppointments.update}
      remove={salesAppointments.remove}
      singular="appointment"
      fields={[
        { key: "title", label: "Title", required: true },
        {
          key: "appointment_type",
          label: "Appointment type",
          placeholder: "Site inspection, consultation, follow-up, handover…",
        },
        { key: "service", label: "Service / business division" },
        { key: "customer", label: "Customer" },
        { key: "status", label: "Status", defaultValue: "scheduled" },
        { key: "starts_at", label: "Starts", type: "datetime", required: true },
        { key: "duration_minutes", label: "Duration (minutes)", type: "number" },
        { key: "ends_at", label: "Ends", type: "datetime" },
        { key: "location", label: "Location" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "title",
          label: "Title",
          render: (r) => <span className="font-medium">{r.title}</span>,
        },
        { key: "appointment_type", label: "Type", render: (r) => r.appointment_type ?? "—" },
        { key: "customer", label: "Customer", render: (r) => r.customer ?? r.customer_id ?? "—" },
        { key: "status", label: "Status", render: (r) => r.status ?? "—" },
        { key: "starts_at", label: "Starts", render: (r) => fmtDateTime(r.starts_at) },
        { key: "ends_at", label: "Ends", render: (r) => fmtDateTime(r.ends_at) },
        { key: "location", label: "Location" },
      ]}
      searchKeys={[
        "title",
        "appointment_type",
        "service",
        "customer",
        "customer_id",
        "status",
        "location",
        "notes",
      ]}
    />
  );
}

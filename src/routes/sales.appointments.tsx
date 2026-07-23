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
        { key: "starts_at", label: "Starts", type: "datetime", required: true },
        { key: "ends_at", label: "Ends", type: "datetime" },
        { key: "location", label: "Location" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "starts_at", label: "Starts", render: (r) => fmtDateTime(r.starts_at) },
        { key: "ends_at", label: "Ends", render: (r) => fmtDateTime(r.ends_at) },
        { key: "location", label: "Location" },
      ]}
      searchKeys={["title", "location", "notes"]}
    />
  );
}

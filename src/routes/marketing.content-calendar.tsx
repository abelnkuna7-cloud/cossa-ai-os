import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { growthContentCalendar, type GrowthContentItem } from "@/lib/legacy-growth-data";

export const Route = createFileRoute("/marketing/content-calendar")({
  component: ContentCalendarPage,
  head: () => ({
    meta: [
      { title: "Content Calendar — Cossa AI" },
      {
        name: "description",
        content: "Plan and manage Cossa social content using the existing Growth content calendar.",
      },
    ],
  }),
});

const PLATFORMS = ["facebook", "instagram", "tiktok", "x", "linkedin", "whatsapp"];
const EDITABLE_STATUSES = ["draft", "scheduled", "failed"];

function CalendarStats({ rows }: { rows: GrowthContentItem[] }) {
  const draft = rows.filter((row) => row.status === "draft").length;
  const scheduled = rows.filter((row) => row.status === "scheduled").length;
  const posted = rows.filter((row) => row.status === "posted").length;
  const ai = rows.filter((row) => row.ai_generated).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Drafts", draft],
        ["Scheduled", scheduled],
        ["Linked as posted", posted],
        ["AI-origin drafts", ai],
      ].map(([label, value]) => (
        <div key={String(label)} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
        </div>
      ))}
    </section>
  );
}

function ContentCalendarPage() {
  return (
    <CrudWorkspace<GrowthContentItem>
      title="Content Calendar"
      tagline="Plan first. Publish only with evidence."
      description="Restores the original Growth content scheduler records without inventing publication. Draft and schedule content here; posted status remains tied to a real social-post record."
      icon={CalendarClock}
      queryKey="growth-content-calendar"
      fetch={growthContentCalendar.list}
      create={growthContentCalendar.create}
      update={growthContentCalendar.update}
      remove={growthContentCalendar.remove}
      singular="content item"
      fields={[
        {
          key: "platform",
          label: "Platform",
          type: "select",
          options: PLATFORMS,
          required: true,
          defaultValue: "facebook",
        },
        { key: "title", label: "Title" },
        { key: "content", label: "Content", type: "textarea", required: true },
        { key: "hashtags", label: "Hashtags" },
        { key: "campaign", label: "Campaign" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: EDITABLE_STATUSES,
          defaultValue: "draft",
        },
        { key: "scheduled_for", label: "Scheduled for", type: "datetime" },
      ]}
      columns={[
        {
          key: "platform",
          label: "Platform",
          render: (row) => (
            <span className="uppercase text-xs tracking-wider text-primary">{row.platform}</span>
          ),
        },
        {
          key: "title",
          label: "Title",
          render: (row) => <span className="font-medium">{row.title || "Untitled"}</span>,
        },
        {
          key: "content",
          label: "Content",
          render: (row) => (
            <span className="line-clamp-2 max-w-md inline-block">{row.content}</span>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {row.status}
            </span>
          ),
        },
        {
          key: "scheduled_for",
          label: "Scheduled",
          render: (row) => fmtDateTime(row.scheduled_for),
        },
        {
          key: "ai_generated",
          label: "Origin",
          render: (row) => (row.ai_generated ? "Cossa AI" : "Manual"),
        },
      ]}
      searchKeys={["platform", "title", "content", "campaign", "status"]}
      Stats={CalendarStats}
      extra={
        <section className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Publication records</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record real published URLs and performance in Social Media. This calendar does not
              claim external publishing occurred by itself.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketing/social">Open Social Media</Link>
          </Button>
        </section>
      }
    />
  );
}

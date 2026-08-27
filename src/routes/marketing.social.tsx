import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";

import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { growthSocialPosts, type GrowthSocialPost } from "@/lib/legacy-growth-data";

export const Route = createFileRoute("/marketing/social")({
  component: SocialPostsPage,
  head: () => ({
    meta: [
      { title: "Social Media — Cossa AI" },
      {
        name: "description",
        content:
          "Manage real Cossa social-post records, publication evidence and performance metrics.",
      },
    ],
  }),
});

const PLATFORMS = ["facebook", "instagram", "tiktok", "x", "linkedin", "whatsapp"];
const STATUSES = ["draft", "scheduled", "published", "posted", "failed"];

function SocialStats({ rows }: { rows: GrowthSocialPost[] }) {
  const published = rows.filter((row) => ["published", "posted"].includes(row.status)).length;
  const totalReach = rows.reduce((sum, row) => sum + Number(row.reach || 0), 0);
  const totalEngagement = rows.reduce((sum, row) => sum + Number(row.engagement || 0), 0);
  const leads = rows.reduce((sum, row) => sum + Number(row.leads_generated || 0), 0);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Recorded posts", rows.length],
        ["Published with evidence", published],
        ["Recorded reach", totalReach],
        ["Leads attributed", leads],
      ].map(([label, value]) => (
        <div key={String(label)} className="glass-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {Number(value).toLocaleString("en-ZA")}
          </div>
        </div>
      ))}
      {totalEngagement > 0 ? (
        <div className="hidden">Recorded engagement: {totalEngagement}</div>
      ) : null}
    </section>
  );
}

function SocialPostsPage() {
  return (
    <CrudWorkspace<GrowthSocialPost>
      title="Social Media"
      tagline="Real posts, real evidence, real performance"
      description="Restored from the original Growth operating layer. Drafts, schedules and recorded publication performance use the existing social_posts table. A record cannot be marked published through this workspace without publication evidence."
      icon={MessageSquareText}
      queryKey="growth-social-posts"
      fetch={growthSocialPosts.list}
      create={growthSocialPosts.create}
      update={growthSocialPosts.update}
      remove={growthSocialPosts.remove}
      singular="social post"
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
        { key: "cta", label: "CTA" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          defaultValue: "draft",
        },
        { key: "scheduled_for", label: "Scheduled for", type: "datetime" },
        { key: "post_url", label: "Real post URL", type: "url" },
        { key: "posted_at", label: "Posted at", type: "datetime" },
        { key: "reach", label: "Reach", type: "number", defaultValue: 0 },
        { key: "engagement", label: "Engagement", type: "number", defaultValue: 0 },
        { key: "leads_generated", label: "Leads generated", type: "number", defaultValue: 0 },
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
          key: "posted_at",
          label: "Posted / scheduled",
          render: (row) => fmtDateTime(row.posted_at ?? row.published_at ?? row.scheduled_for),
        },
        { key: "reach", label: "Reach" },
        { key: "engagement", label: "Engagement" },
        { key: "leads_generated", label: "Leads" },
      ]}
      searchKeys={["platform", "title", "content", "status"]}
      Stats={SocialStats}
      extra={
        <section className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Content planning</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan and schedule drafts in the restored Content Calendar. Automatic external
              publishing remains capability- and approval-controlled.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/marketing/content-calendar">Open Content Calendar</Link>
          </Button>
        </section>
      }
    />
  );
}

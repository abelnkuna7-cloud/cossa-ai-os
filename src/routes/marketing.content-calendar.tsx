import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createCreativeMediaHandoff,
  contentAssistantDraftStatus,
  generateContentDraft,
  rewriteContentCommand,
  sanitiseMarketingText,
} from "@/lib/content-assistant";
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
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState("instagram");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState("");
  const contentMutation = useMutation({
    mutationFn: (command: string) =>
      generateContentDraft({
        instruction: command,
        platform,
        onToken: (text) => setDraft((current) => sanitiseMarketingText(`${current}${text}`)),
      }),
    onMutate: () => setDraft(""),
    onSuccess: (result) => setDraft(result.content),
    onError: (error) => {
      setDraft("");
      toast.error("Content draft needs attention", {
        description:
          error instanceof Error ? error.message : "The provider did not return usable copy.",
      });
    },
  });
  const saveDraftMutation = useMutation({
    mutationFn: () =>
      growthContentCalendar.create({
        platform,
        content: sanitiseMarketingText(draft),
        status: contentAssistantDraftStatus(),
        ai_generated: true,
        ai_prompt: instruction.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growth-content-calendar"] });
      toast.success("Draft added to Content Calendar", {
        description: "It is saved as a draft only. Nothing was published.",
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Draft could not be saved."),
  });
  const creativeMutation = useMutation({
    mutationFn: () => createCreativeMediaHandoff({ content: draft, platform, instruction }),
    onSuccess: (result) => {
      toast.success("Creative brief recorded", {
        description: `Request ${result.requestId.slice(0, 8)} is a brief only; no visual was generated or published.`,
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Creative brief could not be recorded."),
  });

  const generate = (command = instruction) => {
    if (!command.trim()) {
      toast.error("Describe the content you want to create.");
      return;
    }
    contentMutation.mutate(command);
  };

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
        <>
          <section className="glass-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Content Assistant</h2>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Ask naturally for customer-ready copy. Cossa keeps the output plain, records only
                  drafts, and never claims publication.
                </p>
              </div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Platform
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className="mt-1 block h-9 rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal"
                >
                  {PLATFORMS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={3}
              className="mt-4"
              placeholder="Write me an Instagram post for Cossa Tech about Google Maps."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => generate()}
                disabled={contentMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                {contentMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Create draft
              </Button>
              {draft ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDraft(sanitiseMarketingText(draft));
                      toast.success("Draft ready for review");
                    }}
                  >
                    Use as draft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={contentMutation.isPending}
                    onClick={() =>
                      generate(
                        rewriteContentCommand({ instruction: draft, mode: "shorter", platform }),
                      )
                    }
                  >
                    Rewrite shorter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={contentMutation.isPending}
                    onClick={() =>
                      generate(
                        rewriteContentCommand({ instruction: draft, mode: "stronger", platform }),
                      )
                    }
                  >
                    Rewrite stronger
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveDraftMutation.isPending}
                    onClick={() => saveDraftMutation.mutate()}
                  >
                    Add to Content Calendar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={creativeMutation.isPending}
                    onClick={() => creativeMutation.mutate()}
                  >
                    {creativeMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 h-4 w-4" />
                    )}
                    Send to Creative Media
                  </Button>
                </>
              ) : null}
            </div>
            {draft ? (
              <Textarea
                value={sanitiseMarketingText(draft)}
                onChange={(event) => setDraft(event.target.value)}
                rows={7}
                className="mt-4 bg-card/40"
                aria-label="Content Assistant draft"
              />
            ) : null}
          </section>
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
        </>
      }
    />
  );
}

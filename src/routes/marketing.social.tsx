import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, MessageSquareText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CrudWorkspace, fmtDateTime } from "@/components/crud-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { growthSocialPosts, type GrowthSocialPost } from "@/lib/legacy-growth-data";
import { generateSocialContentPack, type SocialContentPack } from "@/lib/content-assistant";

export const Route = createFileRoute("/marketing/social")({ component: SocialPostsPage });
const PLATFORMS = ["facebook", "instagram", "tiktok", "x", "linkedin", "whatsapp"];
const STATUSES = ["draft", "scheduled", "published", "posted", "failed"];

function SocialStats({ rows }: { rows: GrowthSocialPost[] }) {
  const published = rows.filter((row) => ["published", "posted"].includes(row.status)).length;
  const totalReach = rows.reduce((sum, row) => sum + Number(row.reach || 0), 0);
  const leads = rows.reduce((sum, row) => sum + Number(row.leads_generated || 0), 0);
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Recorded posts",rows.length],["Published with evidence",published],["Recorded reach",totalReach],["Leads attributed",leads]].map(([label,value])=><div key={String(label)} className="glass-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-1 font-display text-3xl font-semibold">{Number(value).toLocaleString("en-ZA")}</div></div>)}</section>;
}

function SocialAssistant() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("facebook");
  const [instruction, setInstruction] = useState("");
  const [pack, setPack] = useState<SocialContentPack | null>(null);
  const [copied, setCopied] = useState(false);
  const generate = useMutation({ mutationFn: () => generateSocialContentPack({ instruction, platform }), onSuccess: ({pack}) => { setPack(pack); setCopied(false); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed") });
  const save = useMutation({
    mutationFn: async () => { if (!pack) throw new Error("Generate content first."); return growthSocialPosts.create({ platform, title: pack.title || pack.hook, content: [pack.hook, pack.caption || pack.content].filter(Boolean).join("\n\n"), hashtags: pack.hashtags, cta: pack.cta, status: "draft" } as Partial<GrowthSocialPost>); },
    onSuccess: async () => { await qc.invalidateQueries({queryKey:["growth-social-posts"]}); toast.success("AI content saved as draft"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Unable to save draft"),
  });
  const change = (key: keyof SocialContentPack, value: string) => { setCopied(false); setPack((p) => p ? {...p,[key]:value} : p); };
  const copyPost = async () => {
    if (!pack) return;
    const readyToPost = [pack.hook, pack.caption || pack.content, pack.cta, pack.hashtags]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(readyToPost);
      setCopied(true);
      toast.success("Full post copied — caption, CTA and hashtags are ready to paste");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Clipboard access was blocked by the browser. Please allow clipboard access and try again.");
    }
  };
  return <section className="glass-card p-5 md:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-semibold">Social Media Assistant</h2><p className="mt-1 text-sm text-muted-foreground">Give one simple instruction. Get a complete ready-to-post pack, then copy it once and paste it on your chosen platform.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]"><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={platform} onChange={(e)=>setPlatform(e.target.value)}>{PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}</select><Input value={instruction} onChange={(e)=>setInstruction(e.target.value)} placeholder="e.g. NexDocs pain-point post for small businesses, strong hook" onKeyDown={(e)=>{if(e.key==="Enter"&&!generate.isPending) generate.mutate();}}/><Button disabled={generate.isPending || !instruction.trim()} onClick={()=>generate.mutate()}><Sparkles className="mr-1.5 h-4 w-4" />{generate.isPending ? "Creating…" : "Create content"}</Button></div><p className="mt-2 text-xs text-muted-foreground">Examples: “NexDocs Facebook hook”, “Cossa Tech Instagram pain-point post”, “Construction renovation lead-generation post”, “Store TikTok product caption”.</p>{pack ? <div className="mt-5 grid gap-4 rounded-xl border border-border/60 p-4 md:grid-cols-2"><label className="text-xs font-medium">Hook<Input className="mt-1" value={pack.hook} onChange={(e)=>change("hook",e.target.value)}/></label><label className="text-xs font-medium">Title<Input className="mt-1" value={pack.title} onChange={(e)=>change("title",e.target.value)}/></label><label className="text-xs font-medium md:col-span-2">Caption / message<Textarea className="mt-1 min-h-28" value={pack.caption || pack.content} onChange={(e)=>{change("caption",e.target.value);change("content",e.target.value);}}/></label><label className="text-xs font-medium">Hashtags<Input className="mt-1" value={pack.hashtags} onChange={(e)=>change("hashtags",e.target.value)}/></label><label className="text-xs font-medium">CTA<Input className="mt-1" value={pack.cta} onChange={(e)=>change("cta",e.target.value)}/></label><label className="text-xs font-medium">Recommended best time<Input className="mt-1" value={pack.best_time} onChange={(e)=>change("best_time",e.target.value)}/></label><label className="text-xs font-medium">Visual idea<Input className="mt-1" value={pack.visual_idea} onChange={(e)=>change("visual_idea",e.target.value)}/></label><div className="flex flex-wrap gap-2 md:col-span-2"><Button onClick={()=>void copyPost()}>{copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}{copied ? "Copied" : "Copy full post"}</Button><Button variant="outline" onClick={()=>save.mutate()} disabled={save.isPending}>Save as draft</Button><Button variant="outline" onClick={()=>generate.mutate()} disabled={generate.isPending}>Regenerate</Button></div><p className="text-xs text-muted-foreground md:col-span-2">Copy full post copies the hook, caption, CTA and hashtags together. Best-time and visual notes stay in Growth for planning and are not copied into the public post.</p></div> : null}</section>;
}

function SocialPostsPage() {
  return <div className="flex flex-col gap-6">
    <SocialAssistant />
    <CrudWorkspace<GrowthSocialPost>
      title="Social Media" tagline="Ask for content. Get content." description="Generated content is ready at the top. The records below are for saving, scheduling and measuring approved content." icon={MessageSquareText} queryKey="growth-social-posts" fetch={growthSocialPosts.list} create={growthSocialPosts.create} update={growthSocialPosts.update} remove={growthSocialPosts.remove} singular="social post"
      fields={[{key:"platform",label:"Platform",type:"select",options:PLATFORMS,required:true,defaultValue:"facebook"},{key:"title",label:"Title"},{key:"content",label:"Content",type:"textarea",required:true},{key:"hashtags",label:"Hashtags"},{key:"cta",label:"CTA"},{key:"status",label:"Status",type:"select",options:STATUSES,defaultValue:"draft"},{key:"scheduled_for",label:"Scheduled for",type:"datetime"},{key:"post_url",label:"Real post URL",type:"url"},{key:"posted_at",label:"Posted at",type:"datetime"},{key:"reach",label:"Reach",type:"number",defaultValue:0},{key:"engagement",label:"Engagement",type:"number",defaultValue:0},{key:"leads_generated",label:"Leads generated",type:"number",defaultValue:0}]}
      columns={[{key:"platform",label:"Platform",render:(r)=><span className="uppercase text-xs tracking-wider text-primary">{r.platform}</span>},{key:"content",label:"Content",render:(r)=><span className="line-clamp-2 max-w-md inline-block">{r.content}</span>},{key:"status",label:"Status",render:(r)=><span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{r.status}</span>},{key:"posted_at",label:"Posted / scheduled",render:(r)=>fmtDateTime(r.posted_at ?? r.published_at ?? r.scheduled_for)},{key:"reach",label:"Reach"},{key:"engagement",label:"Engagement"},{key:"leads_generated",label:"Leads"}]}
      searchKeys={["platform","title","content","status"]} Stats={SocialStats}
      extra={<section className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-semibold">Content planning</h2><p className="mt-1 text-sm text-muted-foreground">Move approved drafts into the Content Calendar. External publishing remains approval-controlled.</p></div><Button asChild variant="outline"><Link to="/marketing/content-calendar">Open Content Calendar</Link></Button></section>}
    />
  </div>;
}

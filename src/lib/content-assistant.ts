import { streamChatWithMetadata, type AiExecutionMetadata } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { contentAssistantCalendarStatus, creativeHandoffResult, sanitiseMarketingOutput } from "@/lib/operational-truth";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";
import { getMarketingDestinationLinks, resolveMarketingDestination } from "@/lib/marketing-links";
import { socialBusinessKnowledge, socialObjectiveGuidance, type SocialBusinessKey, type SocialObjective } from "@/lib/social-business-intelligence";

const db = supabase as unknown as { from: (table: string) => any };

export function sanitiseMarketingText(value: unknown): string { return sanitiseMarketingOutput(value); }

export function rewriteContentCommand(input: { instruction: string; mode: "shorter" | "stronger" | "platform"; platform?: string }): string {
  const platform = input.platform?.trim() || "the selected platform";
  if (input.mode === "shorter") return `Rewrite this shorter for ${platform}:\n${input.instruction}`;
  if (input.mode === "stronger") return `Rewrite this with a clearer, stronger customer benefit for ${platform}:\n${input.instruction}`;
  return `Adapt this for ${platform}; keep it customer-ready and natural:\n${input.instruction}`;
}

export async function generateContentDraft(input: { instruction: string; platform: string; onToken?: (text: string) => void }): Promise<{ content: string; metadata: AiExecutionMetadata }> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Describe the content you want to create.");
  const result = await streamChatWithMetadata([{ role: "user", content: instruction }], input.onToken ?? (() => undefined), {
    provider: "auto",
    system: [
      "You are the Cossa Content Assistant.",
      `Write only polished customer-ready copy for ${input.platform || "the requested channel"}.`,
      "Use concise, natural South African business English.",
      "Do not use markdown, headings, bullets, labels, code fences, internal notes, model metadata or reasoning.",
      "Do not claim a post was published, an image was generated, or an external action was completed.",
    ].join(" "),
  });
  const content = sanitiseMarketingText(result.content);
  if (!content) throw new Error("The content provider returned no usable customer-facing copy.");
  return { content, metadata: result.metadata };
}

export type SocialContentPack = { title:string; hook:string; caption:string; content:string; hashtags:string; cta:string; best_time:string; visual_idea:string; destination_key:string; link:string; business_key:string; objective:string; };
const PACK_KEYS = ["title","hook","caption","content","hashtags","cta","best_time","visual_idea","destination_key","business_key","objective"] as const;
type RawSocialPack = Record<(typeof PACK_KEYS)[number], unknown>;

function blankPack(): RawSocialPack { return Object.fromEntries(PACK_KEYS.map((key)=>[key,""])) as RawSocialPack; }

function parseLabelledPack(raw: string): Partial<RawSocialPack> {
  const result: Partial<RawSocialPack> = {};
  const aliases: Record<string,(typeof PACK_KEYS)[number]> = {
    TITLE:"title",HOOK:"hook",CAPTION:"caption",CONTENT:"content",HASHTAGS:"hashtags",CTA:"cta",
    BEST_TIME:"best_time",BESTTIME:"best_time",VISUAL_IDEA:"visual_idea",VISUALIDEA:"visual_idea",
    DESTINATION_KEY:"destination_key",DESTINATIONKEY:"destination_key",BUSINESS_KEY:"business_key",BUSINESSKEY:"business_key",OBJECTIVE:"objective",
  };
  const marker = /^\s*(?:[-*•]|\d+[.)])?\s*\*{0,2}(TITLE|HOOK|CAPTION|CONTENT|HASHTAGS|CTA|BEST_TIME|BESTTIME|VISUAL_IDEA|VISUALIDEA|DESTINATION_KEY|DESTINATIONKEY|BUSINESS_KEY|BUSINESSKEY|OBJECTIVE)\*{0,2}\s*[:=-]\s*/gim;
  const matches=[...raw.matchAll(marker)];
  for(let i=0;i<matches.length;i+=1){const current=matches[i];const next=matches[i+1];const key=aliases[String(current[1]).toUpperCase()];const start=(current.index??0)+current[0].length;const end=next?.index??raw.length;if(key)result[key]=raw.slice(start,end).trim();}
  return result;
}

function normaliseLooseJson(value: string): string {
  return value
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/,\s*([}\]])/g,"$1")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,'$1"$2"$3');
}

function readableFallback(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i,"")
    .replace(/```\s*$/i,"")
    .replace(/^\s*[{}]\s*$/gm,"")
    .replace(/^\s*["']?(title|hook|caption|content|hashtags|cta|best_time|visual_idea|destination_key|business_key|objective)["']?\s*[:=-]\s*/gim,"")
    .replace(/^\s*[-*•]\s*/gm,"")
    .trim();
}

function inferBusiness(instruction:string, selected:SocialBusinessKey): string {
  if(selected!=="auto") return selected;
  const value=instruction.toLowerCase();
  if(value.includes("nexdocs")) return "nexdocs";
  if(value.includes("construction")||value.includes("renovation")||value.includes("tiling")||value.includes("building")) return "cossa_nexus_construction";
  if(value.includes("facility")||value.includes("cleaning")) return "cossa_facility_services";
  if(value.includes("store")||value.includes("e-commerce")||value.includes("ecommerce")||value.includes("digital product")) return "cossa_store";
  if(value.includes("tech")||value.includes("website")||value.includes("seo")||value.includes("marketing")) return "cossa_tech";
  if(value.includes("growth")||value.includes("crm")||value.includes("business management")) return "growth";
  return "cossa_nexus_holdings";
}

function inferObjective(instruction:string, selected:SocialObjective): string {
  if(selected!=="auto") return selected;
  const value=instruction.toLowerCase();
  if(value.includes("pain point")||value.includes("problem")) return "pain_point";
  if(value.includes("hook")) return "hook";
  if(value.includes("awareness")) return "awareness";
  if(value.includes("educat")||value.includes("tips")||value.includes("teach")) return "educational";
  if(value.includes("lead")) return "lead_generation";
  if(value.includes("sales")||value.includes("sell")||value.includes("conversion")) return "sales";
  if(value.includes("product")) return "product_promotion";
  if(value.includes("service")) return "service_promotion";
  return "awareness";
}

function defaultHashtags(business:string): string {
  const map:Record<string,string>={
    growth:"#BusinessGrowth #CRM #BusinessManagement #SouthAfrica",
    nexdocs:"#NexDocs #BusinessDocuments #SmallBusiness #SouthAfrica",
    cossa_store:"#CossaStore #OnlineShopping #SouthAfrica",
    cossa_tech:"#CossaTech #DigitalMarketing #AI #BusinessGrowth",
    cossa_nexus_construction:"#CossaConstruction #Renovations #Construction #Pretoria #Centurion",
    cossa_facility_services:"#CossaFacilityServices #CleaningServices #FacilityManagement #Gauteng",
    cossa_nexus_holdings:"#CossaNexusHoldings #BusinessGrowth #SouthAfrica",
  }; return map[business]??map.cossa_nexus_holdings;
}

function defaultCta(objective:string): string {
  if(["sales","lead_generation","product_promotion","service_promotion"].includes(objective)) return "Get in touch to take the next step.";
  if(objective==="awareness"||objective==="educational") return "Learn more about how Cossa can help.";
  return "Explore the solution and see what fits your needs.";
}

function parseSocialPack(rawResponse:string, instruction:string, business:SocialBusinessKey, objective:SocialObjective):RawSocialPack {
  const cleaned=rawResponse.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/i,"").trim();
  if(!cleaned) throw new Error("The Social Media Specialist returned an empty response.");
  const candidates=[cleaned]; const firstBrace=cleaned.indexOf("{"); const lastBrace=cleaned.lastIndexOf("}"); if(firstBrace>=0&&lastBrace>firstBrace)candidates.push(cleaned.slice(firstBrace,lastBrace+1));
  for(const candidate of candidates){for(const attempt of [candidate,normaliseLooseJson(candidate)]){try{const parsed=JSON.parse(attempt) as Record<string,unknown>;return Object.fromEntries(PACK_KEYS.map((key)=>[key,parsed[key]??""])) as RawSocialPack;}catch{/* continue */}}}
  const labelled=parseLabelledPack(cleaned); if(labelled.caption||labelled.content||labelled.hook)return Object.fromEntries(PACK_KEYS.map((key)=>[key,labelled[key]??""])) as RawSocialPack;
  const plain=sanitiseMarketingText(readableFallback(cleaned)); if(!plain) throw new Error("The Social Media Specialist returned no usable content.");
  const fallback=blankPack(); const inferredBusiness=inferBusiness(instruction,business); const inferredObjective=inferObjective(instruction,objective); const firstSentence=(plain.match(/^.{1,140}?(?:[.!?](?:\s|$)|$)/s)?.[0]||plain.slice(0,140)).trim();
  fallback.hook=firstSentence; fallback.title=firstSentence.replace(/[.!?]+$/g,"").slice(0,100); fallback.caption=plain; fallback.content=plain; fallback.hashtags=defaultHashtags(inferredBusiness); fallback.cta=defaultCta(inferredObjective); fallback.best_time="Recommended posting time: test 07:00–09:00 or 17:00–20:00 SAST and refine using your recorded performance."; fallback.visual_idea="Create a clean brand-aligned visual that supports this message without adding unsupported claims."; fallback.business_key=inferredBusiness; fallback.objective=inferredObjective; fallback.destination_key=inferredBusiness; return fallback;
}

export async function generateSocialContentPack(input:{instruction:string;platform:string;business?:SocialBusinessKey;objective?:SocialObjective;}):Promise<{pack:SocialContentPack;metadata:AiExecutionMetadata}>{
  const instruction=input.instruction.trim(); if(!instruction) throw new Error("Tell the Social Media Assistant what you want, for example: NexDocs pain-point post.");
  const business=input.business??"auto"; const objective=input.objective??"auto"; const approvedLinks=await getMarketingDestinationLinks(); const linkDirectory=Object.entries(approvedLinks).map(([key,url])=>`${key}: ${url}`).join("; ");
  const result=await streamChatWithMetadata([{role:"user",content:instruction}],()=>undefined,{provider:"auto",system:[
    "You are Cossa Social Media Manager, Social Media Specialist, Content Strategist, Content Creator and Content Writer. Do the strategic and writing work; do not make the operator construct the post for you.",
    `Platform: ${input.platform}. Selected business: ${business}. Selected objective: ${objective}.`,
    `VERIFIED COSSA BUSINESS KNOWLEDGE:\n${socialBusinessKnowledge(business)}`,
    `CONTENT OBJECTIVE RULE: ${socialObjectiveGuidance(objective)}`,
    "If business is auto, infer the single relevant Cossa business from the user's brief and verified knowledge. If objective is auto, infer the single strongest objective. Do not mix sales, awareness, education and engagement indiscriminately.",
    "Truth rule: use only facts in VERIFIED COSSA BUSINESS KNOWLEDGE, the operator brief, and approved links. Never invent capabilities, prices, discounts, stock, statistics, guarantees, testimonials, customers, integrations, results, locations or promotions. If a requested factual claim is unsupported, omit it rather than imagine it.",
    "Position each business according to its actual business model. Do not write SaaS like construction, ecommerce like consulting, the parent group like a subsidiary, or awareness copy like a hard-sale advertisement.",
    `Only approved destination links: ${linkDirectory||"default destination unavailable"}. Choose the destination_key matching the identified business. Never invent or alter a URL; the application attaches it after generation.`,
    "Return a structured content pack. Preferred format is valid JSON with keys title, hook, caption, content, hashtags, cta, best_time, visual_idea, destination_key, business_key, objective. If formatting is difficult, plain customer-ready post copy is acceptable; Growth will safely package it.",
    "Write natural South African business English. The hook must fit the selected objective and audience. Hashtags must be relevant, not spammy. CTA intensity must match the objective.",
    "Do not say link below or link in bio unless appropriate. Do not claim publishing, reach, engagement, trends or external actions without evidence.",
  ].join("\n\n")});
  const parsed=parseSocialPack(result.content,instruction,business,objective); const text=(key:keyof RawSocialPack)=>sanitiseMarketingText(parsed[key]??""); const inferredBusiness=text("business_key")||inferBusiness(instruction,business); const inferredObjective=text("objective")||inferObjective(instruction,objective); const requestedDestination=text("destination_key")||inferredBusiness; const destination=resolveMarketingDestination(approvedLinks,requestedDestination);
  const caption=text("caption")||text("content"); const pack:SocialContentPack={title:text("title")||text("hook"),hook:text("hook"),caption,content:text("content")||caption,hashtags:text("hashtags")||defaultHashtags(inferredBusiness),cta:text("cta")||defaultCta(inferredObjective),best_time:text("best_time"),visual_idea:text("visual_idea"),destination_key:destination.key,link:destination.url,business_key:inferredBusiness,objective:inferredObjective};
  if(!pack.caption&&!pack.content) throw new Error("The Social Media Specialist returned no usable post content."); return{pack,metadata:result.metadata};
}

export async function createCreativeMediaHandoff(input:{content:string;platform:string;instruction:string;}):Promise<{requestId:string}>{
  const content=sanitiseMarketingText(input.content); if(!content) throw new Error("Generate or enter customer-ready copy before sending a creative brief."); const state=creativeHandoffResult(); const{data,error}=await db.from("creative_asset_requests").insert({organisation_id:COSSA_ORGANISATION_ID,title:`Content calendar visual brief — ${input.platform}`.slice(0,180),request_text:input.instruction.trim().slice(0,6000),asset_type:"social_graphic",platform:input.platform.trim().toLowerCase(),channels:[input.platform.trim().toLowerCase()],requirements:{source:"content_calendar",external_publication_authorised:false,generated_asset_confirmed:false},creative_brief:{copy:content,instruction:input.instruction.trim(),action:"brief_only"},copy_draft:content,lifecycle_status:state.lifecycleStatus,blocker_code:"creative_generation_not_started",blocker_message:"Creative brief recorded. No visual has been generated or published.",metadata:{source:"content_calendar_command"}}).select("id").single(); if(error) throw new Error(`Creative brief could not be recorded: ${error.message}`); if(!data?.id) throw new Error("Creative brief did not return a saved request ID."); return{requestId:String(data.id)};
}

export const contentAssistantDraftStatus=contentAssistantCalendarStatus;

// Client-side data access for AI core (conversations, messages, prompts, knowledge).
// Tables live in Supabase; policies are currently open to anon because auth is not
// enabled yet. When auth ships, tighten policies to auth.uid() and remove anon grants.
import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

// The generated Database types are still empty until Supabase regenerates them,
// so we work with a locally-typed client cast to avoid TS friction.
const db = supabase as unknown as {
  from: (t: string) => any;
};

export type AiConversation = {
  id: string;
  title: string;
  category: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

export type AiPrompt = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  tags: string[];
  usage_count: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type AiKnowledgeDoc = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  tags: string[];
  source: string | null;
  created_at: string;
  updated_at: string;
};

// Conversations
export async function listConversations(category?: string | null): Promise<AiConversation[]> {
  let q = db
    .from("ai_conversations")
    .select("*")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (category !== undefined) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AiConversation[];
}

export async function createConversation(
  title = "New conversation",
  category: string | null = null,
): Promise<AiConversation> {
  const { data, error } = await db
    .from("ai_conversations")
    .insert({ organisation_id: COSSA_ORGANISATION_ID, title, category })
    .select("*")
    .single();
  if (error) throw error;
  return data as AiConversation;
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<AiConversation, "title" | "category" | "pinned">>,
): Promise<void> {
  const { error } = await db.from("ai_conversations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await db.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}

// Messages
export async function listMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await db
    .from("ai_messages")
    .select("*")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiMessage[];
}

export async function insertMessage(
  conversationId: string,
  role: AiMessage["role"],
  content: string,
): Promise<AiMessage> {
  const { data, error } = await db
    .from("ai_messages")
    .insert({
      organisation_id: COSSA_ORGANISATION_ID,
      conversation_id: conversationId,
      role,
      content,
    })
    .select("*")
    .single();
  if (error) throw error;
  // Bump conversation updated_at so ordering reflects activity.
  await db
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data as AiMessage;
}

// Prompts
export async function listPrompts(): Promise<AiPrompt[]> {
  const { data, error } = await db
    .from("ai_prompts")
    .select("*")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiPrompt[];
}

export async function upsertPrompt(input: {
  id?: string;
  title: string;
  body: string;
  category?: string | null;
  tags?: string[];
  pinned?: boolean;
}): Promise<AiPrompt> {
  const payload = {
    organisation_id: COSSA_ORGANISATION_ID,
    title: input.title,
    body: input.body,
    category: input.category ?? null,
    tags: input.tags ?? [],
    pinned: input.pinned ?? false,
  };
  const query = input.id
    ? db.from("ai_prompts").update(payload).eq("id", input.id).select("*").single()
    : db.from("ai_prompts").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error) throw error;
  return data as AiPrompt;
}

export async function incrementPromptUsage(id: string, current: number): Promise<void> {
  await db
    .from("ai_prompts")
    .update({ usage_count: current + 1 })
    .eq("id", id);
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await db.from("ai_prompts").delete().eq("id", id);
  if (error) throw error;
}

// Knowledge
export async function listKnowledge(): Promise<AiKnowledgeDoc[]> {
  const { data, error } = await db
    .from("ai_knowledge_documents")
    .select("*")
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiKnowledgeDoc[];
}

export async function upsertKnowledge(input: {
  id?: string;
  title: string;
  body: string;
  category?: string | null;
  tags?: string[];
  source?: string | null;
}): Promise<AiKnowledgeDoc> {
  const payload = {
    organisation_id: COSSA_ORGANISATION_ID,
    title: input.title,
    body: input.body,
    category: input.category ?? null,
    tags: input.tags ?? [],
    source: input.source ?? null,
  };
  const query = input.id
    ? db.from("ai_knowledge_documents").update(payload).eq("id", input.id).select("*").single()
    : db.from("ai_knowledge_documents").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error) throw error;
  return data as AiKnowledgeDoc;
}

export async function deleteKnowledge(id: string): Promise<void> {
  const { error } = await db.from("ai_knowledge_documents").delete().eq("id", id);
  if (error) throw error;
}

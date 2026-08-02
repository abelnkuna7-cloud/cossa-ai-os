// Streams a chat completion from /api/chat. Calls onToken for every text chunk
// received; resolves with the accumulated assistant text when the stream ends.
import { supabase } from "@/integrations/supabase/client";
export async function streamChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
  system?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ messages, system }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Chat request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onToken(chunk);
    }
  }
  return full;
}

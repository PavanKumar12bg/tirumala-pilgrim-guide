import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Knowledge } from "./voice-agent";

const PUBLIC_COLS = "id, question, answer, keywords, category, source_label, source_url, ttd_verified";

/** Published Q&A only; RLS also hides drafts from visitors. Refetched so admin edits apply without code changes. */
export const knowledgeQuery = () => queryOptions({
  queryKey: ["knowledge", "public"],
  queryFn: async () => {
    const { data, error } = await supabase.from("knowledge_entries").select(PUBLIC_COLS).eq("status", "published").order("sort_order");
    if (error) throw error;
    return (data ?? []) as unknown as Knowledge[];
  },
  staleTime: 60_000,
});

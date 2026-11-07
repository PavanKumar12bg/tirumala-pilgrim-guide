import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trainingSchema } from "./voice-training";
export const voiceTrainingQuery = () => queryOptions({ queryKey: ["voice-training", "public"], staleTime: 0, queryFn: async () => {
  const { data, error } = await supabase.from("voice_query_training").select("payload").eq("active", true);
  if (error) throw error;
  return (data ?? []).flatMap(row => { const parsed = trainingSchema.safeParse(row.payload); return parsed.success ? [parsed.data] : []; });
} });
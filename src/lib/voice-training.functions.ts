import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importTraining } from "./voice-training";

export const syncVoiceTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ spreadsheetId: z.string().regex(/^[\w-]{20,200}$/), range: z.string().min(1).max(120).regex(/^[\p{L}\p{N}_ '!:$-]+$/u) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Forbidden");
    try {
      const key = process.env['GOOGLE_SHEETS_API_KEY'];
      const gatewayKey = process.env['LOVABLE_API_KEY'];
      if (!key || !gatewayKey) throw new Error("Connect Google Sheets in project connectors first");
      const response = await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${data.spreadsheetId}/values/${data.range}`, { headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) { const body = await response.text(); console.error(`Sheets failed [${response.status}]: ${body}`); throw new Error(`Google Sheets [${response.status}]: ${body}`); }
      const body = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).max(1001).default([]) }).parse(await response.json());
      const { data: places, error } = await context.supabase.from("places").select("id").eq("visible", true);
      if (error) throw error;
      const rows = importTraining(body.values.map(row => row.map(String)), new Set((places ?? []).map(p => p.id)));
      const { error: configError } = await context.supabase.from("voice_training_sync").upsert({ id: 1, spreadsheet_id: data.spreadsheetId, sheet_range: data.range });
      if (configError) throw configError;
      const { data: count, error: saveError } = await context.supabase.rpc("replace_voice_training", { _rows: rows });
      if (saveError) throw saveError;
      return { count };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronization failed";
      await context.supabase.from("voice_training_sync").upsert({ id: 1, last_error: message });
      throw new Error(message);
    }
  });
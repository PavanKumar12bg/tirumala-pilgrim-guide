import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export type Candidate = { id: string; name: string; category: string };

const schema = z.object({
  depicted: z.string(),
  place_id: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low", "none"]),
  reason: z.string(),
});
export type PhotoSuggestion = z.infer<typeof schema>;

export async function identifyPlacePhoto(apiKey: string, dataUrl: string, candidates: Candidate[]): Promise<PhotoSuggestion> {
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const list = candidates.map((c) => `${c.id} | ${c.name} | ${c.category}`).join("\n");
  const result = streamText({
    model: provider.responses(MODEL),
    instructions:
      "You help an administrator of a Tirumala (Andhra Pradesh) pilgrim guide attach photos to the correct place record. " +
      "Describe briefly what the photo shows, then pick the single best matching place id from the candidate list ONLY if the photo clearly shows that specific place " +
      "(visible signage, distinctive architecture, the temple tank, etc.). If it could be several places or none, return place_id null and confidence 'none' or 'low'. " +
      "Never invent ids. Keep 'depicted' and 'reason' to one short sentence each, in English.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Candidate places (id | name | category):\n${list}` },
          { type: "file", mediaType: dataUrl.slice(5, dataUrl.indexOf(";")), data: dataUrl },
        ],
      },
    ],
    output: Output.object({ schema }),
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  try {
    const out = await result.output;
    const valid = out.place_id && candidates.some((c) => c.id === out.place_id);
    return valid ? out : { ...out, place_id: null, confidence: out.place_id ? "none" : out.confidence };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("The AI could not produce a suggestion for this photo.");
    throw e;
  }
}

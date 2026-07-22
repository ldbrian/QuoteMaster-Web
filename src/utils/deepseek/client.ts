import OpenAI from "openai";

const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_BASE_URL = "https://api.deepseek.com";

let client: OpenAI | null = null;

function createClient(): OpenAI {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
    maxRetries: 2,
  });
}

export function getDeepSeekClient(): OpenAI {
  if (!client) {
    client = createClient();
  }
  return client;
}

export async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; responseFormat?: "json_object" | "text" }
) {
  const ds = getDeepSeekClient();

  const completion = await ds.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
    response_format:
      options?.responseFormat === "json_object"
        ? { type: "json_object" }
        : undefined,
    temperature: options?.temperature ?? 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }

  return content;
}

export function cleanJsonResponse(content: string) {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

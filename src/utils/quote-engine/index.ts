import OpenAI from "openai";

export type GenerateQuoteInput = {
  image_urls?: string[];
  user_prompt?: string;
  text_parameters?: string;
  product_description?: string;
};

export type GeneratedQuote = Record<string, unknown> & {
  product_name?: string;
  category?: string;
  analysis_reasoning?: string;
  confidence_level?: string;
  plans?: Record<string, QuotePlan>;
};

type QuotePlan = Record<string, unknown> & {
  name?: string;
  bom?: Array<Record<string, unknown>>;
  margin?: number;
  cost_range?: number[];
  total_cost?: number;
  final_price?: number;
};

const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_QWEN_MODEL = "qwen-vl-plus";
const DASHSCOPE_MULTIMODAL_ENDPOINT =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

function cleanJsonResponse(content: string) {
  let cleaned = content.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sumBomCost(bom: QuotePlan["bom"]) {
  if (!Array.isArray(bom)) return 0;

  return bom.reduce((total, item) => total + toNumber(item.cost), 0);
}

function normalizePlanPricing(plan: QuotePlan) {
  const bomTotal = sumBomCost(plan.bom);
  const costRange = Array.isArray(plan.cost_range)
    ? plan.cost_range.map((value) => toNumber(value)).filter((value) => value > 0)
    : [];

  const baseCost =
    costRange.length > 0 ? Math.max(...costRange) : toNumber(plan.total_cost, bomTotal);
  const safeBaseCost = baseCost > 0 ? baseCost : bomTotal;
  const margin = toNumber(plan.margin, 0.3);
  const finalPrice = toNumber(plan.final_price, safeBaseCost * (1 + margin));

  return {
    ...plan,
    margin,
    total_cost: roundMoney(toNumber(plan.total_cost, safeBaseCost)),
    cost_range:
      costRange.length > 0
        ? costRange.map(roundMoney)
        : [roundMoney(safeBaseCost), roundMoney(safeBaseCost)],
    final_price: roundMoney(finalPrice),
  };
}

export function normalizeQuotePricing(quote: GeneratedQuote): GeneratedQuote {
  const plans = quote.plans;

  if (!plans || typeof plans !== "object") {
    return quote;
  }

  const normalizedPlans = Object.fromEntries(
    Object.entries(plans).map(([key, plan]) => [key, normalizePlanPricing(plan)])
  );

  return {
    ...quote,
    plans: normalizedPlans,
  };
}

async function postJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeImageParameters(input: GenerateQuoteInput) {
  const imageUrls = input.image_urls?.filter(Boolean) ?? [];
  const textContext = [
    input.product_description,
    input.text_parameters,
    input.user_prompt,
  ]
    .filter(Boolean)
    .join("\n");

  if (imageUrls.length === 0) {
    return textContext || "No image provided. Estimate from the user's text requirements only.";
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return [
      "Image analysis skipped because DASHSCOPE_API_KEY is not configured.",
      "Use the visible image URLs and user text as product context.",
      `Image URLs: ${imageUrls.join(", ")}`,
      textContext,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const content = [
    ...imageUrls.map((url) => ({ image: url })),
    {
      text: [
        "You are a senior international trade product engineer.",
        "Analyze the product images without assuming any fixed industry.",
        "Extract topic, product_keywords, materials, structure, process, visible quality level, risk points, and any commercial requirements.",
        "Do not include packaging or freight as factory BOM cost unless the user explicitly asks for it.",
        input.user_prompt ? `User requirement: ${input.user_prompt}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await postJsonWithTimeout(
        DASHSCOPE_MULTIMODAL_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.DASHSCOPE_VL_MODEL || DEFAULT_QWEN_MODEL,
            input: {
              messages: [
                {
                  role: "user",
                  content,
                },
              ],
            },
          }),
        },
        60_000
      );

      if (!response.ok) {
        throw new Error(`DashScope returned ${response.status}`);
      }

      const data = (await response.json()) as {
        output?: {
          choices?: Array<{
            message?: {
              content?: Array<{ text?: string }>;
            };
          }>;
        };
      };
      const description = data.output?.choices?.[0]?.message?.content?.[0]?.text;

      if (description) return description;
    } catch (error) {
      if (attempt === 3) {
        return [
          `Image analysis failed: ${error instanceof Error ? error.message : "unknown error"}.`,
          `Image URLs: ${imageUrls.join(", ")}`,
          textContext,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }
  }

  return textContext;
}

function createDeepSeekClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL,
    maxRetries: 3,
  });
}

export async function calculateQuoteWithDeepSeek(
  productDescription: string,
  userPrompt = ""
) {
  const client = createDeepSeekClient();

  const systemPrompt = `
You are a senior international trade quotation engineer and factory cost analyst.
Your job is to estimate an FOB-style quotation from product evidence and buyer requirements.

Core rules:
1. Never assume a fixed industry. Route by visible materials, process, structure, order quantity, sampling, negotiation, and factory cost drivers.
2. Produce Plan A as faithful production, and Plan B as a cost-down alternative when possible.
3. BOM must include raw material and processing costs. Do not include freight. Include packaging only when the product or buyer explicitly requires packaging.
4. Apply a realistic margin to each plan. If no better evidence exists, use 25%-35%.
5. Return strict JSON only. No Markdown.

Required JSON shape:
{
  "category": "Hardware | Apparel | Packaging | Electronics | HomeGoods | Medical | Other",
  "product_name": "Concise English product name",
  "analysis_reasoning": "Short Chinese reasoning explaining category, cost logic, and uncertainty.",
  "confidence_level": "高 | 中 | 低",
  "disclaimer": "Short Chinese disclaimer that this is an estimated factory quotation.",
  "eta_forecast": {
    "sample_time": "5-10 Days",
    "production_time": "15-30 Days"
  },
  "factory_warnings": "Chinese factory risk notes and sampling reminders.",
  "whatsapp_script": "Short practical English reply to buyer with MOQ, rough price, and next step.",
  "plans": {
    "plan_a": {
      "name": "Plan A - Standard Match",
      "simplified_materials": "English material/process summary",
      "moq": 1000,
      "bom": [
        { "name": "Main material / process", "cost": 0.0 }
      ],
      "margin": 0.3,
      "cost_range": [0.0, 0.0],
      "final_price": 0.0
    },
    "plan_b": {
      "name": "Plan B - Cost Down",
      "simplified_materials": "English alternative material/process summary",
      "moq": 3000,
      "bom": [
        { "name": "Cost-down material / process", "cost": 0.0 }
      ],
      "margin": 0.25,
      "cost_range": [0.0, 0.0],
      "final_price": 0.0
    }
  }
}
`;

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_QUOTE_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          "Product evidence and extracted parameters:",
          productDescription,
          "",
          userPrompt ? `Buyer/operator requirement: ${userPrompt}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("DeepSeek returned empty quote content");
  }

  return JSON.parse(cleanJsonResponse(rawContent)) as GeneratedQuote;
}

export async function generateQuote(input: GenerateQuoteInput) {
  const productDescription = await analyzeImageParameters(input);
  const rawQuote = await calculateQuoteWithDeepSeek(
    productDescription,
    input.user_prompt || input.text_parameters || ""
  );

  return {
    quote: normalizeQuotePricing(rawQuote),
    product_description: productDescription,
  };
}

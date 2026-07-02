import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { generateQuote, type GenerateQuoteInput } from "@/src/utils/quote-engine";
import { prisma } from "@/src/utils/prisma";

type GenerateQuotePayload = GenerateQuoteInput & {
  thread_id?: string;
  status?: string;
};

function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function jsonError(error: string, status = 500) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as GenerateQuotePayload;
    const threadId = payload.thread_id?.trim();

    if (!threadId) {
      return jsonError("thread_id is required", 400);
    }

    const existingThread = await prisma.businessThread.findUnique({
      where: {
        id: threadId,
      },
      select: {
        id: true,
      },
    });

    if (!existingThread) {
      return jsonError("BusinessThread not found", 404);
    }

    const generated = await generateQuote({
      image_urls: payload.image_urls,
      user_prompt: payload.user_prompt,
      text_parameters: payload.text_parameters,
      product_description: payload.product_description,
    });

    const quoteStatus = payload.status?.trim() || "SENT";
    const now = new Date();
    const quoteParameters = JSON.parse(
      JSON.stringify({
        input: {
          image_urls: payload.image_urls ?? [],
          user_prompt: payload.user_prompt ?? "",
          text_parameters: payload.text_parameters ?? "",
          product_description: payload.product_description ?? "",
        },
        extracted_product_description: generated.product_description,
        quote: generated.quote,
        engine: {
          provider: "DeepSeek",
          vision_provider: process.env.DASHSCOPE_API_KEY ? "DashScope Qwen-VL" : "Text fallback",
          generated_at: now.toISOString(),
        },
      })
    ) as Prisma.InputJsonObject;

    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          thread_id: threadId,
          status: quoteStatus,
          parameters: quoteParameters,
        },
      });

      const thread = await tx.businessThread.update({
        where: {
          id: threadId,
        },
        data: {
          last_active_at: now,
          attention_state: "WAITING",
        },
        select: {
          id: true,
          attention_state: true,
          last_active_at: true,
        },
      });

      return { quote, thread };
    });

    return jsonSuccess({
      quote_id: result.quote.id,
      thread_id: result.thread.id,
      status: result.quote.status,
      thread_attention_state: result.thread.attention_state,
      thread_last_active_at: result.thread.last_active_at,
      quote: generated.quote,
    });
  } catch (error) {
    console.error("POST /api/quote/generate failed:", error);

    if (error instanceof SyntaxError) {
      return jsonError("Invalid JSON request body", 400);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return jsonError(`Database request failed: ${error.code}`, 500);
    }

    return jsonError(error instanceof Error ? error.message : "Internal server error", 500);
  }
}


import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { prisma } from "@/src/utils/prisma";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type IngestCommunicationPayload = {
  source_email?: string;
  message_body?: string;
  timestamp?: string;
  source?: "EMAIL" | "WHATSAPP" | "WECHAT" | string;
  title?: string;
  topic?: string;
  page_url?: string;
  message_hash?: string;
  capture_mode?: string;
};

type AdvancementContext = {
  company_name?: string | null;
  country?: string | null;
  email_domain?: string | null;
  current_intent?: string | null;
  current_need?: string | null;
  next_best_action?: string | null;
  action_reason?: string | null;
  deadline?: string | null;
  quantity?: string | null;
  moq?: string | null;
  incoterm?: string | null;
  target_price?: string | null;
  sample_status?: string | null;
  risk_level?: "High" | "Medium" | "Low" | "Unknown" | null;
  priority_reason?: string | null;
  thread_summary?: string | null;
  key_requirements?: string[];
  blockers?: string[];
  decision_signals?: string[];
};

type IdentityResolutionDecision = {
  is_valid_b2b_inquiry?: boolean;
  rejection_reason?: string | null;
  identity_resolution?: {
    same_business_entity?: boolean;
    matched_thread_id?: string | null;
    identity_cluster_key?: string | null;
    confidence_score?: number;
    reason?: string;
  };
  advancement_context?: AdvancementContext;
  thread_decision?: {
    action?: "MATCH_EXISTING_THREAD" | "CREATE_NEW_THREAD";
    recommended_title?: string;
    business_state?: string;
    attention_state?: string;
  };
};

type ActiveThreadResolutionResult = {
  ignored?: false;
  thread_id: string;
  created_new: boolean;
  context: AdvancementContext;
  business_state: BusinessStateValue;
  attention_state: AttentionStateValue;
  identity_cluster_key: string;
  related_thread_id?: string | null;
  reasoning: string;
};

type IgnoredThreadResolutionResult = {
  ignored: true;
  rejection_reason: string;
  reasoning: string;
};

type ThreadResolutionResult = ActiveThreadResolutionResult | IgnoredThreadResolutionResult;

type BusinessStateValue =
  | "NEW_INQUIRY"
  | "REQUIREMENT"
  | "NEED_QUOTE"
  | "NEGOTIATION"
  | "SAMPLING"
  | "CLOSING"
  | "DORMANT";

type AttentionStateValue = "ACTION_NEEDED" | "FOLLOW_UP" | "WAITING" | "COMPLETED";

const ACTIVE_BUSINESS_STATES: BusinessStateValue[] = [
  "NEW_INQUIRY",
  "REQUIREMENT",
  "NEED_QUOTE",
  "NEGOTIATION",
  "SAMPLING",
  "CLOSING",
];

const BUSINESS_STATES = new Set<BusinessStateValue>([
  "NEW_INQUIRY",
  "REQUIREMENT",
  "NEED_QUOTE",
  "NEGOTIATION",
  "SAMPLING",
  "CLOSING",
  "DORMANT",
]);

const ATTENTION_STATES = new Set<AttentionStateValue>([
  "ACTION_NEEDED",
  "FOLLOW_UP",
  "WAITING",
  "COMPLETED",
]);

function createDeepSeekClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function extractEmailDomain(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.includes("@") ? normalized.split("@")[1] || "unknown-domain" : normalized;
}

function parseIncomingTimestamp(timestamp?: string) {
  if (!timestamp) return new Date();

  const localFormat = timestamp.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );

  if (localFormat) {
    const [, year, month, day, hour, minute, second] = localFormat;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sanitizeThreadTitle(title?: string) {
  const normalized = (title || "New Business Thread")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return normalized.slice(0, 80) || "New Business Thread";
}

function takeSignals(values?: string[], limit = 3) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBusinessState(value?: string | null): BusinessStateValue {
  const normalized = String(value || "").trim().toUpperCase() as BusinessStateValue;
  return BUSINESS_STATES.has(normalized) ? normalized : "NEW_INQUIRY";
}

function normalizeAttentionState(value?: string | null): AttentionStateValue | null {
  const normalized = String(value || "").trim().toUpperCase() as AttentionStateValue;
  return ATTENTION_STATES.has(normalized) ? normalized : null;
}

function inferAttentionState(context: AdvancementContext, businessState: BusinessStateValue) {
  const nextAction = `${context.next_best_action || ""} ${context.deadline || ""}`.toLowerCase();

  if (businessState === "DORMANT") return "COMPLETED";
  if (businessState === "NEED_QUOTE" || businessState === "REQUIREMENT") return "ACTION_NEEDED";
  if (/today|urgent|asap|deadline|due/i.test(nextAction)) return "ACTION_NEEDED";
  if (businessState === "SAMPLING") return "WAITING";
  if (businessState === "NEGOTIATION" || businessState === "CLOSING") return "FOLLOW_UP";

  return "ACTION_NEEDED";
}

function normalizeAdvancementContext(
  sourceEmail: string,
  decision?: AdvancementContext | null
): AdvancementContext {
  return {
    company_name: normalizeNullableString(decision?.company_name),
    country: normalizeNullableString(decision?.country),
    email_domain: normalizeNullableString(decision?.email_domain) || extractEmailDomain(sourceEmail),
    current_intent: normalizeNullableString(decision?.current_intent) || "New inquiry",
    current_need: normalizeNullableString(decision?.current_need) || "Clarify the current buying requirement.",
    next_best_action: normalizeNullableString(decision?.next_best_action) || "Review the message and decide the next commercial step.",
    action_reason: normalizeNullableString(decision?.action_reason),
    deadline: normalizeNullableString(decision?.deadline),
    quantity: normalizeNullableString(decision?.quantity),
    moq: normalizeNullableString(decision?.moq),
    incoterm: normalizeNullableString(decision?.incoterm),
    target_price: normalizeNullableString(decision?.target_price),
    sample_status: normalizeNullableString(decision?.sample_status),
    risk_level: decision?.risk_level || "Unknown",
    priority_reason: normalizeNullableString(decision?.priority_reason),
    thread_summary: normalizeNullableString(decision?.thread_summary),
    key_requirements: takeSignals(decision?.key_requirements, 5),
    blockers: takeSignals(decision?.blockers, 4),
    decision_signals: takeSignals(decision?.decision_signals, 3),
  };
}

function buildIdentityClusterKey(sourceEmail: string, companyName?: string | null) {
  const domain = extractEmailDomain(sourceEmail);
  const normalizedCompany = (companyName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedCompany ? `${domain}::${normalizedCompany}` : domain;
}
async function findExistingCommunicationByHash(messageHash: string | undefined, ownerUserId: string) {
  const normalizedHash = typeof messageHash === "string" ? messageHash.trim() : "";
  if (!normalizedHash) return null;

  return prisma.communication.findFirst({
    where: {
      thread: { owner_user_id: ownerUserId },
      extracted_signals: {
        path: ["message_hash"],
        equals: normalizedHash,
      },
    },
    select: {
      id: true,
      thread_id: true,
    },
  });
}

async function createThreadFromContext(
  ownerUserId: string,
  sourceEmail: string,
  context: AdvancementContext,
  db: Prisma.TransactionClient | typeof prisma,
  options?: {
    title?: string;
    business_state?: BusinessStateValue;
    attention_state?: AttentionStateValue;
    related_thread_id?: string | null;
    identity_cluster_key?: string;
  }
): Promise<ThreadResolutionResult> {
  const businessState = options?.business_state || "NEW_INQUIRY";
  const attentionState = options?.attention_state || inferAttentionState(context, businessState);
  const identityClusterKey =
    options?.identity_cluster_key || buildIdentityClusterKey(sourceEmail, context.company_name);

  const createdThread = await db.businessThread.create({
    data: {
      title: sanitizeThreadTitle(options?.title || context.current_intent || context.current_need || undefined),
      owner_user_id: ownerUserId,
      business_state: businessState,
      attention_state: attentionState,
      company_name: context.company_name,
      country: context.country,
      source_email: normalizeEmail(sourceEmail),
      email_domain: context.email_domain || extractEmailDomain(sourceEmail),
      identity_cluster_key: identityClusterKey,
      related_thread_id: options?.related_thread_id || null,
      context: context as Prisma.InputJsonValue,
      context_updated_at: new Date(),
      last_active_at: new Date(),
    },
    select: {
      id: true,
      identity_cluster_key: true,
      related_thread_id: true,
    },
  });

  return {
    thread_id: createdThread.id,
    created_new: true,
    context,
    business_state: businessState,
    attention_state: attentionState,
    identity_cluster_key: createdThread.identity_cluster_key || identityClusterKey,
    related_thread_id: createdThread.related_thread_id,
    reasoning: "Created a new thread advancement context.",
  };
}

async function resolveThreadByIdentity(
  ownerUserId: string,
  sourceEmail: string,
  messageBody: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ThreadResolutionResult> {
  try {
    const normalizedSourceEmail = normalizeEmail(sourceEmail);
    const emailDomain = extractEmailDomain(normalizedSourceEmail);

    const candidateThreads = await db.businessThread.findMany({
      where: {
        business_state: {
          in: [...ACTIVE_BUSINESS_STATES],
        },
        owner_user_id: ownerUserId,
        OR: [{ source_email: normalizedSourceEmail }, { email_domain: emailDomain }],
      },
      select: {
        id: true,
        title: true,
        business_state: true,
        attention_state: true,
        company_name: true,
        country: true,
        source_email: true,
        email_domain: true,
        identity_cluster_key: true,
        context: true,
        last_active_at: true,
      },
      orderBy: {
        last_active_at: "desc",
      },
      take: 20,
    });

    const deepseek = createDeepSeekClient();
    const completion = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: [
            "You are QuoteMaster's Thread Advancement Engine for international trade workflows.",
            "Your job is not to describe a customer profile. Your job is to decide what this business thread needs next.",
            "Before thread matching, reject non-B2B noise. Set is_valid_b2b_inquiry=false for verification codes, login alerts, system notifications, newsletters, ads, personal chat, and generic platform messages.",
            "Set is_valid_b2b_inquiry=true only for real international-trade or B2B commercial communication about inquiry, quotation, requirements, orders, samples, negotiation, payment, shipping, delivery, or after-sales business.",
            "Classify the new message into an existing BusinessThread when it continues the same deal, sample, quote, negotiation, shipment, or payment context.",
            "Create a new thread only when the message is clearly about a different commercial opportunity.",
            "Keep thread titles stable and business-object oriented, such as '304 SS Flanges' or 'Hospital Tender Masks'. Do not make titles look like email subjects.",
            "Extract only decision-changing signals. Do not explain everything. decision_signals must contain at most 3 short items such as 'Deadline Friday', 'MOQ 2000', 'Need FOB', 'Price Comparison', 'Sample Paid'.",
            "Use business_state to represent where the deal is: NEW_INQUIRY, REQUIREMENT, NEED_QUOTE, NEGOTIATION, SAMPLING, CLOSING, DORMANT.",
            "Use attention_state to represent urgency: ACTION_NEEDED, FOLLOW_UP, WAITING, COMPLETED.",
            "Output only valid JSON.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Existing candidate BusinessThreads JSON:",
            JSON.stringify(candidateThreads),
            "",
            `Source email: ${normalizedSourceEmail}`,
            `Email domain: ${emailDomain}`,
            "",
            "New message:",
            messageBody,
            "",
            "Return exactly one JSON object with this structure:",
            JSON.stringify({
              is_valid_b2b_inquiry: true,
              rejection_reason: "null when valid; one short reason when invalid",
              identity_resolution: {
                same_business_entity: true,
                matched_thread_id: "uuid-or-null",
                identity_cluster_key: "stable-string-or-null",
                confidence_score: 0,
                reason: "one sentence",
              },
              advancement_context: {
                company_name: "string-or-null",
                country: "string-or-null",
                email_domain: "string-or-null",
                current_intent: "Need Quote | Revise Quote | Sampling | Follow-up | Closing | Clarify Requirement",
                current_need: "what this deal needs right now",
                next_best_action: "the concrete next action for the salesperson",
                action_reason: "why this action matters",
                deadline: "short deadline or null",
                quantity: "quantity or null",
                moq: "MOQ or null",
                incoterm: "FOB | EXW | CIF | DDP | null",
                target_price: "target price or null",
                sample_status: "sample status or null",
                risk_level: "High | Medium | Low | Unknown",
                priority_reason: "why this should or should not be prioritized",
                thread_summary: "one concise sentence about the current deal state",
                key_requirements: ["requirement 1", "requirement 2"],
                blockers: ["missing info 1"],
                decision_signals: ["Deadline Friday", "MOQ 2000", "Need FOB"],
              },
              thread_decision: {
                action: "MATCH_EXISTING_THREAD | CREATE_NEW_THREAD",
                recommended_title: "stable business-object title",
                business_state: "NEED_QUOTE",
                attention_state: "ACTION_NEEDED",
              },
            }),
          ].join("\n"),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return createThreadFromContext(ownerUserId, sourceEmail, normalizeAdvancementContext(sourceEmail, null), db);
    }

    let decision: IdentityResolutionDecision;
    try {
      decision = JSON.parse(rawContent) as IdentityResolutionDecision;
    } catch {
      return createThreadFromContext(ownerUserId, sourceEmail, normalizeAdvancementContext(sourceEmail, null), db);
    }

    if (decision.is_valid_b2b_inquiry === false) {
      return {
        ignored: true,
        rejection_reason: decision.rejection_reason || "Non-B2B email rejected by AI classifier.",
        reasoning:
          decision.rejection_reason || "Ignored because the message is not a valid B2B trade inquiry.",
      };
    }

    const context = normalizeAdvancementContext(sourceEmail, decision.advancement_context);
    const businessState = normalizeBusinessState(decision.thread_decision?.business_state);
    const attentionState =
      normalizeAttentionState(decision.thread_decision?.attention_state) ||
      inferAttentionState(context, businessState);
    const identityClusterKey =
      decision.identity_resolution?.identity_cluster_key ||
      buildIdentityClusterKey(sourceEmail, context.company_name);
    const matchedThreadId = decision.identity_resolution?.matched_thread_id || null;
    const shouldMatchExisting =
      decision.thread_decision?.action === "MATCH_EXISTING_THREAD" && matchedThreadId;

    if (shouldMatchExisting) {
      const matchedThread = await db.businessThread.findFirst({
        where: {
          id: matchedThreadId,
          owner_user_id: ownerUserId,
          OR: [{ source_email: normalizedSourceEmail }, { email_domain: emailDomain }],
        },
        select: {
          id: true,
          identity_cluster_key: true,
        },
      });

      if (matchedThread) {
        await db.businessThread.updateMany({
          where: {
            id: matchedThread.id,
            owner_user_id: ownerUserId,
          },
          data: {
            company_name: context.company_name,
            country: context.country,
            source_email: normalizedSourceEmail,
            email_domain: context.email_domain || emailDomain,
            identity_cluster_key: matchedThread.identity_cluster_key || identityClusterKey,
            business_state: businessState,
            attention_state: attentionState,
            context: context as Prisma.InputJsonValue,
            context_updated_at: new Date(),
          },
        });

        return {
          thread_id: matchedThread.id,
          created_new: false,
          context,
          business_state: businessState,
          attention_state: attentionState,
          identity_cluster_key: matchedThread.identity_cluster_key || identityClusterKey,
          related_thread_id: null,
          reasoning: decision.identity_resolution?.reason || "Matched to an existing business thread.",
        };
      }
    }

    const latestRelatedThread = candidateThreads[0]?.id || null;
    return createThreadFromContext(ownerUserId, sourceEmail, context, db, {
      title: decision.thread_decision?.recommended_title,
      business_state: businessState,
      attention_state: attentionState,
      related_thread_id: latestRelatedThread,
      identity_cluster_key: identityClusterKey,
    });
  } catch (error) {
    console.error("resolveThreadByIdentity failed:", error);
    return createThreadFromContext(ownerUserId, sourceEmail, normalizeAdvancementContext(sourceEmail, null), db);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthenticatedUser(req);

    if (!auth.user) {
      return jsonResponse({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const ownerUserId = auth.user.id;
    const payload = (await req.json()) as IngestCommunicationPayload;
    const sourceEmail = payload.source_email?.trim();
    const messageBody = payload.message_body?.trim();
    const source = payload.source || "EMAIL";

    if (!sourceEmail) {
      return jsonResponse({ success: false, error: "source_email is required" }, { status: 400 });
    }

    if (!messageBody) {
      return jsonResponse({ success: false, error: "message_body is required" }, { status: 400 });
    }

    const existingCommunication = await findExistingCommunicationByHash(payload.message_hash, ownerUserId);
    if (existingCommunication) {
      return jsonResponse({
        success: true,
        duplicate: true,
        message: "Duplicate communication ignored",
        thread_id: existingCommunication.thread_id,
        communication_id: existingCommunication.id,
      });
    }

    const messageTimestamp = parseIncomingTimestamp(payload.timestamp);
    const resolution = await resolveThreadByIdentity(ownerUserId, sourceEmail, messageBody, prisma);

    if (resolution.ignored) {
      return jsonResponse({
        success: true,
        message: "Ignored non-B2B email",
        reason: resolution.rejection_reason,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const communication = await tx.communication.create({
        data: {
          thread_id: resolution.thread_id,
          source,
          message_body: messageBody,
          is_from_customer: true,
          timestamp: messageTimestamp,
          extracted_signals: {
            owner_user_id: ownerUserId,
            source_email: normalizeEmail(sourceEmail),
            email_domain: extractEmailDomain(sourceEmail),
            title: payload.title || null,
            page_url: payload.page_url || null,
            message_hash: payload.message_hash || null,
            capture_mode: payload.capture_mode || null,
            advancement_context: resolution.context,
            business_state: resolution.business_state,
            attention_state: resolution.attention_state,
            identity_cluster_key: resolution.identity_cluster_key,
          } as Prisma.InputJsonValue,
        },
      });

      const updatedThread = await tx.businessThread.updateMany({
        where: {
          id: resolution.thread_id,
          owner_user_id: ownerUserId,
        },
        data: {
          company_name: resolution.context.company_name,
          country: resolution.context.country,
          source_email: normalizeEmail(sourceEmail),
          email_domain: resolution.context.email_domain || extractEmailDomain(sourceEmail),
          identity_cluster_key: resolution.identity_cluster_key,
          business_state: resolution.business_state,
          attention_state: resolution.attention_state,
          context: resolution.context as Prisma.InputJsonValue,
          context_updated_at: messageTimestamp,
          last_active_at: messageTimestamp,
        },
      });

      if (updatedThread.count !== 1) {
        throw new Error("Thread ownership check failed");
      }

      const thread = await tx.businessThread.findUniqueOrThrow({
        where: { id: resolution.thread_id },
      });

      return {
        thread,
        communication,
        createdNewThread: resolution.created_new,
        reasoning: resolution.reasoning,
        context: resolution.context,
      };
    });


    return jsonResponse({
      success: true,
      thread_id: result.thread.id,
      communication_id: result.communication.id,
      created_new_thread: result.createdNewThread,
      context: result.context,
      reasoning: result.reasoning,
    });
  } catch (error) {
    console.error("POST /api/ingest/communication failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return jsonResponse(
        { success: false, error: "Database request failed", code: error.code },
        { status: 500 }
      );
    }

    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}



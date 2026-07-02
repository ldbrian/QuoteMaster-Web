import type { Prisma } from "@prisma/client";
import DashboardClient, {
  type DashboardThread,
} from "./components/DashboardClient";
import { prisma } from "@/src/utils/prisma";

export const dynamic = "force-dynamic";

type BusinessThreadRecord = Awaited<ReturnType<typeof getBusinessThreads>>[number];

type ThreadContextObject = Prisma.JsonObject & {
  company_name?: Prisma.JsonValue;
  country?: Prisma.JsonValue;
  email_domain?: Prisma.JsonValue;
  current_intent?: Prisma.JsonValue;
  current_need?: Prisma.JsonValue;
  next_best_action?: Prisma.JsonValue;
  action_reason?: Prisma.JsonValue;
  deadline?: Prisma.JsonValue;
  quantity?: Prisma.JsonValue;
  moq?: Prisma.JsonValue;
  incoterm?: Prisma.JsonValue;
  target_price?: Prisma.JsonValue;
  sample_status?: Prisma.JsonValue;
  risk_level?: Prisma.JsonValue;
  priority_reason?: Prisma.JsonValue;
  thread_summary?: Prisma.JsonValue;
  key_requirements?: Prisma.JsonValue;
  blockers?: Prisma.JsonValue;
  decision_signals?: Prisma.JsonValue;
  history_summary?: Prisma.JsonValue;
  negotiation_style?: Prisma.JsonValue;
  responsiveness?: Prisma.JsonValue;
  repeat_potential?: Prisma.JsonValue;
  price_sensitivity?: Prisma.JsonValue;
  urgency_pattern?: Prisma.JsonValue;
};

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArrayValue(value: Prisma.JsonValue | undefined, limit = 5) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, limit)
    : [];
}

function serializeThread(thread: BusinessThreadRecord): DashboardThread {
  const latestCommunication = thread.communications[0] ?? null;
  const context = isJsonObject(thread.context)
    ? (thread.context as ThreadContextObject)
    : ({} as ThreadContextObject);

  const threadSummary =
    stringValue(context.thread_summary) || stringValue(context.history_summary);
  const currentNeed =
    stringValue(context.current_need) || stringValue(context.current_intent) || threadSummary;
  const nextBestAction =
    stringValue(context.next_best_action) || "查看最新沟通并决定下一步动作";

  return {
    id: thread.id,
    title: thread.title,
    business_state: thread.business_state,
    attention_state: thread.attention_state,
    last_active_at: thread.last_active_at.toISOString(),
    updated_at: thread.updated_at.toISOString(),
    company_name:
      thread.company_name ||
      stringValue(context.company_name) ||
      thread.email_domain ||
      thread.source_email ||
      "未识别业务实体",
    country: thread.country || stringValue(context.country),
    source_email: thread.source_email,
    email_domain: thread.email_domain || stringValue(context.email_domain),
    context: {
      current_intent: stringValue(context.current_intent),
      current_need: currentNeed,
      next_best_action: nextBestAction,
      action_reason: stringValue(context.action_reason),
      deadline: stringValue(context.deadline),
      quantity: stringValue(context.quantity),
      moq: stringValue(context.moq),
      incoterm: stringValue(context.incoterm),
      target_price: stringValue(context.target_price),
      sample_status: stringValue(context.sample_status),
      risk_level: stringValue(context.risk_level),
      priority_reason: stringValue(context.priority_reason),
      thread_summary: threadSummary,
      key_requirements: stringArrayValue(context.key_requirements, 5),
      blockers: stringArrayValue(context.blockers, 4),
      decision_signals: stringArrayValue(context.decision_signals, 3),
      legacy_traits: [
        stringValue(context.negotiation_style) ? `沟通风格：${stringValue(context.negotiation_style)}` : null,
        stringValue(context.responsiveness) ? `回复节奏：${stringValue(context.responsiveness)}` : null,
        stringValue(context.repeat_potential) ? `返单潜力：${stringValue(context.repeat_potential)}` : null,
        stringValue(context.price_sensitivity) ? `价格敏感度：${stringValue(context.price_sensitivity)}` : null,
        stringValue(context.urgency_pattern) ? `紧迫特征：${stringValue(context.urgency_pattern)}` : null,
      ].filter((item): item is string => Boolean(item)),
    },
    latest_communication: latestCommunication
      ? {
          id: latestCommunication.id,
          source: latestCommunication.source,
          message_body: latestCommunication.message_body,
          is_from_customer: latestCommunication.is_from_customer,
          timestamp: latestCommunication.timestamp.toISOString(),
        }
      : null,
  };
}

async function getBusinessThreads() {
  return withTimeout(
    prisma.businessThread.findMany({
      where: {
        business_state: {
          not: "DORMANT",
        },
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
        context: true,
        last_active_at: true,
        updated_at: true,
        communications: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
          select: {
            id: true,
            source: true,
            message_body: true,
            is_from_customer: true,
            timestamp: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
    }),
    8_000,
    "Timed out while loading business threads from PostgreSQL."
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load business threads.";
}

export default async function BusinessThreadsPage() {
  try {
    const threads = await getBusinessThreads();

    return <DashboardClient initialThreads={threads.map(serializeThread)} />;
  } catch (error) {
    console.warn(
      "BusinessThreadsPage could not load threads:",
      getDashboardErrorMessage(error)
    );

    return (
      <DashboardClient
        initialThreads={[]}
        loadError={getDashboardErrorMessage(error)}
      />
    );
  }
}

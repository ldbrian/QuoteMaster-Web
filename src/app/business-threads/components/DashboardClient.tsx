"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/utils/supabase/client";
import { ManualCaptureModal, OnboardingGuideModal } from "./ThreadCaptureModals";
import type { AttentionState, BusinessState } from "@prisma/client";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  ClipboardPaste,
  Circle,
  Clock3,
  FileText,
  HelpCircle,
  Inbox,
  Radio,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

type FilterKey = "ALL" | AttentionState;

type DashboardCommunication = {
  id: string;
  source: string;
  message_body: string;
  is_from_customer: boolean;
  timestamp: string;
};

type ThreadAdvancementContext = {
  current_intent: string | null;
  current_need: string | null;
  next_best_action: string | null;
  action_reason: string | null;
  deadline: string | null;
  quantity: string | null;
  moq: string | null;
  incoterm: string | null;
  target_price: string | null;
  sample_status: string | null;
  risk_level: string | null;
  priority_reason: string | null;
  thread_summary: string | null;
  key_requirements: string[];
  blockers: string[];
  decision_signals: string[];
  legacy_traits: string[];
};

export type DashboardThread = {
  id: string;
  title: string;
  business_state: BusinessState;
  attention_state: AttentionState;
  last_active_at: string;
  updated_at: string;
  company_name: string;
  country: string | null;
  source_email: string | null;
  email_domain: string | null;
  context: ThreadAdvancementContext;
  latest_communication: DashboardCommunication | null;
};

type DashboardClientProps = {
  initialThreads: DashboardThread[];
  loadError?: string;
};

const filters: Array<{
  key: FilterKey;
  label: string;
  icon: ReactNode;
}> = [
  { key: "ALL", label: "全部", icon: <Radio size={15} /> },
  { key: "ACTION_NEEDED", label: "立刻处理", icon: <AlertCircle size={15} /> },
  { key: "FOLLOW_UP", label: "持续跟进", icon: <Clock3 size={15} /> },
  { key: "WAITING", label: "等待反馈", icon: <Circle size={15} /> },
  { key: "COMPLETED", label: "已归档", icon: <Archive size={15} /> },
];

const businessStateLabel: Record<BusinessState, string> = {
  NEW_INQUIRY: "新询盘",
  REQUIREMENT: "需求确认",
  NEED_QUOTE: "待报价",
  NEGOTIATION: "议价中",
  SAMPLING: "打样中",
  CLOSING: "成交收尾",
  DORMANT: "休眠",
};

const attentionLabel: Record<AttentionState, string> = {
  ACTION_NEEDED: "立刻处理",
  FOLLOW_UP: "持续跟进",
  WAITING: "等待反馈",
  COMPLETED: "已归档",
};

const primaryActionByState: Record<BusinessState, string> = {
  NEW_INQUIRY: "确认需求",
  REQUIREMENT: "补全需求",
  NEED_QUOTE: "生成报价单",
  NEGOTIATION: "修改报价",
  SAMPLING: "检查样品",
  CLOSING: "生成 PI",
  DORMANT: "重新激活",
};

const secondaryActionByState: Record<BusinessState, string> = {
  NEW_INQUIRY: "标记为待报价",
  REQUIREMENT: "请求更多信息",
  NEED_QUOTE: "标记为持续跟进",
  NEGOTIATION: "记录客户反馈",
  SAMPLING: "更新样品进度",
  CLOSING: "标记为等待付款",
  DORMANT: "保持归档",
};

function attentionTone(state: AttentionState) {
  if (state === "ACTION_NEEDED") {
    return {
      text: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      dot: "bg-red-500",
      line: "bg-red-500",
    };
  }

  if (state === "FOLLOW_UP") {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      dot: "bg-amber-500",
      line: "bg-amber-500",
    };
  }

  if (state === "WAITING") {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      dot: "bg-emerald-500",
      line: "bg-emerald-500",
    };
  }

  return {
    text: "text-slate-700",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
    dot: "bg-slate-500",
    line: "bg-slate-500",
  };
}

function filterClasses(filter: FilterKey, activeFilter: FilterKey) {
  const isActive = filter === activeFilter;

  if (filter === "ALL") {
    return isActive
      ? "bg-slate-950 text-white ring-1 ring-slate-950"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950";
  }

  const tone = attentionTone(filter);

  return isActive
    ? `${tone.bg} ${tone.text} ring-1 ${tone.ring}`
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950";
}

function filterIndicatorClass(filter: FilterKey) {
  if (filter === "ALL") return "bg-slate-950";
  return attentionTone(filter).line;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;

  if (!Number.isFinite(timestamp)) return "时间未知";
  if (diffMs < 60_000) return "刚刚";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function AttentionFilter({
  activeFilter,
  onChange,
  threads,
}: {
  activeFilter: FilterKey;
  onChange: (filter: FilterKey) => void;
  threads: DashboardThread[];
}) {
  const counts = useMemo(() => {
    return threads.reduce<Record<FilterKey, number>>(
      (acc, thread) => {
        acc.ALL += 1;
        acc[thread.attention_state] += 1;
        return acc;
      },
      {
        ALL: 0,
        ACTION_NEEDED: 0,
        FOLLOW_UP: 0,
        WAITING: 0,
        COMPLETED: 0,
      }
    );
  }, [threads]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onChange(filter.key)}
              className={[
                "group relative flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold tracking-normal transition-all md:px-4",
                filterClasses(filter.key, activeFilter),
              ].join(" ")}
            >
              <span className="opacity-80">{filter.icon}</span>
              <span>{filter.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 group-hover:text-slate-900">
                {counts[filter.key]}
              </span>
              {isActive && (
                <span
                  className={[
                    "absolute inset-x-4 -bottom-1 h-px rounded-full",
                    filterIndicatorClass(filter.key),
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: AttentionState }) {
  const tone = attentionTone(state);

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        tone.bg,
        tone.text,
        tone.ring,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", tone.dot].join(" ")} />
      {attentionLabel[state]}
    </span>
  );
}

function compactRequirements(thread: DashboardThread) {
  return [
    thread.context.quantity ? `数量 ${thread.context.quantity}` : null,
    thread.context.moq ? `MOQ ${thread.context.moq}` : null,
    thread.context.incoterm ? thread.context.incoterm : null,
    thread.context.target_price ? `目标价 ${thread.context.target_price}` : null,
    thread.context.sample_status ? `样品 ${thread.context.sample_status}` : null,
  ].filter(Boolean) as string[];
}

function ThreadCard({
  thread,
  onArchive,
  onStatusChange,
}: {
  thread: DashboardThread;
  onArchive: (threadId: string) => Promise<void>;
  onStatusChange: (threadId: string, attentionState: AttentionState) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const compactFacts = compactRequirements(thread);
  const summary = thread.context.thread_summary || thread.context.current_need;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
      <button
        type="button"
        aria-label="删除业务线程"
        onClick={(event) => {
          event.stopPropagation();
          onArchive(thread.id);
        }}
        className="absolute right-5 top-5 z-10 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={14} />
        删除
      </button>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="group w-full cursor-pointer px-5 py-5 pr-28 text-left transition-colors hover:bg-slate-50 md:px-6 md:pr-32"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-400">{thread.company_name}</p>
            <h2 className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950 md:text-xl">
              {thread.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge state={thread.attention_state} />
            <span
              className={[
                "mt-0.5 text-slate-400 transition-transform duration-200",
                isExpanded ? "rotate-180" : "rotate-0",
              ].join(" ")}
            >
              <ChevronDown size={18} />
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium tracking-normal text-slate-500">
          <span>{formatRelativeTime(thread.last_active_at)}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{thread.latest_communication?.source || "未知来源"}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{businessStateLabel[thread.business_state]}</span>
          {thread.context.deadline ? (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-red-600">{thread.context.deadline}</span>
            </>
          ) : null}
        </div>
      </button>

      <div
        className={[
          "grid transition-all duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 px-5 pb-5 pt-4 md:px-6 md:pb-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkles size={16} className="text-red-600" />
                <span>推进简报</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
                <div>
                  <p className="text-xs font-semibold tracking-normal text-slate-500">下一步动作</p>
                  <p className="mt-2 text-xl font-semibold leading-7 tracking-tight text-slate-950">
                    {thread.context.next_best_action || primaryActionByState[thread.business_state]}
                  </p>
                  {thread.context.action_reason ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{thread.context.action_reason}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold tracking-normal text-slate-500">当前需要</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                    {thread.context.current_need || "等待 AI 提炼当前业务动作。"}
                  </p>
                </div>
              </div>

              {compactFacts.length > 0 || thread.context.key_requirements.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold tracking-normal text-slate-500">关键要求</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...compactFacts, ...thread.context.key_requirements].slice(0, 8).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {thread.context.decision_signals.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold tracking-normal text-slate-500">改变决策的信号</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {thread.context.decision_signals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {thread.context.blockers.length > 0 ? (
                <div className="mt-5 border-l-2 border-amber-300 pl-4">
                  <p className="text-xs font-semibold tracking-normal text-amber-700">阻塞点</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {thread.context.blockers.join(" / ")}
                  </p>
                </div>
              ) : null}

              {summary ? (
                <div className="mt-5 border-l-2 border-slate-300 pl-4">
                  <p className="text-sm font-medium leading-7 text-slate-700">{summary}</p>
                </div>
              ) : null}

              {thread.context.legacy_traits.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {thread.context.legacy_traits.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              {thread.latest_communication?.message_body ? (
                <div className="mt-5 border-l-2 border-slate-300 pl-4">
                  <p className="text-xs font-semibold tracking-normal text-slate-500">最新沟通原文</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {thread.latest_communication.message_body}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStatusChange(thread.id, "WAITING")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Send size={15} />
                标记为等待反馈
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(thread.id, "FOLLOW_UP")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                标记为持续跟进
              </button>
              <button
                type="button"
                onClick={() => onArchive(thread.id)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Archive size={15} />
                归档
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
        <Inbox size={28} strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">当前没有业务线程</p>
      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-400">
        这个状态下暂时没有待处理事项。可以切换筛选，或等待新的客户信号进入。
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 shadow-sm">
      <p className="text-xs font-semibold tracking-normal text-red-600">数据库配置异常</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        业务线程暂时无法连接 PostgreSQL。
      </p>
      <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-700">{message}</p>
      <p className="mt-5 text-sm font-semibold text-red-700">
        请在 .env.local 中配置 Supabase Postgres 的 DATABASE_URL，然后重启 npm run dev。
      </p>
    </div>
  );
}

function TodayBrief({
  threads,
  visibleCount,
  totalCount,
}: {
  threads: DashboardThread[];
  visibleCount: number;
  totalCount: number;
}) {
  const actionNeeded = threads.filter((thread) => thread.attention_state === "ACTION_NEEDED").length;
  const dueThreads = threads.filter((thread) => Boolean(thread.context.deadline)).length;
  const waitingTooLong = threads.filter((thread) => {
    if (thread.attention_state !== "WAITING") return false;
    return Date.now() - new Date(thread.last_active_at).getTime() > 5 * 24 * 60 * 60 * 1000;
  }).length;
  const estimatedMinutes = Math.max(12, actionNeeded * 12 + dueThreads * 8 + waitingTooLong * 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-normal text-slate-500">今日简报</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
            今天有 <span className="font-semibold text-slate-950">{totalCount}</span> 条活跃业务线程，
            <span className="font-semibold text-red-600"> {actionNeeded}</span> 条需要立刻处理，
            <span className="font-semibold text-amber-700"> {dueThreads}</span> 条带有明确截止点。
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            预计专注处理时间：{estimatedMinutes} 分钟{waitingTooLong ? `，其中 ${waitingTooLong} 条等待超过 5 天` : ""}。
          </p>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-4 border-t border-slate-100 pt-4 md:block md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">
            {visibleCount}
            <span className="ml-1 text-base font-semibold text-slate-500">/ {totalCount}</span>
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">当前筛选 / 活跃线程</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialThreads,
  loadError,
}: DashboardClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [threads, setThreads] = useState(initialThreads);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const router = useRouter();

  const visibleThreads = useMemo(() => {
    if (activeFilter === "ALL") return threads;
    return threads.filter((thread) => thread.attention_state === activeFilter);
  }, [activeFilter, threads]);

  useEffect(() => {
    let isMounted = true;

    async function loadThreadsForCurrentUser() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.push("/login");
        return;
      }

      if (!isMounted) return;
      setAuthToken(session.access_token);
      window.postMessage(
        {
          source: "QUOTEMASTER_WEB_AUTH",
          type: "QUOTEMASTER_SET_AUTH",
          payload: {
            access_token: session.access_token,
            user_id: session.user.id,
            email: session.user.email,
            api_base_url: window.location.origin,
          },
        },
        window.location.origin
      );

      try {
        const response = await fetch("/api/business-threads", {
          headers: { Authorization: "Bearer " + session.access_token },
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || result?.success === false) {
          throw new Error(result?.error || "业务线程加载失败");
        }

        if (isMounted) setThreads(result.data || []);
      } catch (error) {
        console.error("Load business threads failed:", error);
      } finally {
        if (isMounted) setIsLoadingThreads(false);
      }
    }

    loadThreadsForCurrentUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthToken(null);
        setThreads([]);
        router.push("/login");
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function reloadThreads(token = authToken) {
    if (!token) return;

    const response = await fetch("/api/business-threads", {
      headers: { Authorization: "Bearer " + token },
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || "业务线程加载失败");
    }

    setThreads(result.data || []);
  }

  async function archiveThread(threadId: string) {    const previousThreads = threads;
    setThreads((current) => current.filter((thread) => thread.id !== threadId));

    try {
      const response = await fetch(`/api/threads/${threadId}/archive`, {
        method: "PATCH",
        headers: authToken ? { Authorization: "Bearer " + authToken } : undefined,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "归档失败");
      }
    } catch (error) {
      console.error("Archive thread failed:", error);
      setThreads(previousThreads);
    }
  }
  async function updateThreadAttentionState(threadId: string, attentionState: AttentionState) {
    const previousThreads = threads;
    const now = new Date().toISOString();
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              attention_state: attentionState,
              last_active_at: now,
              updated_at: now,
            }
          : thread
      )
    );

    try {
      const response = await fetch(`/api/threads/${threadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: "Bearer " + authToken } : {}),
        },
        body: JSON.stringify({ attention_state: attentionState }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "状态更新失败");
      }
    } catch (error) {
      console.error("Update thread status failed:", error);
      setThreads(previousThreads);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
              <Radio size={15} className="text-red-600" />
              <span>业务线程</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              注意力工作台
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              AI 不只是理解沟通，而是帮助你推进每一笔正在发生的业务。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <HelpCircle size={16} />
              新手指引
            </button>
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <ClipboardPaste size={16} />
              手动录入
            </button>
          </div>
        </header>

        <TodayBrief threads={threads} visibleCount={visibleThreads.length} totalCount={threads.length} />

        <AttentionFilter
          activeFilter={activeFilter}
          onChange={setActiveFilter}
          threads={threads}
        />

        {isLoadingThreads ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm font-medium text-slate-500 shadow-sm">
            正在加载你的业务线程...
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : visibleThreads.length > 0 ? (
          <div className="space-y-4">
            {visibleThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                onArchive={archiveThread}
                onStatusChange={updateThreadAttentionState}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      <ManualCaptureModal
        open={isManualOpen}
        authToken={authToken}
        onClose={() => setIsManualOpen(false)}
        onSuccess={() => reloadThreads()}
      />
      <OnboardingGuideModal open={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </main>
  );
}

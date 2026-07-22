"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/src/components/AppHeader";
import { Loader2, MessageSquare, AlertCircle, Clock, CheckCircle, Inbox, ChevronRight } from "lucide-react";

type ThreadItem = {
  id: string;
  title: string;
  companyName: string | null;
  status: string;
  priority: string;
  nextAction: string | null;
  lastActiveAt: string;
  createdAt: string;
  _count: { communications: number };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active: { label: "需处理", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
  follow_up: { label: "待跟进", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  waiting: { label: "等待回复", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  completed: { label: "已完成", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  dormant: { label: "已归档", color: "text-gray-400", bg: "bg-gray-50", icon: Inbox },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-red-400",
  medium: "border-l-amber-400",
  low: "border-l-gray-300",
};

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "active", label: "需处理" },
  { value: "follow_up", label: "待跟进" },
  { value: "waiting", label: "等待回复" },
  { value: "completed", label: "已完成" },
];

export default function ThreadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/threads?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setThreads(data.threads || []);
    } catch {
      setError("加载失败，请检查网络后重试");
    }
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    fetchThreads();
  }, [authLoading, user, statusFilter, fetchThreads, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <AppHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">跟单</h1>
          <p className="text-gray-500 mt-1">跟进客户订单进度与沟通记录</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`shrink-0 px-4 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {threads.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-600 mb-2">暂无跟单记录</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              完成客户开发后，可以在分析报告中"转为跟单"，<br />
              或在这里手动创建跟单。
            </p>
            <Link
              href="/opportunities"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              前往客户开发
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const statusCfg = STATUS_CONFIG[thread.status] || STATUS_CONFIG.active;
              const StatusIcon = statusCfg.icon;
              return (
                <Link
                  key={thread.id}
                  href={`/threads/${thread.id}`}
                  className={`block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all border-l-4 ${PRIORITY_COLORS[thread.priority] || "border-l-gray-300"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {thread.title}
                      </div>
                      {thread.companyName && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {thread.companyName}
                        </div>
                      )}
                      {thread.nextAction && (
                        <div className="text-sm text-blue-600 mt-2 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{thread.nextAction}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {thread._count.communications}
                        </span>
                        <span>
                          {new Date(thread.lastActiveAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

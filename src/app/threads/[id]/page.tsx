"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/src/components/AppHeader";
import {
  Loader2, ArrowLeft, MessageSquare, Send, Plus, AlertCircle,
  Clock, CheckCircle, User, Building2, Lightbulb,
} from "lucide-react";

type Communication = {
  id: string;
  source: string;
  messageBody: string;
  isFromCustomer: boolean;
  timestamp: string;
  extractedSignals: any;
};

type Thread = {
  id: string;
  title: string;
  companyName: string | null;
  status: string;
  priority: string;
  nextAction: string | null;
  context: any;
  lastActiveAt: string;
  communications: Communication[];
  opportunity: {
    id: string;
    companyName: string;
    productFit: string;
    valueScore: number;
    insight: string;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "需处理",
  follow_up: "待跟进",
  waiting: "等待回复",
  completed: "已完成",
  dormant: "已归档",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-red-600 bg-red-50",
  follow_up: "text-amber-600 bg-amber-50",
  waiting: "text-blue-600 bg-blue-50",
  completed: "text-green-600 bg-green-50",
  dormant: "text-gray-400 bg-gray-50",
};

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captureText, setCaptureText] = useState("");
  const [captureSource, setCaptureSource] = useState("MANUAL");
  const [capturing, setCapturing] = useState(false);

  const fetchThread = async () => {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`/api/threads/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.replace("/threads"); return; }
      const data = await res.json();
      setThread(data.thread);
    } catch {
      setError("加载失败，请检查网络后重试");
    }
    setLoading(false);
  };

  const handleCapture = async () => {
    if (!captureText.trim() || !thread || !token) return;
    setCapturing(true);
    try {
      const res = await fetch(`/api/threads/${id}/communicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageBody: captureText.trim(),
          source: captureSource,
          isFromCustomer: true,
        }),
      });
      if (res.ok) {
        setCaptureText("");
        setShowCapture(false);
        fetchThread();
      } else {
        setError("提交失败，请重试");
      }
    } catch {
      setError("提交失败，请检查网络后重试");
    }
    setCapturing(false);
  };

  const updateStatus = async (status: string) => {
    if (!thread || !token) return;
    try {
      const res = await fetch(`/api/threads/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { fetchThread(); } else { setError("更新状态失败"); }
    } catch {
      setError("更新状态失败，请检查网络");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || !thread) return null;

  return (
    <>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/threads" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回跟单列表
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{thread.title}</h1>
            {thread.companyName && (
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {thread.companyName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[thread.status] || ""}`}>
              {STATUS_LABELS[thread.status] || thread.status}
            </span>
          </div>
        </div>

        {/* Quick status actions */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              disabled={thread.status === key}
              className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                thread.status === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* AI Suggested Action */}
        {thread.nextAction && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-indigo-800 text-sm">建议操作</span>
            </div>
            <p className="text-indigo-900 text-sm">{thread.nextAction}</p>
          </div>
        )}

        {/* Linked opportunity */}
        {thread.opportunity && (
          <Link
            href={`/opportunities/${thread.opportunity.id}`}
            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl mb-6"
          >
            <div className="text-sm">
              <span className="text-blue-500 text-xs">关联分析报告</span>
              <div className="text-blue-800 font-medium">{thread.opportunity.companyName}</div>
            </div>
            <ArrowLeft className="w-4 h-4 text-blue-400 rotate-180" />
          </Link>
        )}

        {/* Communication log */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">沟通记录</h2>
            <button
              onClick={() => setShowCapture(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-3.5 h-3.5" /> 添加记录
            </button>
          </div>

          {thread.communications.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              暂无沟通记录。点击"添加记录"粘贴邮件或聊天内容。
            </div>
          ) : (
            thread.communications.map((comm) => (
              <div
                key={comm.id}
                className={`p-4 border rounded-xl ${
                  comm.isFromCustomer
                    ? "bg-white border-gray-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <User className={`w-3.5 h-3.5 ${comm.isFromCustomer ? "text-gray-400" : "text-blue-400"}`} />
                    <span className={comm.isFromCustomer ? "text-gray-500" : "text-blue-600"}>
                      {comm.isFromCustomer ? "客户" : "我方"}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">{comm.source}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(comm.timestamp).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {comm.messageBody}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Capture Modal */}
        {showCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6">
              <h3 className="font-semibold mb-4">添加沟通记录</h3>

              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">来源</label>
                <select
                  value={captureSource}
                  onChange={(e) => setCaptureSource(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="MANUAL">手动输入</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="WECHAT">WeChat</option>
                </select>
              </div>

              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                rows={6}
                placeholder="粘贴客户的邮件或聊天内容..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCapture(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCapture}
                  disabled={capturing || !captureText.trim()}
                  className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  提交并分析
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

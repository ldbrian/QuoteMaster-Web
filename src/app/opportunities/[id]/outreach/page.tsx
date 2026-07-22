"use client";

import { useEffect, useState, use } from "react";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  FileText,
  Inbox,
  User,
  AtSign,
  Calendar,
} from "lucide-react";

type EmailDraft = {
  id: string;
  subject: string;
  body: string;
  suggestions: string | null;
  tone: string;
  createdAt: string;
};

type Opportunity = {
  id: string;
  companyName: string;
  productFit: string | null;
  valueScore: number | null;
};

export default function OutreachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [tone, setTone] = useState("professional");
  const [instructions, setInstructions] = useState("");

  const fetchData = async (token: string) => {
    const [oppRes, draftRes] = await Promise.all([
      fetch(`/api/opportunities/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/opportunities/${id}/outreach`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!oppRes.ok) {
      router.replace("/opportunities");
      return;
    }

    const oppData = await oppRes.json();
    const draftData = await draftRes.json();
    setOpportunity(oppData.opportunity);
    setDrafts(draftData.drafts || []);
    if (draftData.drafts?.length > 0) {
      setSelectedDraft(draftData.drafts[0]);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) fetchData(sessionData.session.access_token);
      } catch {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [authLoading, user, id, router]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`/api/opportunities/${id}/outreach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          tone: tone !== "professional" ? tone : undefined,
          instructions: instructions.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedDraft(data.draft);
        setDrafts((prev) => [data.draft, ...prev]);
      }
    } catch {}
    setGenerating(false);
  };

  const copyToClipboard = async (text: string, target: "subject" | "body" | "full") => {
    await navigator.clipboard.writeText(text);
    if (target === "subject") { setCopiedSubject(true); setTimeout(() => setCopiedSubject(false), 2000); }
    if (target === "body") { setCopiedBody(true); setTimeout(() => setCopiedBody(false), 2000); }
    if (target === "full") { setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); }
  };

  useEffect(() => {
    if (drafts.length === 0 && !generating && opportunity) {
      handleGenerate();
    }
  }, [opportunity]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <><AppHeader /><div className="max-w-3xl mx-auto px-4 py-12">
      <a
        href={`/opportunities/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 返回分析报告
      </a>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">开发信生成</h1>
          {opportunity && (
            <p className="text-gray-500 mt-1">
              {opportunity.companyName}
              {opportunity.productFit && (
                <span className="ml-2 text-sm">
                  · 匹配度：{opportunity.productFit === "HIGH" ? "高" : opportunity.productFit === "MEDIUM" ? "中" : "低"}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">语气</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="professional">专业正式</option>
              <option value="friendly">友好亲切</option>
              <option value="price_focused">突出价格优势</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">额外指令</label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="缩短到 100 词以内..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? "AI 正在生成..." : "生成开发信"}
        </button>
      </div>

      {drafts.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {drafts.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDraft(d)}
              className={`shrink-0 px-3 py-1.5 text-sm rounded-lg border ${
                selectedDraft?.id === d.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              版本 {drafts.length - i}
            </button>
          ))}
        </div>
      )}

      {generating && !selectedDraft && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">AI 正在生成开发信...</p>
          </div>
        </div>
      )}

      {selectedDraft && (
        <div className="space-y-6">
          {/* Inbox-style preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">邮件预览</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <AtSign className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-400">收件人：</span>
                  <span className="text-gray-700">{opportunity?.companyName || "客户"}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-400">主题：</span>
                  <span className="text-gray-900 font-medium">{selectedDraft.subject}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedDraft.subject, "subject")}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="复制主题"
                >
                  {copiedSubject ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-400">{new Date().toLocaleDateString("zh-CN")}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-5">
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {selectedDraft.body}
              </div>
            </div>
          </div>

          {/* Copy actions */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              <span>复制邮件</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(selectedDraft.body, "body")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
              >
                {copiedBody ? <><Check className="w-3 h-3 text-green-500" /> 正文已复制</> : <><Copy className="w-3 h-3" /> 复制正文</>}
              </button>
              <button
                onClick={() => copyToClipboard(`Subject: ${selectedDraft.subject}\n\n${selectedDraft.body}`, "full")}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {copiedFull ? <><Check className="w-3 h-3" /> 全部已复制</> : <><Copy className="w-3 h-3" /> 复制全部</>}
              </button>
            </div>
          </div>

          {selectedDraft.suggestions && (
            <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-yellow-600" />
                <h2 className="font-semibold text-yellow-800">优化建议</h2>
              </div>
              <p className="text-yellow-700 text-sm whitespace-pre-wrap">
                {selectedDraft.suggestions}
              </p>
            </div>
          )}
        </div>
      )}
    </div></>
  );
}

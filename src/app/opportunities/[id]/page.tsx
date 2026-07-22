"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import {
  Loader2,
  ArrowLeft,
  Star,
  Shield,
  Lightbulb,
  Mail,
  Building2,
  Target,
  ThumbsUp,
  ThumbsDown,
  Check,
  MessageSquare, Sparkles, GitBranch,
} from "lucide-react";

type Opportunity = {
  id: string;
  companyName: string;
  website: string | null;
  description: string | null;
  buyerProfile: string | null;
  productFit: string | null;
  valueScore: number | null;
  approachAngle: string | null;
  risks: string | null;
  insight: string | null;
  summary: string | null;
  status: string;
  createdAt: string;
};

const FIT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  HIGH: { label: "高匹配", color: "text-green-700", bg: "bg-green-50" },
  MEDIUM: { label: "中匹配", color: "text-yellow-700", bg: "bg-yellow-50" },
  LOW: { label: "低匹配", color: "text-red-700", bg: "bg-red-50" },
};

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 8 ? "text-green-500" : score >= 5 ? "text-yellow-500" : "text-red-400";
  const label =
    score >= 8 ? "强烈推荐" : score >= 5 ? "可以考虑" : "谨慎投入";
  return (
    <div className="flex flex-col items-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-gray-400 mt-1">/ 10</div>
      <div className={`text-xs font-medium mt-1 ${color}`}>{label}</div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-xl ${className || ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    helpful: boolean | null;
    editedEmail: boolean | null;
    sent: boolean | null;
  }>({ helpful: null, editedEmail: null, sent: null });
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const res = await fetch(`/api/opportunities/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        router.replace("/opportunities");
        return;
      }
      const data = await res.json();
      setOpportunity(data.opportunity);
      setLoading(false);
    });
  }, [authLoading, user, id, router]);

  const submitFeedback = async (field: string, value: boolean) => {
    if (!opportunity) return;
    setFeedbackSaving(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        opportunityId: opportunity.id,
        [field]: value,
      }),
    });
    setFeedback((prev) => ({ ...prev, [field]: value }));
    setFeedbackSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || !opportunity) return null;

  const fitInfo = FIT_LABELS[opportunity.productFit || ""];

  return (
    <>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>

        {/* Summary Hero */}
        {opportunity.summary && (
          <div className="mb-8">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">分析结论</div>
            <div className="text-xl font-bold text-gray-900 leading-relaxed">
              {opportunity.summary}
            </div>
          </div>
        )}

        {/* Score + Fit */}
        <div className="flex items-start gap-6 mb-8 p-5 bg-white border border-gray-200 rounded-xl">
          {opportunity.valueScore && (
            <ScoreRing score={opportunity.valueScore} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{opportunity.companyName}</h1>
            {opportunity.website && (
              <a
                href={opportunity.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline mt-0.5 inline-block"
              >
                {opportunity.website}
              </a>
            )}
            <div className="flex items-center gap-3 mt-3">
              {fitInfo && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${fitInfo.bg} ${fitInfo.color}`}>
                  <Target className="w-3.5 h-3.5" />
                  {fitInfo.label}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(opportunity.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {opportunity.buyerProfile && (
            <SectionCard icon={<Building2 className="w-5 h-5 text-blue-500" />} title="客户画像">
              {opportunity.buyerProfile}
            </SectionCard>
          )}

          {opportunity.insight && (
            <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-indigo-800">AI 洞察</h2>
              </div>
              <div className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap">
                {opportunity.insight}
              </div>
            </div>
          )}

          {opportunity.approachAngle && (
            <SectionCard
              icon={<Lightbulb className="w-5 h-5 text-yellow-500" />}
              title="开发策略"
            >
              {opportunity.approachAngle}
            </SectionCard>
          )}

          {opportunity.risks && (
            <SectionCard icon={<Shield className="w-5 h-5 text-red-400" />} title="风险提示">
              {opportunity.risks}
            </SectionCard>
          )}
        </div>

        {/* Feedback Section */}
        <div className="mt-8 p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-600">这份分析对你有帮助吗？</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => submitFeedback("helpful", true)}
              disabled={feedbackSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                feedback.helpful === true
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> 有帮助
            </button>
            <button
              onClick={() => submitFeedback("helpful", false)}
              disabled={feedbackSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                feedback.helpful === false
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> 帮助不大
            </button>
            <span className="text-xs text-gray-300">|</span>
            <button
              onClick={() => submitFeedback("editedEmail", true)}
              disabled={feedbackSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                feedback.editedEmail === true
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> 几乎没改就用了
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/opportunities/${opportunity.id}/outreach`}
            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            <Mail className="w-4 h-4" /> 生成开发信
          </Link>
          <Link
            href={`/threads`}
            onClick={async (e) => {
              e.preventDefault();
              const token = (await supabase.auth.getSession()).data.session?.access_token;
              const res = await fetch("/api/threads", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  opportunityId: opportunity.id,
                  companyName: opportunity.companyName,
                  title: `${opportunity.companyName} - 业务跟进`,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                router.push(`/threads/${data.thread.id}`);
              }
            }}
            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
          >
            <GitBranch className="w-4 h-4" /> 转为跟单
          </Link>
        </div>
      </div>
    </>
  );
}

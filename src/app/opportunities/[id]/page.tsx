"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
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
  MessageSquare, Sparkles, GitBranch, CheckCircle, AlertTriangle, Clock, HelpCircle,
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
  confidenceScore: number | null;
  confidenceReason: string | null;
  decisionAdvice: string | null;
  decisionStatus: string | null;
  decisionReason: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  status: string;
  createdAt: string;
};

const FIT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  HIGH: { label: "高匹配", color: "text-green-700", bg: "bg-green-50" },
  MEDIUM: { label: "中匹配", color: "text-yellow-700", bg: "bg-yellow-50" },
  LOW: { label: "低匹配", color: "text-red-700", bg: "bg-red-50" },
};

const DECISION_OPTIONS = [
  { value: "DEVELOP", label: "开始开发", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-300" },
  { value: "REJECT", label: "暂时放弃", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-300" },
  { value: "PENDING", label: "稍后决定", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300" },
];

const REASONS = [
  { value: "AI_ADVICE", label: "AI 分析建议" },
  { value: "OWN_JUDGMENT", label: "我自己的判断" },
  { value: "ALREADY_CONTACTED", label: "客户已有联系" },
  { value: "INSUFFICIENT_INFO", label: "信息不足" },
  { value: "OTHER", label: "其他" },
];

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

function ConfidenceBar({ score, reason }: { score: number; reason: string }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">分析可信度</div>
        <div className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500"}`}>
          {score}%
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <div className="text-xs text-gray-500">{reason}</div>
    </div>
  );
}

function SectionCard({
  icon, title, children, className,
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

const DECISION_LABELS: Record<string, string> = {
  PENDING: "待决定",
  DEVELOP: "决定开发",
  REJECT: "放弃开发",
  CONTACTED: "已联系客户",
};

const DECISION_COLORS: Record<string, string> = {
  PENDING: "text-amber-600 bg-amber-50",
  DEVELOP: "text-green-600 bg-green-50",
  REJECT: "text-red-600 bg-red-50",
  CONTACTED: "text-blue-600 bg-blue-50",
};

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ helpful: boolean | null; accuracyRating: number | null }>({ helpful: null, accuracyRating: null });
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [decisionNote, setDecisionNote] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    (async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { router.replace("/opportunities"); return; }
        const data = await res.json();
        setOpportunity(data.opportunity);
      } catch {
        router.replace("/opportunities");
      }
      setLoading(false);
    })();
  }, [authLoading, user, id, router]);

  const submitFeedback = async (field: string, value: boolean | number) => {
    if (!opportunity || !token) return;
    setFeedbackSaving(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ opportunityId: opportunity.id, [field]: value }),
    });
    setFeedback((prev) => ({ ...prev, [field]: value }));
    setFeedbackSaving(false);
  };

  const submitAccuracy = async (rating: number) => {
    if (!opportunity || !token) return;
    setFeedbackSaving(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ opportunityId: opportunity.id, accuracyRating: rating }),
    });
    setFeedback((prev) => ({ ...prev, accuracyRating: rating }));
    setFeedbackSaving(false);
  };

  const submitDecision = async () => {
    if (!opportunity || !selectedDecision || !token) return;
    setSavingDecision(true);
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        decisionStatus: selectedDecision,
        decisionReason: selectedReason || null,
        decisionNote: decisionNote.trim() || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOpportunity(data.opportunity);
    }
    setSavingDecision(false);
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
  const hasDecided = opportunity.decisionStatus && opportunity.decisionStatus !== "PENDING";
  const isDecisionOpen = selectedDecision && !hasDecided;
  const decisionOpt = DECISION_OPTIONS.find((d) => d.value === selectedDecision);
  const DecisionIcon = decisionOpt?.icon || HelpCircle;

  return (
    <>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>

        {/* Summary Hero */}
        {opportunity.summary && (
          <div className="mb-8">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">分析结论</div>
            <div className="text-xl font-bold text-gray-900 leading-relaxed">{opportunity.summary}</div>
          </div>
        )}

        {/* Score + Fit + Confidence */}
        <div className="flex items-start gap-6 mb-8 p-5 bg-white border border-gray-200 rounded-xl">
          {opportunity.valueScore && <ScoreRing score={opportunity.valueScore} />}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{opportunity.companyName}</h1>
            {opportunity.website && (
              <a href={opportunity.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-0.5 inline-block">
                {opportunity.website}
              </a>
            )}
            <div className="flex items-center gap-3 mt-3">
              {fitInfo && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${fitInfo.bg} ${fitInfo.color}`}>
                  <Target className="w-3.5 h-3.5" /> {fitInfo.label}
                </span>
              )}
              {opportunity.confidenceScore && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 bg-gray-50 rounded-full">
                  可信度 {opportunity.confidenceScore}%
                </span>
              )}
              <span className="text-xs text-gray-400">{new Date(opportunity.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
            {hasDecided && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full text-xs font-medium ${DECISION_COLORS[opportunity.decisionStatus!] || ""}`}>
                决策：{DECISION_LABELS[opportunity.decisionStatus!] || opportunity.decisionStatus}
              </div>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        {opportunity.confidenceScore !== null && opportunity.confidenceReason && (
          <div className="mb-6">
            <ConfidenceBar score={opportunity.confidenceScore} reason={opportunity.confidenceReason} />
          </div>
        )}

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
              <div className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap">{opportunity.insight}</div>
            </div>
          )}

          {opportunity.approachAngle && (
            <SectionCard icon={<Lightbulb className="w-5 h-5 text-yellow-500" />} title="开发策略">
              {opportunity.approachAngle}
            </SectionCard>
          )}

          {opportunity.risks && (
            <SectionCard icon={<Shield className="w-5 h-5 text-red-400" />} title="风险提示">
              {opportunity.risks}
            </SectionCard>
          )}

          {opportunity.decisionAdvice && (
            <SectionCard icon={<HelpCircle className="w-5 h-5 text-blue-500" />} title="AI 行动建议">
              {opportunity.decisionAdvice}
            </SectionCard>
          )}
        </div>

        {/* Decision Module */}
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="font-semibold text-gray-800 mb-1">你的下一步决定</h2>
          <p className="text-sm text-gray-500 mb-5">这个客户值得投入时间吗？</p>

          {hasDecided ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>你已决定 <strong>{DECISION_LABELS[opportunity.decisionStatus!]}</strong></span>
                {opportunity.decidedAt && (
                  <span className="text-gray-400 text-xs">· {new Date(opportunity.decidedAt).toLocaleDateString("zh-CN")}</span>
                )}
              </div>
              {opportunity.decisionReason && (
                <div className="text-sm text-gray-500">原因：{REASONS.find((r) => r.value === opportunity.decisionReason)?.label || opportunity.decisionReason}</div>
              )}
              {opportunity.decisionNote && (
                <div className="text-sm text-gray-500">备注：{opportunity.decisionNote}</div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                {DECISION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = selectedDecision === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setSelectedDecision(opt.value); setSelectedReason(""); setDecisionNote(""); }}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isActive ? `${opt.bg} ${opt.border} ${opt.color}` : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {opt.label}
                    </button>
                  );
                })}
              </div>

              {isDecisionOpen && (
                <div className="space-y-4 pl-1">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">为什么？</label>
                    <div className="flex flex-wrap gap-2">
                      {REASONS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setSelectedReason(r.value)}
                          className={`px-3 py-1.5 text-xs rounded-lg border ${
                            selectedReason === r.value
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">备注（可选）</label>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={2}
                      placeholder={selectedDecision === "DEVELOP" ? "计划怎么开发？" : "简单说明原因..."}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={submitDecision}
                    disabled={savingDecision}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                    {savingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    保存决定
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback Section */}
        <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-600">这份分析对你的帮助</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={() => submitFeedback("helpful", true)}
              disabled={feedbackSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                feedback.helpful === true ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            ><ThumbsUp className="w-3.5 h-3.5" /> 有帮助</button>
            <button
              onClick={() => submitFeedback("helpful", false)}
              disabled={feedbackSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                feedback.helpful === false ? "bg-red-50 border-red-300 text-red-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            ><ThumbsDown className="w-3.5 h-3.5" /> 帮助不大</button>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">分析是否符合你的判断？</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => submitAccuracy(n)}
                  disabled={feedbackSaving}
                  className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg border transition-colors ${
                    feedback.accuracyRating === n
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-2 self-center">1=不准确 · 5=很准确</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href={`/opportunities/${opportunity.id}/outreach`} className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
            <Mail className="w-4 h-4" /> 生成开发信
          </Link>
          <Link href={`/threads`} onClick={async (e) => {
            e.preventDefault();
            const res = await fetch("/api/threads", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ opportunityId: opportunity.id, companyName: opportunity.companyName, title: `${opportunity.companyName} - 业务跟进` }),
            });
            if (res.ok) { const data = await res.json(); router.push(`/threads/${data.thread.id}`); }
          }} className="flex items-center justify-center gap-2 flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">
            <GitBranch className="w-4 h-4" /> 转为跟单
          </Link>
        </div>
      </div>
    </>
  );
}

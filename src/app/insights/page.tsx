"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import AppHeader from "@/src/components/AppHeader";
import {
  Loader2, BarChart3, Target, ThumbsUp, AlertTriangle, Clock,
  CheckCircle, HelpCircle,
} from "lucide-react";

type Insights = {
  totalOpportunities: number;
  totalDecided: number;
  decisions: Record<string, number>;
  accuracyAvg: number | null;
  accuracyCount: number;
};

const DECISION_LABELS: Record<string, string> = {
  DEVELOP: "决定开发",
  REJECT: "放弃开发",
  PENDING: "待决定",
  CONTACTED: "已联系",
};

const DECISION_COLORS: Record<string, string> = {
  DEVELOP: "text-green-600 bg-green-50",
  REJECT: "text-red-600 bg-red-50",
  PENDING: "text-amber-600 bg-amber-50",
  CONTACTED: "text-blue-600 bg-blue-50",
};

const DECISION_ICONS: Record<string, any> = {
  DEVELOP: CheckCircle,
  REJECT: AlertTriangle,
  PENDING: Clock,
  CONTACTED: ThumbsUp,
};

export default function InsightsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    (async () => {
      try {
        const res = await fetch("/api/insights", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setInsights(data);
      } catch {}
      setLoading(false);
    })();
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || !insights) return null;

  const pct = (n: number) => insights.totalDecided > 0 ? Math.round((n / insights.totalDecided) * 100) : 0;

  return (
    <>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            <h1 className="text-2xl font-bold">数据概览</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">你使用 QuoteMaster 的分析统计</p>
        </div>

        {/* Total analyzed */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
            <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">{insights.totalOpportunities}</div>
            <div className="text-xs text-gray-500 mt-1">累计分析客户</div>
          </div>
          <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
            <ThumbsUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">
              {insights.accuracyAvg ? `${insights.accuracyAvg}` : "-"}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均准确度 / 5 分</div>
            {insights.accuracyCount > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">基于 {insights.accuracyCount} 次反馈</div>
            )}
          </div>
        </div>

        {/* Decision breakdown */}
        {insights.totalDecided > 0 && (
          <div className="p-5 bg-white border border-gray-200 rounded-xl">
            <h2 className="font-semibold text-gray-800 mb-4">用户决策分布</h2>
            <div className="space-y-3">
              {Object.entries(DECISION_LABELS).map(([key, label]) => {
                const count = insights.decisions[key] || 0;
                const Icon = DECISION_ICONS[key] || HelpCircle;
                const barW = pct(count);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className={`flex items-center gap-1.5 font-medium ${DECISION_COLORS[key]?.split(" ")[0] || "text-gray-600"}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </div>
                      <div className="text-gray-500">{count} 次 ({barW}%)</div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${key === "DEVELOP" ? "bg-green-500" : key === "REJECT" ? "bg-red-400" : key === "PENDING" ? "bg-amber-400" : "bg-blue-400"}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {insights.totalOpportunities === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-600 mb-2">暂无数据</h2>
            <p className="text-gray-400 text-sm">开始分析客户后，统计数据将在这里展示。</p>
          </div>
        )}
      </div>
    </>
  );
}

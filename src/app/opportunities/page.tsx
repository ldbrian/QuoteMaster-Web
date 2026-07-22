"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import { Loader2, Plus, Target, Star, ExternalLink } from "lucide-react";

type OpportunityItem = {
  id: string;
  companyName: string;
  productFit: string | null;
  valueScore: number | null;
  summary: string | null;
  status: string;
  createdAt: string;
};

const FIT_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-700 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-red-100 text-red-700 border-red-200",
};

const FIT_LABELS: Record<string, string> = {
  HIGH: "高匹配",
  MEDIUM: "中匹配",
  LOW: "低匹配",
};

export default function OpportunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOpportunities = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/opportunities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch {
      setError("加载失败，请检查网络后重试");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchOpportunities(); // eslint-disable-line
  }, [authLoading, fetchOpportunities]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <><AppHeader /><div className="max-w-4xl mx-auto px-4 py-12">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">机会列表</h1>
          <p className="text-gray-500 mt-1">管理你的客户分析记录</p>
        </div>
        <Link
          href="/opportunities/analyze"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 分析新客户
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-600 mb-2">还没有分析过客户</h2>
          <p className="text-gray-400 mb-6">
            开始探索你的第一个海外客户机会
          </p>
          <Link
            href="/opportunities/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 开始分析
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <Link
              key={opp.id}
              href={`/opportunities/${opp.id}`}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">{opp.companyName}</div>
                {opp.summary && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-1">{opp.summary}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(opp.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {opp.productFit && (
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                      FIT_COLORS[opp.productFit] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {FIT_LABELS[opp.productFit] || opp.productFit}
                  </span>
                )}
                {opp.valueScore && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{opp.valueScore}/10</span>
                  </div>
                )}
                <ExternalLink className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div></>
  );
}

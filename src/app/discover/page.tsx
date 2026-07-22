"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle, AlertCircle, ChevronRight, Search } from "lucide-react";

type BatchResult = {
  companyName: string;
  success: boolean;
  opportunityId?: string;
  error?: string;
};

export default function DiscoverPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rawList, setRawList] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BatchResult[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawList.trim()) { setError("请输入客户列表"); return; }
    setError("");
    setProcessing(true);
    setResults(null);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rawList: rawList.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "处理失败"); setProcessing(false); return; }
      setResults(data.results);
    } catch {
      setError("网络异常，请重试");
    }
    setProcessing(false);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }
  if (!user) return null;

  return (
    <><AppHeader /><div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">批量发现客户</h1>
      <p className="text-gray-500 mb-8">粘贴公司列表，系统自动分析每个客户的价值。每行一个公司，格式：公司名, 网址（可选）</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">客户列表</label>
          <textarea
            value={rawList}
            onChange={(e) => setRawList(e.target.value)}
            rows={10}
            placeholder={`ABC Trading Co.\nXYZ Sourcing Ltd., https://xyz.com\nGlobal Imports Inc., https://globalimports.com`}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">每行一个客户，逗号后可选填网址。一次最多 10 个。</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={processing}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> 正在分析...</> : <><Upload className="w-4 h-4" /> 批量分析</>}
        </button>
      </form>

      {results && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-800">
              完成：{results.filter((r) => r.success).length} 成功，{results.filter((r) => !r.success).length} 失败
            </span>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                r.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}>
                {r.success ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className="flex-1 text-gray-800">{r.companyName}</span>
                {r.success && r.opportunityId ? (
                  <button
                    onClick={() => router.push(`/opportunities/${r.opportunityId}`)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    查看 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-red-500 text-xs">{r.error}</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/opportunities")}
            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            查看所有客户
          </button>
        </div>
      )}
    </div></>
  );
}

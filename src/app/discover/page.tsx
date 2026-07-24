"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle, AlertCircle, ChevronRight, Search, Target, Globe, FileText, Lightbulb, Sparkles } from "lucide-react";

type Candidate = {
  companyName: string;
  website?: string;
  icpScore: number;
  matchReasons: string[];
};

type BatchResult = {
  companyName: string;
  success: boolean;
  opportunityId?: string;
  error?: string;
};

type SearchQuery = {
  query: string;
  angle: string;
  suggestion: string;
};

type SearchStrategy = {
  analysis: string;
  queries: SearchQuery[];
};

const MAX_BATCH = 10;

export default function DiscoverPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"paste" | "search">("paste");

  // Paste tab state
  const [rawList, setRawList] = useState("");
  const [icpKeywords, setIcpKeywords] = useState("");

  // Search tab state
  const [market, setMarket] = useState("");
  const [product, setProduct] = useState("");
  const [clientType, setClientType] = useState("");
  const [searching, setSearching] = useState(false);

  // Search result state
  const [strategy, setStrategy] = useState<SearchStrategy | null>(null);

  // Shared state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [error, setError] = useState("");
  const [results, setResults] = useState<BatchResult[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // ── Parse (paste tab) ──
  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawList.trim()) { setError("请输入客户列表"); return; }
    setError("");
    setParsing(true);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rawList: rawList.trim(),
          icpKeywords: icpKeywords.trim() ? icpKeywords.trim().split(/[\s,，]+/).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "解析失败"); setParsing(false); return; }
      setCandidates(data.candidates);
      setSelected(new Set(data.candidates.map((_: any, i: number) => i).slice(0, MAX_BATCH)));
      setStep("preview");
    } catch { setError("网络异常，请重试"); }
    setParsing(false);
  };

  // ── Search: AI strategy + auto DuckDuckGo ──
  const handleAiSearch = async () => {
    if (!market.trim() || !product.trim() || !clientType.trim()) {
      setError("请填写目标市场、产品和客户类型");
      return;
    }
    setError("");
    setSearching(true);
    try {
      const res = await fetch("/api/discover/strategy-search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ market: market.trim(), product: product.trim(), clientType: clientType.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "搜索失败"); setSearching(false); return; }
      setStrategy(data.strategy);
      setCandidates(data.candidates);
      setSelected(new Set(data.candidates.map((_: any, i: number) => i).slice(0, MAX_BATCH)));
      setStep("preview");
    } catch { setError("网络异常，请重试"); }
    setSearching(false);
  };

  // ── Batch create ──
  const toggleCandidate = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else if (next.size < MAX_BATCH) next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === Math.min(candidates.length, MAX_BATCH)) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((_, i) => i).slice(0, MAX_BATCH)));
    }
  };

  const handleBatchCreate = async () => {
    const selectedCandidates = Array.from(selected).map((i) => ({
      companyName: candidates[i].companyName,
      website: candidates[i].website,
    }));
    if (!selectedCandidates.length) return;
    setProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/discover/batch-create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidates: selectedCandidates }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "批量分析失败"); setProcessing(false); return; }
      setResults(data.results);
      setStep("done");
    } catch { setError("网络异常，请重试"); }
    setProcessing(false);
  };

  const resetPage = () => {
    setStep("input");
    setCandidates([]);
    setSelected(new Set());
    setResults(null);
    setError("");
    setStrategy(null);
  };

  const icpColor = (score: number) =>
    score >= 60 ? "text-green-600" : score >= 30 ? "text-yellow-600" : "text-gray-400";

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }
  if (!user) return null;

  // ── Render Candidates Preview ──
  const renderPreview = () => (
    <div className="space-y-5">
      {/* Show strategy analysis if coming from search tab */}
      {strategy && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-blue-800">{strategy.analysis}</p>
              <details className="mt-2">
                <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-600">查看搜索策略</summary>
                <div className="mt-2 space-y-1">
                  {strategy.queries.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-blue-700">
                      <span className="font-mono shrink-0">#{i + 1}</span>
                      <code className="break-all">{q.query}</code>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-800">共 {candidates.length} 个客户</span>
        </div>
        <button onClick={resetPage} className="text-sm text-gray-500 hover:text-gray-700">重新输入</button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={selected.size === Math.min(candidates.length, MAX_BATCH)} onChange={toggleAll} className="rounded border-gray-300" />
          全选
        </label>
        <span className="text-gray-400">已选 {selected.size}/{Math.min(candidates.length, MAX_BATCH)}</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {candidates.map((c, i) => {
          const isSelected = selected.has(i);
          return (
            <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
              isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleCandidate(i)}
                disabled={!isSelected && selected.size >= MAX_BATCH} className="rounded border-gray-300" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{c.companyName}</div>
                {c.website && <div className="text-gray-400 truncate text-xs">{c.website}</div>}
              </div>
              <span className={`text-xs font-medium ${icpColor(c.icpScore)}`}>{c.icpScore}%</span>
            </label>
          );
        })}
      </div>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      <button onClick={handleBatchCreate} disabled={processing || selected.size === 0}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> 正在分析 {selected.size} 个...</> : <><Upload className="w-4 h-4" /> 批量分析（{selected.size} 个）</>}
      </button>
    </div>
  );

  // ── Render Results ──
  const renderDone = () => results && (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
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
            <span className="flex-1 text-gray-800 truncate">{r.companyName}</span>
            {r.success && r.opportunityId ? (
              <button onClick={() => router.push(`/opportunities/${r.opportunityId}`)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 shrink-0">
                查看 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : <span className="text-red-500 text-xs shrink-0">{r.error}</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={resetPage} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">继续添加</button>
        <button onClick={() => router.push("/opportunities")} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">查看全部</button>
      </div>
    </div>
  );

  return (
    <><AppHeader /><div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">发现客户</h1>
      <p className="text-gray-500 mb-6">粘贴客户名单，或描述目标客户，AI 自动搜索发现。</p>

      {/* Tabs — only show on first input step */}
      {step === "input" && (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button onClick={() => { setTab("paste"); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "paste" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <FileText className="w-4 h-4" /> 粘贴导入
          </button>
          <button onClick={() => { setTab("search"); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "search" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <Target className="w-4 h-4" /> 搜索发现
          </button>
        </div>
      )}

      {/* ==================== PASTE TAB ==================== */}
      {tab === "paste" && (
        <>
          {step === "input" && (
            <form onSubmit={handleParse} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户列表</label>
                <textarea value={rawList} onChange={(e) => setRawList(e.target.value)} rows={10}
                  placeholder={`ABC Trading Co.\nXYZ Sourcing Ltd., https://xyz.com\nGlobal Imports Inc., https://globalimports.com`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">每行一个客户，逗号后可选填网址。批量分析最多 {MAX_BATCH} 个。</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Target className="w-4 h-4" /> ICP 关键词（可选，用于匹配评分）
                </label>
                <input type="text" value={icpKeywords} onChange={(e) => setIcpKeywords(e.target.value)}
                  placeholder="例如：德国 户外运动 服装"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={parsing}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> 解析中...</> : <><Search className="w-4 h-4" /> 解析列表</>}
              </button>
            </form>
          )}
          {step === "preview" && renderPreview()}
          {step === "done" && renderDone()}
        </>
      )}

      {/* ==================== SEARCH TAB ==================== */}
      {tab === "search" && (
        <>
          {step === "input" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标市场</label>
                <input type="text" value={market} onChange={(e) => setMarket(e.target.value)}
                  placeholder="例如：德国、美国、日本"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品</label>
                <input type="text" value={product} onChange={(e) => setProduct(e.target.value)}
                  placeholder="例如：户外家具、宠物用品、瑜伽服装"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户类型</label>
                <input type="text" value={clientType} onChange={(e) => setClientType(e.target.value)}
                  placeholder="例如：进口商、批发商、品牌商、OEM 采购"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
              <button onClick={handleAiSearch} disabled={searching}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {searching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> AI 正在搜索 6 个方向...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> AI 智能搜索</>
                )}
              </button>
            </div>
          )}
          {step === "preview" && renderPreview()}
          {step === "done" && renderDone()}
        </>
      )}
    </div></>
  );
}

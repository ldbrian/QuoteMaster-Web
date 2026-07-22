"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import { Loader2, CheckCircle, Edit3, Send, ArrowRight } from "lucide-react";

type Profile = {
  id: string;
  companyName: string;
  mainProducts: string;
  coreAdvantages: string;
  targetCustomerType: string;
  targetMarkets: string;
  unsuitableClients: string;
  isCompleted: boolean;
};

const LABELS: Record<string, string> = {
  companyName: "公司名称",
  mainProducts: "主营产品",
  coreAdvantages: "核心优势",
  targetCustomerType: "目标客户类型",
  targetMarkets: "目标市场",
  unsuitableClients: "不适合的客户",
};

export default function CompanyDnaPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [aiReason, setAiReason] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("/api/company-profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProfile(data.profile);
    if (data.profile) {
      setEditing({
        companyName: data.profile.companyName || "",
        mainProducts: data.profile.mainProducts || "",
        coreAdvantages: data.profile.coreAdvantages || "",
        targetCustomerType: data.profile.targetCustomerType || "",
        targetMarkets: data.profile.targetMarkets || "",
        unsuitableClients: data.profile.unsuitableClients || "",
      });
    } else {
      setEditing({
        companyName: "",
        mainProducts: "",
        coreAdvantages: "",
        targetCustomerType: "",
        targetMarkets: "",
        unsuitableClients: "",
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchProfile(); // eslint-disable-line
  }, [authLoading, fetchProfile]);

  const getMissingFields = () => {
    const missing: string[] = [];
    for (const [key, label] of Object.entries(LABELS)) {
      if (key === "unsuitableClients") continue;
      if (!editing[key]?.trim()) missing.push(label);
    }
    return missing;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("/api/company-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editing),
    });
    const data = await res.json();
    setProfile(data.profile);
    setSaving(false);
    setEditMode(false);
    setAiSuggestion("");
    setAiReason("");
  };

  const handleAskAI = () => {
    const missing = getMissingFields();
    if (missing.length === 0) {
      setAiSuggestion("所有信息已完善！你可以开始分析客户了。");
      setAiReason("");
      return;
    }
    setAiSuggestion(`接下来请告诉我：你的${missing[0]}是什么？`);
    setAiReason(`完善"${missing[0]}"有助于 AI 更精准地分析客户匹配度。`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  const missing = getMissingFields();

  if (profile?.isCompleted && !editMode) {
    return (
      <><AppHeader /><div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-8">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h1 className="text-2xl font-bold">公司资料已完善</h1>
        </div>
        <div className="space-y-4 mb-8">
          {Object.entries(LABELS).map(([key, label]) => (
            <div key={key}>
              <div className="text-sm text-gray-500">{label}</div>
              <div className="text-gray-900">{editing[key] || "-"}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" /> 编辑
          </button>
          <Link
            href="/home"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowRight className="w-4 h-4" /> 返回工作台
          </Link>
        </div>
      </div></>
    );
  }

  return (
    <><AppHeader /><div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">公司资料</h1>
      <p className="text-gray-500 mb-8">
        完善你的公司资料，让 AI 更精准地分析客户匹配度。
      </p>

      <div className="space-y-5">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {key !== "unsuitableClients" && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </label>
            <textarea
              value={editing[key] || ""}
              onChange={(e) =>
                setEditing((prev) => ({ ...prev, [key]: e.target.value }))
              }
              rows={key === "unsuitableClients" ? 2 : 3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`请输入${label}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {profile?.isCompleted ? "保存修改" : "保存资料"}
        </button>

        {missing.length > 0 && (
          <button
            onClick={handleAskAI}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Send className="w-4 h-4" /> AI 引导填写（还剩 {missing.length} 项）
          </button>
        )}
      </div>

      {aiSuggestion && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-medium text-blue-800">AI 建议</div>
          <div className="text-blue-700 mt-1">{aiSuggestion}</div>
          {aiReason && (
            <div className="text-blue-500 text-sm mt-1">{aiReason}</div>
          )}
        </div>
      )}
    </div></>
  );
}

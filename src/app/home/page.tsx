"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { supabase } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/src/components/AppHeader";
import { Loader2, Target, Mail, MessageSquare, Building2, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch("/api/company-profile", {
          headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        });
        const data = await res.json();
        setProfileCompleted(data.profile?.isCompleted ?? false);
      } catch {
        setProfileCompleted(false);
      }
      setChecking(false);
    })();
  }, [authLoading, user, router]);

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  if (!profileCompleted) {
    return (
      <>
        <AppHeader />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <Building2 className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-3">欢迎使用 QuoteMaster</h1>
          <p className="text-gray-500 mb-8">
            开始之前，请先完善你的公司资料。这样 AI 才能更精准地分析客户匹配度。
          </p>
          <Link
            href="/company-dna"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            <Building2 className="w-4 h-4" /> 完善公司资料
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">工作台</h1>
          <p className="text-gray-500 mt-1">选择一个模块开始工作</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/opportunities"
            className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">客户开发</h2>
            <p className="text-sm text-gray-500 mb-4">
              分析潜在客户价值，生成针对性的开发信。适合业务员使用。
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> 客户分析
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> 开发信
              </span>
            </div>
          </Link>

          <Link
            href="/threads"
            className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">跟单</h2>
            <p className="text-sm text-gray-500 mb-4">
              跟进已有客户的订单进度、沟通记录。适合跟单员使用。
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> 沟通记录
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 订单进度
              </span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Target, Sparkles, Mail, Search } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              Q
            </div>
            <span className="font-bold text-lg text-slate-800">QuoteMaster</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              登录
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
            <Sparkles size={16} />
            外贸业务员的 AI 机会发现助手
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            判断一个客户是否值得开发，<br />
            <span className="text-blue-600">只需要 1 分钟</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
            输入客户信息，AI 自动分析产品匹配度、开发价值、切入角度，并生成针对性的开发信。
            <br />
            不再盲目群发，把时间花在值得开发的客户上。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3.5 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              免费开始使用 <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-5xl mx-auto mt-32">
          <h2 className="text-2xl font-bold text-center mb-12">三步完成客户开发分析</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">输入客户信息</h3>
              <p className="text-sm text-slate-500">公司名称、网址、介绍，粘贴即可</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">AI 分析价值</h3>
              <p className="text-sm text-slate-500">匹配度评分 + 切入角度 + 风险提示</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">生成开发信</h3>
              <p className="text-sm text-slate-500">AI 基于分析结果，撰写针对性开发信</p>
            </div>
          </div>
        </div>

        {/* Why */}
        <div className="max-w-4xl mx-auto mt-32 bg-slate-900 rounded-3xl p-10 md:p-14 text-white">
          <h2 className="text-2xl font-bold mb-8 text-center">外贸业务员的真实痛点</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-2">❌ 盲目群发</h3>
              <p className="text-slate-400 text-sm">每天发 100 封开发信，回复率不到 1%。不知道哪些客户值得跟进。</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">❌ 千篇一律</h3>
              <p className="text-slate-400 text-sm">所有客户用同一套模板，老外一看就是群发的，直接删除。</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">❌ 信息分散</h3>
              <p className="text-slate-400 text-sm">客户信息散落在邮箱、WhatsApp、LinkedIn，没有体系化分析。</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">✅ 精准开发</h3>
              <p className="text-slate-400 text-sm">QuoteMaster 帮你在 1 分钟内完成客户分析，把精力聚焦在最高价值的客户上。</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-4xl mx-auto mt-32 border-t border-slate-200 pt-8 pb-4 text-center">
          <p className="text-xs text-slate-400">QuoteMaster · AI 外贸客户开发助手</p>
        </div>
      </main>
    </div>
  );
}

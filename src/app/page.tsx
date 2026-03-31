'use client'; 

import React, { useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, ShieldAlert, TrendingUp, Lock, Gift, Crown, 
  AlertTriangle, CheckCircle2, BarChart3, Layers, Zap
} from 'lucide-react';
import { trackEvent } from '@/src/utils/analytics'; 

export default function LandingPage() {

  // 📊 埋点 1：漏斗的最顶端 —— 监控首页曝光 (PV/UV)
  useEffect(() => {
    trackEvent('view_landing_page');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              Q
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">QuoteMaster</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_nav_login')} 
              className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors hidden sm:block"
            >
              登录工作台
            </Link>
            
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_nav_claim_gift')}
              className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <Gift size={14} /> 领取 15 次核价算力
            </Link>
          </div>
        </div>
      </nav>

      {/* 🚀 首屏 (Hero) - 一击命中 */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
            <Crown size={16} className="text-amber-500" />
            <span>你不是不会报价，你只是没有老鸟的那套算法</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
            30 秒，让你报出一个<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              像干了 10 年的价格。
            </span>
          </h1>
          
          <div className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
            同一张询盘图片，新手报 $5 被嫌贵，老业务员报 $6.2 反而成交。<br/>
            <strong className="text-slate-900">差的不是价格，而是你的“报价逻辑”。</strong>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_hero_cta')}
              className="w-full sm:w-auto px-10 py-4 text-base font-black text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              免费试用 (送 15 次防坑算力) <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* ⚠️ 情绪共鸣区 (Pain Points) */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-800 mb-4">外贸最残酷的一点是：报价错一次，你可能直接出局。</h2>
            <p className="text-slate-500">你是不是也经历过这 3 种崩溃瞬间？</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                <ShieldAlert size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">恐惧：根本不知道这价安不安全</h3>
              <p className="text-slate-600 text-sm leading-relaxed">客户发来图问价。你内心极其挣扎：报高了，客户直接消失 (Ghosted)；报低了，一旦接单可能做一单亏一单。</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 border border-slate-200">
                <TrendingUp size={24} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">碾压：被同行的高价无情截胡</h3>
              <p className="text-slate-600 text-sm leading-relaxed">你的价格明明比同行便宜 20%，客户却选了他。因为对方甩出了一份极其专业的 BOM 拆解，而你只给了一个冷冰冰的数字。</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-200">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">死局：没资源没人带的盲人摸象</h3>
              <p className="text-slate-600 text-sm leading-relaxed">没有靠谱的源头工厂资源，没有老业务员带你。拿不准面料单耗，算不清克重，每一单的报价都像在赌博。</p>
            </div>
          </div>
        </div>

        {/* 🛡️ 解决方案区 (Features) */}
        <div className="max-w-6xl mx-auto mt-32 bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 opacity-20 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">我们做的不是报价工具，</h2>
            <h2 className="text-3xl md:text-4xl font-black text-blue-400">而是把你欠缺的 10 年经验，写成了系统。</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-10">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <Layers className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">行业潜规则：双引擎报价系统</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">以为所有衣服都套一个公式？系统内置 Woven (梭织算面积与单耗) 和 Knit (针织算克重与工时) 独立引擎。不是帮你算价格，是帮你选对底层算法。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">逼单神器：A/B 双阶梯谈判策略</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">还在和客户说“这个价格做不了”？系统每次自动生成 Plan A (原版高配撑认知) 和 Plan B (平替材料跑量版)，附带高情商对客英文话术。本质是帮客户做利润设计。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <BarChart3 className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">30秒摸清底牌：安全区间揭秘</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">无需实物，扔几张网图进去，30秒输出底层 BOM 结构、每一项的预估成本及防亏底线区间。你不再是“猜价格”，而是在“做决策”。</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-center transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute -top-4 -right-4 bg-amber-500 text-slate-900 font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-12 text-sm">
                内部真实界面演示
              </div>
              <img src="/demo-interface.jpg" alt="QuoteMaster 界面演示" className="rounded-xl border border-slate-600 shadow-inner bg-slate-900 w-full h-auto object-cover min-h-[300px] fallback-bg" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden absolute inset-0 m-6 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500">
                <Lock size={32} className="mb-2 opacity-50" />
                <span className="font-bold text-sm">登录工作台后查看极速解析引擎</span>
              </div>
            </div>
          </div>
        </div>

        {/* 💰 价格锚点与最终转化 (Pricing Anchor) */}
        <div className="max-w-4xl mx-auto mt-32 text-center">
          <div className="inline-block bg-rose-50 border border-rose-200 text-rose-600 px-6 py-2 rounded-full font-bold mb-8 shadow-sm">
            算一笔账：你现在的报价方式，其实更贵。
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-6">报错一单亏 $200 (¥1400)</h2>
          <p className="text-xl text-slate-600 mb-10 font-medium">而 QuoteMaster Pro，<strong className="text-blue-600">每天只要不到一杯奶茶钱</strong>。</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_footer_cta_free')}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-full shadow-sm transition-all"
            >
              先白嫖 15 次测一下
            </Link>
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_footer_cta_pro')}
              className="w-full sm:w-auto px-10 py-4 text-base font-black text-white bg-slate-900 hover:bg-slate-800 rounded-full shadow-xl shadow-slate-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <Crown size={20} className="text-amber-400" /> 直接解锁 Pro 无限核价
            </Link>
          </div>
          
          <p className="mt-8 text-sm text-slate-400 font-medium">
            你是在买工具吗？不，你是在买 <strong className="text-slate-600 underline underline-offset-4">少亏钱的概率</strong>。
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-24 border-t border-slate-200 pt-8 pb-4 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            QuoteMaster AI Engine™ · 把定价权握在手里
          </p>
        </div>
      </main>
    </div>
  );
}
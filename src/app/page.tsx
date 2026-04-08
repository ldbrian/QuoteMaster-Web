'use client'; 

import React, { useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, ShieldAlert, Lock, Gift, Crown, 
  AlertTriangle, BarChart3, MessageCircle, FileText, Zap, HeartCrack, BotMessageSquare
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
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              Q
            </div>
            <span className="font-black text-xl tracking-tight text-slate-800">QuoteMaster</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_nav_login')} 
              className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors hidden sm:block"
            >
              登录战斧终端
            </Link>
            
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_nav_claim_gift')}
              className="px-4 py-2 text-sm font-bold text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-900 hover:text-white rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <Gift size={14} /> 领取 5 次免费算力
            </Link>
          </div>
        </div>
      </nav>

      {/* 🚀 首屏 (Hero) - 一击命中痛点 */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-black mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm uppercase tracking-wide">
            <Zap size={16} className="text-blue-500" />
            专为外贸单兵打造的“稳单+避坑”战斧
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
            告别“等工厂回复”，<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              拿回外贸成单主动权。
            </span>
          </h1>
          
          <div className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
            QuoteMaster 不是冰冷的算价器，而是你的<strong className="text-slate-900">【信息保真与决策终端】</strong>。<br/>
            在工厂“装死”拖延时，给你秒级的底价与交期预判。当同行还在苦苦催促厂长时，你已经用极度地道的提案稳住了客户。
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_hero_cta')}
              className="w-full sm:w-auto px-10 py-4 text-base font-black text-white bg-slate-900 hover:bg-slate-800 rounded-full shadow-xl shadow-slate-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              免费开启极速核价 <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* ⚠️ 情绪共鸣区 (直击灵魂的三方拉扯) */}
        <div className="max-w-6xl mx-auto mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">你是不是每天都在经历这些“绝望时刻”？</h2>
            <p className="text-slate-500 font-medium">信息每传递失真一次，你的订单就死掉一次。</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 group-hover:scale-110 transition-transform">
                <HeartCrack size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">夹心饼干的“等死”焦虑</h3>
              <p className="text-slate-600 text-sm leading-relaxed">客户拼命催报价，工厂老板装死去喝茶。没数据不敢回客户，估高了直接丢单，估低了自己掏钱倒贴。</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">鸡同鸭讲的“打样翻车”</h3>
              <p className="text-slate-600 text-sm leading-relaxed">客户发图要“底部翻边”，打样师傅按常规做，结果全起褶皱报废。师傅不懂英文，客户不懂工艺，你夹在中间背黑锅。</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 transition-transform">
                <BotMessageSquare size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">毫无生气的“机器味”邮件</h3>
              <p className="text-slate-600 text-sm leading-relaxed">用翻译软件写出来的长篇大论，完美却生硬。老外在 WhatsApp 上一看就觉得你是群发机器，根本不想回你。</p>
            </div>
          </div>
        </div>

        {/* 🪓 解决方案区 (核心武器库) */}
        <div className="max-w-6xl mx-auto mt-32 bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 opacity-20 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">QuoteMaster: 你的全天候 AI 业务副驾</h2>
            <p className="text-slate-400 font-medium">不只是算价格，更是帮你降噪、排雷、稳住谈判桌。</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-10">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <MessageCircle className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">一击必杀：对客稳单引擎</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">放弃生硬的邮件！AI 深度模仿地道 WhatsApp 散装外贸体（短句、缩写），连同智能预判的 **打样/大货交期 (ETA)**，让你一秒复制发送，极速稳住客户预期。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-500/20 border border-amber-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-amber-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">降伏工厂：打样防翻车指南</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">独家视觉大模型，能从高糊网图中精准抓取“隐藏工艺陷阱”。一键生成带中文警告的【避坑工艺单】，让打样师傅一次做对，打样过稿率飙升。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center shrink-0">
                  <BarChart3 className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">掌控底牌：X光级 BOM 护城河</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">彻底拒绝被工厂糊弄。AI 强行拆解纯面辅料与加工费，给出绝对安全的底价区间。配合 A/B 阶梯降级方案，一键渲染大厂级 PDF 报价书，堵死还价空间。</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-center transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute -top-4 -right-4 bg-amber-500 text-slate-900 font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-12 text-sm z-20">
                双栏驾驶舱实机演示
              </div>
              <img src="/demo-interface.png" alt="QuoteMaster 战斧终端界面演示" className="rounded-xl border border-slate-600 shadow-inner bg-slate-900 w-full h-auto object-cover min-h-[300px] fallback-bg relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden absolute inset-0 m-6 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 z-10 bg-slate-800">
                <Lock size={32} className="mb-2 opacity-50" />
                <span className="font-bold text-sm">登录工作台后查看战斧终端</span>
              </div>
            </div>
          </div>
        </div>

        {/* 💰 价格锚点与最终转化 (Pricing Anchor) */}
        <div className="max-w-4xl mx-auto mt-32 text-center">
          <div className="inline-block bg-slate-100 border border-slate-200 text-slate-600 px-6 py-2 rounded-full font-bold mb-8 shadow-sm">
            轻装上阵，还是掌控极致底牌？
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-6">报错一单亏 $200，打样重做废 5 天</h2>
          <p className="text-xl text-slate-600 mb-10 font-medium">而武装到牙齿的 QuoteMaster Pro，<strong className="text-blue-600">每天只要一杯咖啡钱</strong>。</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_footer_cta_free')}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900 rounded-xl shadow-sm transition-all"
            >
              免费体验基础版 (送 5 次)
            </Link>
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent('click_footer_cta_pro')}
              className="w-full sm:w-auto px-10 py-4 text-base font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xl shadow-slate-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <Crown size={20} className="text-amber-400" /> 解锁 Pro 战斧版 (¥999/季度)
            </Link>
          </div>
          
          <p className="mt-8 text-sm text-slate-400 font-medium">
            你是在买工具吗？不，你是在买 <strong className="text-slate-600 underline underline-offset-4">拿回整张谈判桌主动权的能力</strong>。
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-24 border-t border-slate-200 pt-8 pb-4 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            QuoteMaster AI Terminal™ · 外贸单兵的超级副驾
          </p>
        </div>
      </main>
    </div>
  );
}
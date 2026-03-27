import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Zap, ShieldAlert, CheckCircle2, 
  TrendingUp, Lock, Target, Gift
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              Q
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">QuoteMaster</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              登录工作台
            </Link>
            <Link href="/dashboard" className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-full transition-all active:scale-95 flex items-center gap-1.5">
              <Gift size={14} /> 领取 15 次核价算力
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero 首屏 */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Zap size={16} className="fill-blue-600" />
            <span>专为高阶外贸业务员打造的 AI 谈判辅助 SaaS</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
            告别底价内卷，把定价权握在手里。<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              用 AI 打造无法拒绝的商业提案。
            </span>
          </h1>
          
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-500 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
            不仅是极速核价工具，更是你的全能谈判助理。上传询盘图片，AI 自动预判全球流行趋势，3秒拆解底层 BOM，并为你智能生成“高低搭配”的阶梯报价与对客营销话术。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              进入工作台 (注册即赠 15 次高阶算力) <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* 痛点对比区 (Judo Strategy) */}
        <div className="max-w-6xl mx-auto mt-32 grid md:grid-cols-2 gap-12 items-center">
          
          {/* 传统的痛点 */}
          <div className="bg-white p-8 md:p-10 rounded-3xl border border-red-100 shadow-xl shadow-red-50/50 relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShieldAlert size={100} className="text-red-500" />
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100 relative z-10">
              <ShieldAlert size={24} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-bold mb-6 text-slate-800 relative z-10">传统外贸报价的“漏斗与风险”</h3>
            <ul className="space-y-5 relative z-10">
              <li className="flex items-start gap-3 text-slate-600">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                <span><strong className="text-slate-800">底价与工艺“裸奔”：</strong>直接把内控 Excel 发给海外买家，极易陷入无休止的低价拉锯战，甚至面临客户绕过业务员直接找源头工厂的风险。</span>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                <span><strong className="text-slate-800">单一报价死局：</strong>只给一个冷冰冰的数字，报高了吓跑客户，报低了伤及利润。缺乏谈判桌上的弹性筹码与选择空间。</span>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                <span><strong className="text-slate-800">缺乏商业包装与说服力：</strong>难以提炼款式背后的流行趋势与附加值，无法通过专业度引导海外客户加注高利润订单。</span>
              </li>
            </ul>
          </div>

          {/* 我们的方案 */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-8 md:p-10 rounded-3xl shadow-2xl shadow-blue-900/30 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20 relative z-10">
              <Zap size={24} className="text-blue-100" />
            </div>
            <h3 className="text-2xl font-bold mb-6 text-white relative z-10">QuoteMaster 业务赋能引擎</h3>
            <ul className="space-y-5 relative z-10">
              <li className="flex items-start gap-3 text-blue-100">
                <Target className="shrink-0 text-amber-400 mt-1" size={20} />
                <span><strong className="text-white text-lg block mb-1">A/B/C 三阶方案矩阵</strong>一键生成“性价比跑量 / 标准对标 / 高端精品”方案。用高低搭配为客户提供选择题，有效提升询盘转化率。</span>
              </li>
              <li className="flex items-start gap-3 text-blue-100">
                <TrendingUp className="shrink-0 text-purple-400 mt-1" size={20} />
                <span><strong className="text-white text-lg block mb-1">爆款雷达与金牌跟单话术</strong>自动提取欧美时尚标签，拆分生成地道的“对客英文营销话术”与“对内中文压价策略”，让新手也能展现老手风范。</span>
              </li>
              <li className="flex items-start gap-3 text-blue-100">
                <Lock className="shrink-0 text-emerald-400 mt-1" size={20} />
                <span><strong className="text-white text-lg block mb-1">B2B 数据防火墙</strong>内部全盘掌控精细 BOM 成本；对外一键导出过滤敏感数据的“净化版” PDF，打上水印，彻底保护公司利润基密。</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部信任条 */}
        <div className="max-w-4xl mx-auto mt-32 text-center border-t border-slate-200 pt-12 pb-8">
          <p className="text-slate-500 font-medium mb-6 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            QuoteMaster AI Engine™ - 您的全能外贸谈判助理
          </p>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} QM-AI. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
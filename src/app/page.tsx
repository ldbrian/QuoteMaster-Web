import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, FileSpreadsheet, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-sm transition-all active:scale-95">
              免费试用
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero 首屏 */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Zap size={16} className="fill-blue-600" />
            <span>专为服装/箱包柔性定制打造的 AI 核价引擎</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
            让第一天上班的实习生，<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              开出十年老业务员的精准报价单。
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
            告别繁琐的提示词，抛弃易错的 Excel。只需上传包含多视角的询盘图片，系统 3 秒自动拆解 BOM、匹配实时汇率与运费，一键生成防亏损的精美 PDF 报价单。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              开始免费测算询盘 <ArrowRight size={20} />
            </Link>
            <p className="text-sm text-slate-400 sm:hidden">不准包退，无需绑卡</p>
          </div>
        </div>

        {/* 痛点对比区 (Judo Strategy) */}
        <div className="max-w-6xl mx-auto mt-32 grid md:grid-cols-2 gap-12 items-center">
          {/* 传统的痛点 */}
          <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl shadow-red-50/50">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
              <FileSpreadsheet size={24} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-slate-800">传统手工/Excel 核价的代价</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-600">
                <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={20} />
                <span><strong className="text-slate-800">汇率/公式算错：</strong>多版本表格传来传去，平均每月造成 $600-$1000 隐性利润流失。</span>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={20} />
                <span><strong className="text-slate-800">细节漏项严重：</strong>看不全多图细节，漏算刺绣/特殊材质，生产时才发现亏本。</span>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={20} />
                <span><strong className="text-slate-800">响应极其缓慢：</strong>核算复杂 BOM 需要 2 小时，发给客户时，单子早被竞品抢走。</span>
              </li>
            </ul>
          </div>

          {/* 我们的方案 */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <Zap size={24} className="text-blue-100" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">QuoteMaster 降维打击</h3>
            <ul className="space-y-4 relative z-10">
              <li className="flex items-start gap-3 text-blue-100">
                <CheckCircle2 className="shrink-0 text-blue-300 mt-0.5" size={20} />
                <span><strong className="text-white">全自动化利润管控：</strong>后台配置基础利润率与实时汇率，彻底终结人为错算。</span>
              </li>
              <li className="flex items-start gap-3 text-blue-100">
                <CheckCircle2 className="shrink-0 text-blue-300 mt-0.5" size={20} />
                <span><strong className="text-white">多图综合 AI 视觉：</strong>同时识别正面、背面及细节图，毫秒级提取完整材质 BOM 表。</span>
              </li>
              <li className="flex items-start gap-3 text-blue-100">
                <CheckCircle2 className="shrink-0 text-blue-300 mt-0.5" size={20} />
                <span><strong className="text-white">一键生成出海 PDF：</strong>3 秒钟导出带 Logo 的专业美金报价单，秒杀同行响应速度。</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部信任条 */}
        <div className="max-w-4xl mx-auto mt-32 text-center border-t border-slate-200 pt-12 pb-8">
          <p className="text-slate-500 font-medium mb-6">QuoteMaster - 专为现代出海制造企业打造</p>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} ToughLove Online. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
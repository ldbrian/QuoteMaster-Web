'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AntiLowballTool() {
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('woven');
  const [result, setResult] = useState<any>(null);

  const calculateRisk = () => {
    const orig = parseFloat(originalPrice);
    const target = parseFloat(targetPrice);

    if (!orig || !target) {
      alert("⚠️ 请输入完整的报价信息");
      return;
    }
    if (target >= orig) {
      alert("😅 老外的目标价居然比你报的还高？赶紧接单吧，别测了！");
      return;
    }

    const dropPercent = ((orig - target) / orig) * 100;
    const diff = (orig - target).toFixed(2); // 算出具体砍了多少钱
    
    // 动态提取类目名称和核心成本项，增加专业感
    const catMap: Record<string, { name: string, driver: string }> = {
      'woven': { name: '梭织服装', driver: '面料排版损耗' },
      'knit': { name: '针织/毛织', driver: '纱线损耗与克重' },
      'bags': { name: '箱包配件', driver: '五金件与开模费' }
    };
    const catInfo = catMap[category] || catMap['woven'];

    let riskLevel = 'LOW';
    let title = '';
    let message = '';
    let showEasterEgg = false;
    let easterEggText = '';

    // 彩蛋盲盒库
    const easterEggs = [
      `“该客户的报价已突破碳基生物的底线。建议直接回复：Dear Sir, 拿着 $${target} 的预算，我们只能为您提供该款式的高清打印照片。如需现货，建议左转下载 Temu。”`,
      `“建议回复：尊敬的客户，单件直接砍掉 $${diff} 是个天才的想法。我们接受这个报价，但只能发给您一堆${catInfo.name}的边角料，请您自己用胶水粘起来。”`,
      `“建议回复：Dear Sir, 看到您 $${target} 的目标价，我们车间的缝纫机连夜扛着火车跑了。建议您带着这个预算去义乌小商品市场按斤批发。”`
    ];

    if (dropPercent > 30) {
      riskLevel = 'CRITICAL';
      title = `⚡️ 严重警告：跌幅 ${dropPercent.toFixed(1)}%！`;
      // 动态拼接文案
      message = `单件直接被砍掉 $${diff}！这个跌幅已经彻底击穿江浙沪${catInfo.name}的常规加工费底线！强行接单意味着你在倒贴人工和场地费。`;
      showEasterEgg = true;
      // 随机抽取一个彩蛋
      easterEggText = easterEggs[Math.floor(Math.random() * easterEggs.length)];
    } else if (dropPercent > 15) {
      riskLevel = 'HIGH';
      title = `⚠️ 高风险：跌幅 ${dropPercent.toFixed(1)}%`;
      message = `单件想抠出 $${diff} 的利润，空间已被严重挤压！按原版工艺做${catInfo.name}大概率白忙一场。必须立刻重新核算${catInfo.driver}，并向老外提供【降维减配版】方案。`;
    } else {
      riskLevel = 'MEDIUM';
      title = `💡 处于博弈区间：跌幅 ${dropPercent.toFixed(1)}%`;
      message = `老外想少付 $${diff}，这属于常规的试探性砍价。建议通过微调起订量（MOQ）或交期来换取不降价，切勿轻易让步。`;
    }

    setResult({ riskLevel, dropPercent, title, message, showEasterEgg, easterEggText });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100/50">
        
        {/* 头部区：打造专业且克制的第一印象 */}
        <div className="bg-slate-900 px-8 py-8 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight">外贸压价风险自测仪</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">输入客户砍价目标，系统基于行业基准线秒测潜在亏损风险。</p>
        </div>

        {/* 核心表单区 */}
        <div className="px-8 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">你的初始报价 (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium">$</span>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 font-bold placeholder-slate-300"
                  placeholder="15.00"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">老外的目标价 (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium">$</span>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-red-900 font-bold placeholder-red-300"
                  placeholder="9.50"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">产品主类目</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-medium"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="woven">梭织服装 (夹克/风衣/棉服)</option>
              <option value="knit">针织与毛织 (T恤/卫衣/毛衣)</option>
              <option value="bags">箱包与户外配件</option>
            </select>
          </div>

          <button 
            onClick={calculateRisk}
            className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 mt-4"
          >
            拉响警报：测算底线风险
          </button>
        </div>

        {/* 动态结果面板 */}
        {result && (
          <div className="px-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. 风险警告框 */}
            <div className={`p-6 rounded-2xl border-2 ${
              result.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-500' : 
              result.riskLevel === 'HIGH' ? 'bg-orange-50 border-orange-400' : 
              'bg-blue-50 border-blue-400'
            }`}>
              <h3 className={`text-lg font-black mb-2 ${
                result.riskLevel === 'CRITICAL' ? 'text-red-700' : 
                result.riskLevel === 'HIGH' ? 'text-orange-700' : 
                'text-blue-700'
              }`}>
                {result.title}
              </h3>
              <p className="text-slate-700 font-medium leading-relaxed text-sm">
                {result.message}
              </p>
            </div>

            {/* 2. 掀桌子彩蛋 (仅在深度砍价时触发) */}
            {result.showEasterEgg && (
              <div className="mt-4 p-5 bg-slate-900 rounded-2xl shadow-inner border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 text-6xl opacity-20">🤬</div>
                <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center">
                  <span className="mr-2">💡</span> 情绪释放专区 (倒反天罡版回复)
                </h4>
                {/* 这里渲染动态文案 */}
                <p className="text-slate-300 text-sm italic leading-relaxed relative z-10 font-medium">
                  {result.easterEggText}
                </p>
              </div>
            )}

            {/* 3. 终极转化漏斗：导向 QuoteMaster 主应用 */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="text-center mb-5">
                <h4 className="text-lg font-black text-slate-900">不知道真实底线，怎么跟老外反杀？</h4>
                <p className="text-sm text-slate-500 mt-2 font-medium px-4">
                  不要靠经验瞎猜！上传款式图，QuoteMaster AI 引擎为你精准拆解真实出厂底价，并自动生成对客降维报价方案。
                </p>
              </div>
              <Link href="/dashboard" className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-white font-black shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-[0.98]">
                <span>👉 进入 AI 核价引擎防身</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
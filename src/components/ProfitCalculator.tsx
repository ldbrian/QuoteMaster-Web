'use client';

import React, { useState } from 'react';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ProfitCalculator({ defaultCostRMB = 100 }) {
  // 基础输入状态
  const [factoryCost, setFactoryCost] = useState(defaultCostRMB);
  const [quoteUSD, setQuoteUSD] = useState(20);
  
  // 核心金融参数状态（默认值体现了我们的护城河逻辑）
  const [quoteRate, setQuoteRate] = useState(6.0);   // 给老外报盘用的“吃亏汇率”
  const [realRate, setRealRate] = useState(7.2);     // 实际去银行结汇的“真实汇率”
  const [taxRate, setTaxRate] = useState(13);        // 退税率 (%)

  // 🧮 轨道 A：表面利润 (发给老外的明文账本)
  // 算法：报价(USD) - (成本RMB / 报盘汇率)
  const surfaceProfitUSD = quoteUSD - (factoryCost / quoteRate);
  const surfaceMargin = quoteUSD > 0 ? (surfaceProfitUSD / quoteUSD) * 100 : 0;

  // 🧮 轨道 B：真实隐形利润 (业务员/老板的上帝视角)
  // 退税收入 (RMB) = (成本 / 1.13) * (退税率 / 100)
  const taxRebateRMB = (factoryCost / 1.13) * (taxRate / 100);
  // 真实总收入 (RMB) = (报价USD * 实际汇率) + 退税收入
  const realTotalRevenueRMB = (quoteUSD * realRate) + taxRebateRMB;
  // 真实利润 (RMB) = 真实总收入 - 出厂成本
  const realProfitRMB = realTotalRevenueRMB - factoryCost;
  const realMargin = realTotalRevenueRMB > 0 ? (realProfitRMB / realTotalRevenueRMB) * 100 : 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl mt-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="text-blue-400" size={20} />
        <h3 className="font-bold text-lg">QuoteMaster 隐形利润核算器</h3>
        <span className="ml-auto text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">上帝视角 (Only for you)</span>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* 左侧：输入控制台 */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">工厂含税底价 (RMB)</label>
            <input type="number" value={factoryCost} onChange={e => setFactoryCost(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">你的对外报价 (USD)</label>
            <input type="number" value={quoteUSD} onChange={e => setQuoteUSD(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">对外报盘汇率</label>
              <input type="number" step="0.1" value={quoteRate} onChange={e => setQuoteRate(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-rose-400 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">出口退税率 (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-emerald-400 font-bold" />
            </div>
          </div>
        </div>

        {/* 右侧：双轨利润展示 */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 flex flex-col justify-center">
          
          {/* 表面账本 */}
          <div className="mb-4 pb-4 border-b border-slate-700">
            <div className="text-xs text-slate-400 mb-1">发给客户的表面利润 (按 {quoteRate} 汇率)</div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-black ${surfaceProfitUSD <= 0 ? 'text-rose-500' : 'text-slate-200'}`}>
                ${surfaceProfitUSD.toFixed(2)}
              </span>
              <span className="text-sm text-slate-500 mb-1">({surfaceMargin.toFixed(1)}%)</span>
            </div>
            {surfaceProfitUSD <= 0 && (
              <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1"><AlertTriangle size={12}/> 表面亏损，正是向客户“卖惨”逼单的好时机</div>
            )}
          </div>

          {/* 真实账本 */}
          <div>
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <TrendingUp size={14} className="text-emerald-400"/> 真实含税/汇差净利
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-emerald-400">
                ¥{realProfitRMB.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded">净利率: {realMargin.toFixed(1)}%</span>
              <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded">包含退税: ¥{taxRebateRMB.toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
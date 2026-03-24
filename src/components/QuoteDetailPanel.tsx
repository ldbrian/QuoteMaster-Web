'use client';

import React from 'react';
import { X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, Target, Scale, DollarSign } from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any; 
  quoteData: any; 
}

export default function QuoteDetailPanel({ isOpen, onClose, inquiry, quoteData }: QuoteDetailPanelProps) {
  
  if (!isOpen || !inquiry) return null;

  const isAnalyzed = inquiry.status === 'completed' && quoteData;

  const planKeys = [
    { key: 'plan_a', name: 'Plan A (Cost-Effective / 极致性价比)', icon: Target, bgColor: 'border-emerald-100 bg-emerald-50' },
    { key: 'plan_b', name: 'Plan B (Standard / 标准对标)', icon: Scale, bgColor: 'border-blue-100 bg-blue-50' },
    { key: 'plan_c', name: 'Plan C (Premium / 高端品牌线)', icon: DollarSign, bgColor: 'border-amber-100 bg-amber-50' }
  ] as const;

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-5/6 max-w-7xl bg-white shadow-2xl z-[70] flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* 标准 Header - 保持 minimal */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">
            {inquiry.product_name || 'AI 多阶方案详情'}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Space - 确保滚动 */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        {!isAnalyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-sm">AI 极速核价进行中，请稍候...</p>
          </div>
        ) : (
          <>
            {/* 🌟 视觉锚点：商品情报看板 (含主图) */}
            <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 flex gap-6 items-start shadow-sm">
              
              {/* 1. 核心商品图 (防打断视觉锚点) - 160px x 160px */}
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                {inquiry?.thumbnail_url ? (
                  <img src={inquiry.thumbnail_url} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">暂无图片</div>
                )}
              </div>

              {/* 2. 商品标题与商业标签 */}
              <div className="flex-1 flex flex-col justify-between h-40 py-1">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 line-clamp-1">
                    {quoteData?.product_name || inquiry?.product_name || '未知商品'}
                  </h1>
                  
                  {/* 预埋的趋势标签 */}
                  <div className="flex items-center gap-2 mt-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      <Loader2 className="w-3.5 h-3.5" /> 状态：分析已完成
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                      <Tag className="w-3.5 h-3.5" /> Style: 流行款预判 (Beta)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                      <TrendingUp className="w-3.5 h-3.5" /> 商业数据引擎
                    </span>
                  </div>
                </div>

                {/* AI 外部诊断 Insight Block */}
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2">
                  <strong className="text-slate-800 font-medium">专家诊断：</strong>
                  {quoteData?.analysis_reasoning || '正在生成多维度分析结论...'}
                </p>
              </div>
            </div>

            {/* A/B/C 三阶核价方案矩阵 */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Proposal Matrix</h3>
              </div>
              
              {/* 🛑 致命错误拦截：如果发现是旧版历史数据（无 plans 结构），则阻断渲染 */}
              {!quoteData?.plans ? (
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                    <BarChart3 className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">历史格式数据</h4>
                  <p className="text-sm text-slate-500 max-w-md">
                    这是一条早期生成的单阶报价记录，没有最新的 A/B/C 三套方案。建议您关闭详情，在列表中点击“重新测算”以体验最新版 AI 引擎。
                  </p>
                </div>
              ) : (
                /* 正常渲染新版三阶方案 */
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {planKeys.map(({ key, name, icon: Icon, bgColor }) => {
                    const plan = quoteData.plans[key];
                    if (!plan) return null;

                    // 🛡️ 防御性取值：防止 AI 未返回该字段导致 .toFixed 崩溃
                    const marginValue = plan.margin || 0;
                    const finalPriceValue = plan.final_price || 0;
                    const moqValue = plan.moq || 500;

                    return (
                      <div key={key} className={`border rounded-2xl p-6 ${bgColor} flex flex-col`}>
                        <div className="flex items-center gap-3 mb-5 border-b pb-4 border-slate-200/50">
                          <Icon className="w-6 h-6 text-slate-600" />
                          <h4 className="font-extrabold text-lg text-slate-900">{plan.name || name}</h4>
                        </div>

                        {/* 内部视角：利润率 */}
                        <div className="mb-4">
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Internal Margin</span>
                          <p className="text-3xl font-black text-slate-900">{(marginValue * 100).toFixed(0)}%</p>
                        </div>

                        {/* 内部视角：出厂价 */}
                        <div className="p-4 bg-white rounded-xl border border-slate-100 mb-6">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-medium text-slate-500">Estimated FOB Shanghai:</span>
                            <span className="text-xl font-bold text-emerald-700">${finalPriceValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-sm text-slate-600">
                            <span>MOQ:</span>
                            <span className="font-mono text-slate-800">{moqValue} pcs</span>
                          </div>
                        </div>

                        {/* BOM 渲染 - 加入成本防御 */}
                        <div className="flex-1 space-y-4 mb-6">
                          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-widest">BOM Breakdown (Internal Cost)</h5>
                          <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-1.5 text-xs">
                            {plan.bom && Array.isArray(plan.bom) ? plan.bom.map((item: any, index: number) => {
                              const costValue = item.cost || 0;
                              return (
                                <div key={index} className="grid grid-cols-[1fr,auto] gap-2 py-1 text-slate-700 font-mono border-b border-slate-100 last:border-0">
                                  <span className="truncate">{item.name || item.item}</span>
                                  <span className="text-right text-emerald-700 font-bold">${costValue.toFixed(2)}</span>
                                </div>
                              );
                            }) : (
                              <div className="text-slate-400 text-center py-2">BOM 数据未吐出</div>
                            )}
                          </div>
                        </div>

                        {/* 内部视角：对厂话术 */}
                        <div className="bg-slate-900 rounded-xl p-4 text-sm text-slate-100">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">Factory Negotiation Pitch</span>
                          <p className="whitespace-pre-wrap">{plan.factory_pitch || 'AI 暂未提供话术，请根据核价结论自行判断。'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="h-4"></div>
    </div>
  );
}
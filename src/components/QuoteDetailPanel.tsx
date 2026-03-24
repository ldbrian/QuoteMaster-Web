'use client';

import React, { useState } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  Target, Scale, DollarSign, FileText, Download, Calculator, Settings2
} from 'lucide-react'; 

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any; 
  quoteData: any; 
}

export default function QuoteDetailPanel({ isOpen, onClose, inquiry, quoteData }: QuoteDetailPanelProps) {
  // 🌟 恢复 Tab 切换状态，默认选中标准版
  const [activeTab, setActiveTab] = useState<'plan_a' | 'plan_b' | 'plan_c'>('plan_b');
  
  if (!isOpen || !inquiry) return null;

  const isAnalyzed = inquiry.status === 'completed' && quoteData;

  const tabs = [
    { id: 'plan_a', label: 'Plan A (性价比版)', icon: Target, color: 'emerald' },
    { id: 'plan_b', label: 'Plan B (标准对标)', icon: Scale, color: 'blue' },
    { id: 'plan_c', label: 'Plan C (高端品牌线)', icon: DollarSign, color: 'amber' }
  ] as const;

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-slate-50 shadow-2xl z-[70] flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* 顶部 Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">
            {inquiry.product_name || 'AI 核价详情页'}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {!isAnalyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-sm">AI 极速核价进行中，请稍候...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            
            {/* 🌟 视觉锚点：商品情报看板 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex gap-5 shadow-sm">
              <div className="w-32 h-32 rounded-xl overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                {inquiry?.thumbnail_url ? (
                  <img src={inquiry.thumbnail_url} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">暂无图片</div>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <h1 className="text-xl font-bold text-slate-800 line-clamp-1 mb-2">
                  {quoteData?.product_name || inquiry?.product_name || '未知商品'}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
                    <Tag className="w-3 h-3" /> Style: 流行预判 (Beta)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                    <TrendingUp className="w-3 h-3" /> 商业引擎激活
                  </span>
                </div>

                <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 overflow-y-auto">
                  <strong className="text-slate-800">专家诊断：</strong> 
                  {quoteData?.analysis_reasoning || '未生成诊断结论。'}
                </div>
              </div>
            </div>

            {/* 🛑 致命错误拦截：防御历史单阶数据 */}
            {!quoteData?.plans ? (
              <div className="flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-slate-700 font-bold mb-1">发现历史格式数据</h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  这是一条早期生成的单阶报价记录，无法启用 Tab 切换功能。请在工作台点击“重新测算”以体验最新三阶引擎。
                </p>
              </div>
            ) : (
              /* 🌟 恢复 Tab 操作区 */
              <div className="flex flex-col h-full space-y-4">
                
                {/* Tab 导航头 */}
                <div className="flex p-1 bg-slate-200/50 rounded-xl">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                          isActive 
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? `text-${tab.color}-500` : ''}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* 当前选中 Tab 的详细内容区 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                  {(() => {
                    const currentPlan = quoteData.plans[activeTab];
                    if (!currentPlan) return <div className="text-center text-slate-400 py-10">方案数据加载异常</div>;

                    const marginValue = currentPlan.margin || 0;
                    const finalPriceValue = currentPlan.final_price || 0;
                    const moqValue = currentPlan.moq || 500;

                    return (
                      <div className="space-y-6">
                        
                        {/* 核心财务指标栏 */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">FOB Shanghai</p>
                            <p className="text-2xl font-black text-emerald-600">${finalPriceValue.toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Target MOQ</p>
                            <p className="text-2xl font-black text-slate-800">{moqValue} <span className="text-sm font-medium text-slate-500">pcs</span></p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Est. Margin</p>
                            <p className="text-2xl font-black text-blue-600">{(marginValue * 100).toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* 汇率与参数微调 (预留 UI，满足操作纵深) */}
                        <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                           <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
                              <Calculator className="w-4 h-4" />
                              内部核算汇率 (USD/CNY): <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">7.25</span>
                           </div>
                           <button className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                             <Settings2 className="w-3.5 h-3.5" /> 修改基准
                           </button>
                        </div>

                        {/* BOM 明细 */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-500" />
                            内部 BOM 成本结构 (USD)
                          </h3>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2 font-bold text-slate-600">物料/工艺明细</th>
                                  <th className="px-4 py-2 font-bold text-slate-600 text-right w-32">预估单价</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {currentPlan.bom && Array.isArray(currentPlan.bom) ? currentPlan.bom.map((item: any, idx: number) => {
                                  const costValue = item.cost || 0;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3 text-slate-700 font-medium">{item.name || item.item}</td>
                                      <td className="px-4 py-3 text-right text-emerald-700 font-mono font-bold">${costValue.toFixed(2)}</td>
                                    </tr>
                                  );
                                }) : (
                                  <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">暂无明细数据</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 对厂谈判话术 */}
                        <div className="bg-slate-900 p-5 rounded-xl text-slate-300">
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                             工厂谈判策略 (Internal Use)
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {currentPlan.factory_pitch || 'AI 未提供话术。'}
                          </p>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 🌟 底部全局操作栏 (Export & Action) */}
      {isAnalyzed && quoteData?.plans && (
        <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            * 报价已通过数据防火墙脱敏，可放心导出给客户。
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 内部存档 (Excel)
            </button>
            {/* 这个按钮可以后续对接你的 ExportPreviewModal */}
            <button 
              onClick={() => alert('请在外部或父组件对接已完成的 ExportPreviewModal 弹窗')}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> 生成客户 PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
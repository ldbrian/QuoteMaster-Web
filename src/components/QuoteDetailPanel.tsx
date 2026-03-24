'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  Target, Scale, DollarSign, FileText, Download, Calculator, 
  RefreshCw, Copy, CheckCheck, Edit3, Save
} from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any; 
  quoteData: any; 
  onRetry?: () => void;
}

export default function QuoteDetailPanel({ isOpen, onClose, inquiry, quoteData, onRetry }: QuoteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'plan_a' | 'plan_b' | 'plan_c'>('plan_b');
  const [exchangeRate, setExchangeRate] = useState<number>(7.25);
  const [isCopied, setIsCopied] = useState(false);
  
  // 🌟 CTO 核心改造：引入本地响应式可编辑状态
  const [localQuote, setLocalQuote] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 当外部 quoteData 传入时，初始化本地可编辑数据
  useEffect(() => {
    if (quoteData) {
      setLocalQuote(JSON.parse(JSON.stringify(quoteData))); // 深拷贝，断开引用
    }
  }, [quoteData]);

  if (!isOpen || !inquiry) return null;

  const isAnalyzed = inquiry.status === 'completed' && localQuote;

  const tabs = [
    { id: 'plan_a', label: '方案 A (极致性价比)', icon: Target, color: 'emerald' },
    { id: 'plan_b', label: '方案 B (标准对标)', icon: Scale, color: 'blue' },
    { id: 'plan_c', label: '方案 C (高端品牌线)', icon: DollarSign, color: 'amber' }
  ] as const;

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 🌟 响应式数学引擎：处理 BOM 成本修改
  const handleBomChange = (index: number, newCostStr: string) => {
    if (!localQuote?.plans) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    
    plan.bom[index].cost = parseFloat(newCostStr) || 0;
    
    // 实时重算总成本与利润率
    const newTotalCost = plan.bom.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
    if (plan.final_price > 0) {
      plan.margin = (plan.final_price - newTotalCost) / plan.final_price;
    }
    setLocalQuote(updated);
  };

  // 🌟 响应式数学引擎：处理 FOB 最终报价修改
  const handleFobChange = (newFobStr: string) => {
    if (!localQuote?.plans) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    
    const newFob = parseFloat(newFobStr) || 0;
    plan.final_price = newFob;
    
    // 实时重算利润率
    const totalCost = plan.bom.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
    if (newFob > 0) {
      plan.margin = (newFob - totalCost) / newFob;
    } else {
      plan.margin = 0;
    }
    setLocalQuote(updated);
  };

  // 🌟 持久化：保存修改到云端
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // 假设 quote_data 存在 messages 表中最近的一条记录
      const { data: msgs } = await supabase.from('messages').select('id').eq('inquiry_id', inquiry.id).order('created_at', { ascending: false }).limit(1);
      if (msgs && msgs.length > 0) {
        await supabase.from('messages').update({ quote_data: localQuote }).eq('id', msgs[0].id);
      }
      alert('✅ 报价微调已成功同步至云端！导出 PDF 将使用最新数据。');
    } catch (error) {
      alert('保存失败，请检查网络。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-slate-50 shadow-2xl z-[70] flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* 顶部 Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">
            {inquiry.product_name || 'AI 核价详情'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if(window.confirm('确定要让 AI 重新全局核算此产品吗？您手动修改的数据将被覆盖。')) {
                onRetry ? onRetry() : alert('请在外部组件绑定 onRetry 事件');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 重新测算
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {!isAnalyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-sm">AI 极速核价进行中，请稍候...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            
            {/* 视觉锚点：商品情报看板 */}
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
                  {localQuote?.product_name || inquiry?.product_name || '未知商品'}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
                    <Tag className="w-3 h-3" /> 风格: 预判中 (Beta)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                    <TrendingUp className="w-3 h-3" /> 商业引擎已激活
                  </span>
                </div>

                <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 overflow-y-auto">
                  <strong className="text-slate-800">专家诊断：</strong> 
                  {localQuote?.analysis_reasoning || '未生成诊断结论。'}
                </div>
              </div>
            </div>

            {/* 防御历史单阶数据 */}
            {!localQuote?.plans ? (
              <div className="flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-slate-700 font-bold mb-1">发现历史格式数据</h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  这是一条早期生成的单阶报价记录，不支持编辑和三阶对比。请点击右上角“重新测算”升级引擎。
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                
                {/* 方案切换 Tab */}
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

                {/* 当前方案内容区 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                  {(() => {
                    const currentPlan = localQuote.plans[activeTab];
                    if (!currentPlan) return <div className="text-center text-slate-400 py-10">数据加载异常</div>;

                    const marginValue = currentPlan.margin || 0;
                    const finalPriceValue = currentPlan.final_price || 0;
                    const moqValue = currentPlan.moq || 500;
                    const cnyPriceValue = (finalPriceValue * exchangeRate).toFixed(2);

                    return (
                      <div className="space-y-6">
                        
                        {/* 财务核心指标 - 开放修改 */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* 🌟 修改点：FOB 输入框 */}
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 relative group transition-colors hover:border-emerald-300">
                            <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                              FOB 离岸价 (USD) <Edit3 className="w-3 h-3 opacity-50" />
                            </p>
                            <div className="flex items-center text-2xl font-black text-emerald-700">
                              $<input 
                                type="number"
                                value={finalPriceValue}
                                onChange={(e) => handleFobChange(e.target.value)}
                                className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400 rounded px-1 transition-all"
                              />
                            </div>
                            <p className="text-[10px] text-emerald-600/70 mt-1 font-mono absolute bottom-2 right-3">≈ ¥{cnyPriceValue}</p>
                          </div>

                          {/* MOQ 输入框 */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors">
                            <p className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                              建议起订量 (MOQ) <Edit3 className="w-3 h-3 opacity-50" />
                            </p>
                            <div className="flex items-baseline gap-1 text-2xl font-black text-slate-800">
                              <input 
                                type="number"
                                value={moqValue}
                                onChange={(e) => {
                                  const updated = {...localQuote};
                                  updated.plans[activeTab].moq = Number(e.target.value);
                                  setLocalQuote(updated);
                                }}
                                className="bg-transparent w-20 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 transition-all"
                              />
                              <span className="text-sm font-medium text-slate-500">pcs</span>
                            </div>
                          </div>

                          {/* 利润率 (受动量，仅展示) */}
                          <div className={`p-4 rounded-xl border transition-colors ${marginValue < 0.15 ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                            <p className={`text-xs font-bold mb-1 ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-600'}`}>
                              动态利润率 (Margin)
                            </p>
                            <p className={`text-2xl font-black ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-700'}`}>
                              {(marginValue * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* 汇率组件 */}
                        <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                           <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
                              <Calculator className="w-4 h-4 text-indigo-600" />
                              核算汇率 (USD/CNY): 
                              <input 
                                type="number" 
                                value={exchangeRate} 
                                onChange={(e) => setExchangeRate(Number(e.target.value))}
                                step="0.01"
                                className="w-16 text-center font-mono bg-white px-1 py-0.5 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                           </div>
                           <span className="text-xs text-indigo-500">实时测算人民币底价</span>
                        </div>

                        {/* BOM 明细 - 开放修改 */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-500" /> BOM 成本明细 (USD)</span>
                            <span className="text-xs text-slate-400 font-normal flex items-center gap-1"><Edit3 className="w-3 h-3" /> 点击单价即可修改</span>
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
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-4 py-2 text-slate-700 font-medium">
                                        {/* 允许修改品名 */}
                                        <input 
                                          type="text" 
                                          value={item.name || item.item}
                                          onChange={(e) => {
                                            const updated = {...localQuote};
                                            updated.plans[activeTab].bom[idx].name = e.target.value;
                                            setLocalQuote(updated);
                                          }}
                                          className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {/* 🌟 修改点：BOM 单价输入框 */}
                                        <div className="flex items-center justify-end font-mono font-bold text-slate-700">
                                          $
                                          <input 
                                            type="number"
                                            value={costValue}
                                            onChange={(e) => handleBomChange(idx, e.target.value)}
                                            className="bg-transparent w-16 text-right outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 transition-all group-hover:bg-slate-100 border border-transparent group-hover:border-slate-200"
                                          />
                                        </div>
                                      </td>
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
                        <div className="bg-slate-900 p-5 rounded-xl text-slate-300 relative group">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                              对厂谈判策略 (Factory Pitch)
                            </p>
                            <button 
                              onClick={() => handleCopyPitch(currentPlan.factory_pitch || '')}
                              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md text-slate-300 transition-colors"
                            >
                              {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {isCopied ? '已复制' : '一键复制'}
                            </button>
                          </div>
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
      
      {/* 底部操作栏 */}
      {isAnalyzed && localQuote?.plans && (
        <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-between gap-4">
          
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存手动修改
          </button>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> 导出 Excel
            </button>
            <button 
              onClick={() => alert('提示：确保点击了“保存手动修改”后，再在父组件调用 ExportPreviewModal 弹窗以导出最新数据。')}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> 预览客户 PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
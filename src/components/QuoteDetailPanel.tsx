'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  FileText, Download, Calculator, RefreshCw, Copy, CheckCheck, Edit3, Save, MessageCircle, Send
} from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
// 🌟 1. 重新引入导出弹窗组件
import ExportPreviewModal from './ExportPreviewModal';

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any; 
  quoteData: any; 
  onRetry?: (userNote: string) => void; 
}

export default function QuoteDetailPanel({ isOpen, onClose, inquiry, quoteData, onRetry }: QuoteDetailPanelProps) {
  const [localQuote, setLocalQuote] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(7.25);
  const [isCopiedClient, setIsCopiedClient] = useState(false);
  const [isCopiedFactory, setIsCopiedFactory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryNote, setRetryNote] = useState('');
  
  // 🌟 2. 新增导出弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (quoteData) {
      const cloned = JSON.parse(JSON.stringify(quoteData));
      setLocalQuote(cloned);
      if (cloned.plans) {
        const planKeys = Object.keys(cloned.plans);
        if (planKeys.length > 0 && !planKeys.includes(activeTab)) {
          setActiveTab(planKeys[0]); 
        }
      }
    }
  }, [quoteData]);

  if (!isOpen || !inquiry) return null;

  const isAnalyzed = inquiry.status === 'completed' && localQuote;
  const availablePlans = localQuote?.plans ? Object.keys(localQuote.plans) : [];

  const handleCopy = (text: string, type: 'client' | 'factory') => {
    navigator.clipboard.writeText(text);
    if (type === 'client') {
      setIsCopiedClient(true);
      setTimeout(() => setIsCopiedClient(false), 2000);
    } else {
      setIsCopiedFactory(true);
      setTimeout(() => setIsCopiedFactory(false), 2000);
    }
  };

  const handleFobChange = (newFobStr: string) => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    const newFob = parseFloat(newFobStr) || 0;
    plan.final_price = newFob;
    
    const totalCost = plan.bom?.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0) || 0;
    plan.margin = newFob > 0 ? (newFob - totalCost) / newFob : 0;
    setLocalQuote(updated);
  };

  const handleBomChange = (index: number, newCostStr: string) => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    plan.bom[index].cost = parseFloat(newCostStr) || 0;
    
    const newTotalCost = plan.bom.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
    if (plan.final_price > 0) {
      plan.margin = (plan.final_price - newTotalCost) / plan.final_price;
    }
    setLocalQuote(updated);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { data: msgs } = await supabase.from('messages').select('id').eq('inquiry_id', inquiry.id).order('created_at', { ascending: false }).limit(1);
      if (msgs && msgs.length > 0) {
        await supabase.from('messages').update({ quote_data: localQuote }).eq('id', msgs[0].id);
      }
      alert('✅ 报价微调已保存至云端。');
    } catch (error) {
      alert('保存失败，请检查网络。');
    } finally {
      setIsSaving(false);
    }
  };

  const executeRetry = () => {
    if (!retryNote.trim()) return alert('请输入修改要求');
    if (onRetry) {
      onRetry(retryNote);
      setShowRetryModal(false);
      setRetryNote('');
    }
  };

  // 🌟 3. 构建投影给 PDF 的单阶数据结构
  const getExportData = () => {
    if (!localQuote?.plans || !activeTab) return localQuote;
    const plan = localQuote.plans[activeTab];
    return {
      ...localQuote,
      product_name: `${localQuote.product_name} - ${plan.name || activeTab.toUpperCase()}`,
      bom: plan.bom,
      // 旧版 PDF 预期 margin 是绝对金额，这里将百分比转为绝对金额
      margin: (plan.margin * plan.final_price) || 0,
      final_price: plan.final_price,
      moq: plan.moq
    };
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-slate-50 shadow-2xl z-[70] flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* --- 顶部 Header --- */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">
            {inquiry.product_name || 'AI 核价工作台'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRetryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-colors border border-indigo-100"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 指令重算
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col relative">
        {!isAnalyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-sm">AI 极速核价进行中，请稍候...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            
            {/* 视觉锚点 & AI 全局诊断 */}
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
                    <Tag className="w-3 h-3" /> 商业引擎判断
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 overflow-y-auto leading-relaxed">
                  <strong className="text-slate-900">AI 全局分析：</strong> 
                  {localQuote?.analysis_reasoning || '未生成诊断结论。'}
                </div>
              </div>
            </div>

            {/* 动态方案矩阵 */}
            {!localQuote?.plans || availablePlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-slate-700 font-bold mb-1">无结构化方案数据</h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  这是一条早期格式数据，或 AI 未能生成结构化方案。请点击右上角“指令重算”重新生成。
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                
                {availablePlans.length > 1 && (
                  <div className="flex p-1 bg-slate-200/50 rounded-xl">
                    {availablePlans.map((key) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                          activeTab === key 
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                        }`}
                      >
                        {localQuote.plans[key].name || key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                  {(() => {
                    const currentPlan = localQuote.plans[activeTab];
                    if (!currentPlan) return null;

                    const marginValue = currentPlan.margin || 0;
                    const finalPriceValue = currentPlan.final_price || 0;
                    const cnyPriceValue = (finalPriceValue * exchangeRate).toFixed(2);

                    return (
                      <div className="space-y-6">
                        
                        {/* 核心财务 */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 relative group transition-colors hover:border-emerald-300">
                            <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center justify-between">
                              对外报价 (FOB USD) <Edit3 className="w-3 h-3 opacity-50" />
                            </p>
                            <div className="flex items-center text-2xl font-black text-emerald-700">
                              $<input type="number" value={finalPriceValue} onChange={(e) => handleFobChange(e.target.value)} className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400 rounded px-1 transition-all" />
                            </div>
                            <p className="text-[10px] text-emerald-600/70 mt-1 font-mono absolute bottom-2 right-3">≈ ¥{cnyPriceValue}</p>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors">
                            <p className="text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                              建议起订量 <Edit3 className="w-3 h-3 opacity-50" />
                            </p>
                            <div className="flex items-baseline gap-1 text-2xl font-black text-slate-800">
                              <input type="number" value={currentPlan.moq || 0} onChange={(e) => {
                                  const updated = {...localQuote};
                                  updated.plans[activeTab].moq = Number(e.target.value);
                                  setLocalQuote(updated);
                                }} className="bg-transparent w-20 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 transition-all" />
                              <span className="text-sm font-medium text-slate-500">pcs</span>
                            </div>
                          </div>

                          <div className={`p-4 rounded-xl border transition-colors ${marginValue < 0.15 ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                            <p className={`text-xs font-bold mb-1 ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-600'}`}>
                              预估毛利率 (Margin)
                            </p>
                            <p className={`text-2xl font-black ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-700'}`}>
                              {(marginValue * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* 汇率调节 */}
                        <div className="flex items-center justify-between px-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <Calculator className="w-3.5 h-3.5" /> 实时汇率 (USD/CNY):
                            <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} step="0.01" className="w-14 text-center font-mono bg-slate-100 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                        </div>

                        {/* 双轨话术系统 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> 对客营销话术 (英文)</span>
                              <button onClick={() => handleCopy(currentPlan.simplified_materials || '', 'client')} className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-1">
                                {isCopiedClient ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedClient ? '已复制' : '复制'}
                              </button>
                            </div>
                            <p className="text-sm text-blue-900/80 leading-relaxed whitespace-pre-wrap flex-1">
                              {currentPlan.simplified_materials || '暂无对外描述。'}
                            </p>
                          </div>

                          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> 对厂谈判指导 (内部)</span>
                              <button onClick={() => handleCopy(currentPlan.factory_pitch || '', 'factory')} className="text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1">
                                {isCopiedFactory ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} {isCopiedFactory ? '已复制' : '复制'}
                              </button>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                              {currentPlan.factory_pitch || '暂无工厂指导策略。'}
                            </p>
                          </div>
                        </div>

                        {/* BOM 明细 */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-500" /> BOM 成本表 (可编辑)</span>
                          </h3>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2 font-bold text-slate-600">物料/工艺明细</th>
                                  <th className="px-4 py-2 font-bold text-slate-600 text-right w-32">单价 (USD)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {currentPlan.bom && Array.isArray(currentPlan.bom) ? currentPlan.bom.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-4 py-2 text-slate-700 font-medium">
                                        <input type="text" value={item.name || item.item} onChange={(e) => {
                                            const updated = {...localQuote};
                                            updated.plans[activeTab].bom[idx].name = e.target.value;
                                            setLocalQuote(updated);
                                          }} className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1" />
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end font-mono font-bold text-slate-700">
                                          $<input type="number" value={item.cost || 0} onChange={(e) => handleBomChange(idx, e.target.value)} className="bg-transparent w-16 text-right outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 transition-all group-hover:bg-slate-100 border border-transparent group-hover:border-slate-200" />
                                        </div>
                                      </td>
                                    </tr>
                                  )) : (
                                  <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">暂无明细</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
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
        <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-between gap-4 relative z-10">
          <button onClick={handleSaveChanges} disabled={isSaving} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
          </button>
          <div className="flex items-center gap-3">
            {/* 🌟 4. 真正触发 ExportModal 的按钮 */}
            <button 
              onClick={() => setShowExportModal(true)} 
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> 生成客户 PDF
            </button>
          </div>
        </div>
      )}

      {/* --- 沉浸式重算弹窗 --- */}
      {showRetryModal && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-indigo-600" /> 指令重算</h3>
              <button onClick={() => setShowRetryModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 max-h-24 overflow-y-auto">
                <span className="font-bold text-slate-800 block mb-1">当前 AI 认知基准：</span>
                {localQuote?.analysis_reasoning || '无'}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">请输入修改指令</label>
                <textarea 
                  value={retryNote}
                  onChange={(e) => setRetryNote(e.target.value)}
                  placeholder="例如：客户预算有限，不要提供高端方案了，只要1个性价比方案；或者：把所有配件换成纯铜的重新算一下。" 
                  className="w-full h-28 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder:text-slate-400"
                />
              </div>
              <button onClick={executeRetry} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors">
                <Send className="w-4 h-4" /> 发送指令给 AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 5. 渲染 ExportPreviewModal (挂载在最外层) */}
      {showExportModal && (
        <ExportPreviewModal 
          isOpen={showExportModal} 
          onClose={() => setShowExportModal(false)} 
          quoteData={getExportData()} 
        />
      )}

    </div>
  );
}
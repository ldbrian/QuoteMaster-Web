'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  FileText, Download, Calculator, RefreshCw, Copy, CheckCheck, Edit3, Save, MessageCircle, Send, Crown
} from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
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
  
  // 🌟 导出与收费站状态
  const [showTollbooth, setShowTollbooth] = useState(false);
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

  const getExportData = () => {
    if (!localQuote?.plans || !activeTab) return localQuote;
    const plan = localQuote.plans[activeTab];
    return {
      ...localQuote,
      product_name: `${localQuote.product_name} - ${plan.name || activeTab.toUpperCase()}`,
      bom: plan.bom,
      margin: (plan.margin * plan.final_price) || 0,
      final_price: plan.final_price,
      moq: plan.moq
    };
  };

  // 🌟 核心突破：返回一个 Fragment (<>)，把 PDF 弹窗彻底移出 main_modal 的包裹！
  return (
    <>
      {/* 🚀 主工作台：从“侧边抽屉”升级为“居中 80vw 巨型弹窗” */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 p-4 lg:p-8`}>
        <div className={`bg-white w-full max-w-[90vw] xl:max-w-[85vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
          
          {/* --- 顶部全局 Header --- */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <BotMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">QuoteMaster / 核价控制台</h2>
                <p className="text-xs text-slate-500">{inquiry.product_name || 'AI 核算中'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowRetryModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> 指令重算
              </button>
              <div className="w-px h-6 bg-slate-200"></div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
            {!isAnalyzed ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-500 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-base font-medium">商业引擎深度演算中，正在匹配全球趋势与底层工艺...</p>
              </div>
            ) : (
              <>
                {/* 🚀 左侧栏：商业情报与视觉锚点 (固定宽度) */}
                <div className="w-full lg:w-[320px] xl:w-[380px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-6">
                  <div className="aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-white mb-5 shadow-sm">
                    {inquiry?.thumbnail_url ? (
                      <img src={inquiry.thumbnail_url} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">暂无询盘图片</div>
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-black text-slate-800 mb-3 leading-tight">
                    {localQuote?.product_name || inquiry?.product_name || '未知商品'}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                      <Tag className="w-3.5 h-3.5" /> 爆款雷达触发
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                      <TrendingUp className="w-3.5 h-3.5" /> 商业引擎激活
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                      <BotMessageSquare className="w-4 h-4 text-blue-600" /> AI 全局商业诊断
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {localQuote?.analysis_reasoning || '未生成诊断结论。'}
                    </p>
                  </div>
                </div>

                {/* 🚀 右侧栏：宽屏矩阵操作区 (占据剩余全部空间) */}
                <div className="flex-1 bg-white flex flex-col min-w-0">
                  
                  {/* 右侧内部主滚动区 */}
                  <div className="flex-1 overflow-y-auto p-6 xl:p-8">
                    {!localQuote?.plans || availablePlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 text-center h-full">
                        <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="text-lg text-slate-700 font-bold mb-2">无结构化方案数据</h4>
                        <p className="text-sm text-slate-500 max-w-md">
                          由于这是一条早期格式数据，无法启用宽屏操作台。请点击右上角“指令重算”以唤醒最新版引擎。
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-5xl mx-auto space-y-8">
                        
                        {/* 优雅的方案 Tabs */}
                        {availablePlans.length > 1 && (
                          <div className="flex p-1.5 bg-slate-100 rounded-xl max-w-2xl">
                            {availablePlans.map((key) => (
                              <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                                  activeTab === key 
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                              >
                                {localQuote.plans[key].name || key.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                        {(() => {
                          const currentPlan = localQuote.plans[activeTab];
                          if (!currentPlan) return null;

                          const marginValue = currentPlan.margin || 0;
                          const finalPriceValue = currentPlan.final_price || 0;
                          const cnyPriceValue = (finalPriceValue * exchangeRate).toFixed(2);

                          return (
                            <div className="space-y-8 animate-in fade-in duration-300">
                              
                              {/* 1. 大盘财务数据 (横向铺开) */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative group transition-colors hover:border-emerald-300 shadow-sm">
                                  <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center justify-between">
                                    对外报价 (FOB USD) <Edit3 className="w-4 h-4 opacity-50" />
                                  </p>
                                  <div className="flex items-center text-4xl font-black text-emerald-700">
                                    $<input type="number" value={finalPriceValue} onChange={(e) => handleFobChange(e.target.value)} className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400 rounded px-1 transition-all" />
                                  </div>
                                  <p className="text-xs text-emerald-600/80 mt-2 font-mono">参考成本 ≈ ¥{cnyPriceValue}</p>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 group hover:border-slate-300 transition-colors shadow-sm">
                                  <p className="text-sm font-bold text-slate-500 mb-2 flex items-center justify-between">
                                    建议起订量 (MOQ) <Edit3 className="w-4 h-4 opacity-50" />
                                  </p>
                                  <div className="flex items-baseline gap-2 text-4xl font-black text-slate-800">
                                    <input type="number" value={currentPlan.moq || 0} onChange={(e) => {
                                        const updated = {...localQuote};
                                        updated.plans[activeTab].moq = Number(e.target.value);
                                        setLocalQuote(updated);
                                      }} className="bg-transparent w-28 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-1 transition-all" />
                                    <span className="text-base font-medium text-slate-500">pcs</span>
                                  </div>
                                </div>

                                <div className={`p-6 rounded-2xl border transition-colors shadow-sm ${marginValue < 0.15 ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                                  <p className={`text-sm font-bold mb-2 ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-600'}`}>
                                    预估毛利率 (Margin)
                                  </p>
                                  <p className={`text-4xl font-black ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-700'}`}>
                                    {(marginValue * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>

                              {/* 汇率条 */}
                              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                                  <Calculator className="w-5 h-5 text-slate-400" />
                                  内部核算汇率 (USD/CNY):
                                  <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} step="0.01" className="w-20 text-center font-mono bg-white p-1 rounded border border-slate-300 outline-none focus:ring-2 focus:ring-blue-400" />
                                </div>
                              </div>

                              {/* 2. 宽屏双轨话术 (并排展示，极具压迫感) */}
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 flex flex-col shadow-sm">
                                  <div className="flex items-center justify-between mb-4 border-b border-blue-200/50 pb-3">
                                    <span className="text-sm font-bold text-blue-800 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> 对客营销提案 (英文)</span>
                                    <button onClick={() => handleCopy(currentPlan.simplified_materials || '', 'client')} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 bg-blue-100 px-3 py-1.5 rounded-lg">
                                      {isCopiedClient ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {isCopiedClient ? '已复制' : '一键复制'}
                                    </button>
                                  </div>
                                  <p className="text-sm text-blue-900/80 leading-relaxed whitespace-pre-wrap flex-1">
                                    {currentPlan.simplified_materials || '暂无对外描述。'}
                                  </p>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col shadow-lg">
                                  <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                                    <span className="text-sm font-bold text-amber-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 对厂压价策略 (中文内部)</span>
                                    <button onClick={() => handleCopy(currentPlan.factory_pitch || '', 'factory')} className="text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg">
                                      {isCopiedFactory ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />} {isCopiedFactory ? '已复制' : '一键复制'}
                                    </button>
                                  </div>
                                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                                    {currentPlan.factory_pitch || '暂无工厂指导策略。'}
                                  </p>
                                </div>
                              </div>

                              {/* 3. 宽屏 BOM 成本表 */}
                              <div>
                                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                                  <span className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500" /> 底层 BOM 结构 (USD)</span>
                                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full"><Edit3 className="w-3 h-3 inline mr-1" /> 点击单价即可修改</span>
                                </h3>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-sm">物料/工艺明细</th>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-sm text-right w-48">预估单价 (USD)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {currentPlan.bom && Array.isArray(currentPlan.bom) ? currentPlan.bom.map((item: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-3 text-slate-700 font-medium text-sm">
                                              <input type="text" value={item.name || item.item} onChange={(e) => {
                                                  const updated = {...localQuote};
                                                  updated.plans[activeTab].bom[idx].name = e.target.value;
                                                  setLocalQuote(updated);
                                                }} className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-2 py-1" />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                              <div className="flex items-center justify-end font-mono font-bold text-slate-700 text-base">
                                                $<input type="number" value={item.cost || 0} onChange={(e) => handleBomChange(idx, e.target.value)} className="bg-transparent w-24 text-right outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 rounded px-2 py-1 transition-all group-hover:bg-slate-100 border border-transparent group-hover:border-slate-300" />
                                              </div>
                                            </td>
                                          </tr>
                                        )) : (
                                        <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400">暂无明细</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* 右侧底部 Footer：固定在下方的全局操作栏 */}
                  {isAnalyzed && localQuote?.plans && (
                    <div className="border-t border-slate-200 bg-white p-5 shrink-0 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                      <button onClick={handleSaveChanges} disabled={isSaving} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存工作区
                      </button>
                      <div className="flex items-center gap-4">
                        <button className="px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2">
                          <Download className="w-4 h-4" /> 导出内控 Excel
                        </button>
                        {/* 🚀 触发 Tollbooth 收费站弹窗 */}
                        <button 
                          onClick={() => setShowTollbooth(true)} 
                          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                          <FileText className="w-5 h-5" /> 渲染客户 PDF
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- 沉浸式重算弹窗 --- */}
      {showRetryModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-indigo-600" /> 指令重算</h3>
              <button onClick={() => setShowRetryModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 max-h-32 overflow-y-auto leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">当前 AI 认知基准：</span>
                {localQuote?.analysis_reasoning || '无'}
              </div>
              <div>
                <label className="text-sm font-bold text-slate-800 mb-2 block">请输入修正指令</label>
                <textarea 
                  value={retryNote}
                  onChange={(e) => setRetryNote(e.target.value)}
                  placeholder="例如：客户预算有限，不要提供高端方案了，只要1个性价比方案；或者：把所有配件换成纯铜的重新算一下。" 
                  className="w-full h-32 p-4 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder:text-slate-400"
                />
              </div>
              <button onClick={executeRetry} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md">
                <Send className="w-4 h-4" /> 确认发送指令
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 预埋收费站：Tollbooth 拦截弹窗 */}
      {showTollbooth && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center space-y-5 relative">
              <button onClick={() => setShowTollbooth(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-sm">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">生成无痕脱敏 PDF</h3>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                  即将启动数据防火墙，隐藏所有底层 BOM 成本与利润率，为您生成带有专业防伪水印的高清出海报价单。
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-sm shadow-inner">
                <span className="text-slate-600 font-bold">本次消耗算力：</span>
                <span className="font-black text-blue-600 flex items-center gap-1.5"><Crown className="w-4 h-4" /> 1 次</span>
              </div>

              <div className="pt-2 space-y-3">
                <button 
                  onClick={() => { 
                    setShowTollbooth(false); 
                    setShowExportModal(true); 
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all text-base"
                >
                  确认扣除并生成
                </button>
                <button className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all border border-slate-200">
                  了解 Pro 无限版特权
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 PDF 导出器：它现在以独立 Fragment 存在，彻底挣脱了 CSS 限制！ */}
      {showExportModal && (
        <ExportPreviewModal 
          isOpen={showExportModal} 
          onClose={() => setShowExportModal(false)} 
          quoteData={getExportData()} 
        />
      )}
    </>
  );
}
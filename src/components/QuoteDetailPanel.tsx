'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  FileText, Calculator, RefreshCw, Copy, CheckCheck, Edit3, Save, MessageCircle, Send, Crown,
  Lock, AlertTriangle, ShieldCheck, Clock, ShieldAlert, ChevronDown, ChevronUp
} from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
import ExportPreviewModal from './ExportPreviewModal';
import { trackEvent } from '@/src/utils/analytics'; 

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any; 
  quoteData: any; 
  onRetry?: (userNote: string) => void; 
  isPro?: boolean; 
}

export default function QuoteDetailPanel({ isOpen, onClose, inquiry, quoteData, onRetry, isPro = false }: QuoteDetailPanelProps) {
  const [localQuote, setLocalQuote] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // 🌟 老鸟报价参数区 & 基础状态
  const [exchangeRate, setExchangeRate] = useState<number>(6.0); 
  const [moq, setMoq] = useState<number>(500); 
  const [markup, setMarkup] = useState<number>(1.13); 
  const [styleNo, setStyleNo] = useState<string>(''); 

  // 🌟 智能折叠状态
  const [isWarningsOpen, setIsWarningsOpen] = useState(false);
  const [isBomOpen, setIsBomOpen] = useState(false);

  const [isCopiedClient, setIsCopiedClient] = useState(false);
  const [isCopiedFactory, setIsCopiedFactory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryNote, setRetryNote] = useState('');
  const [showTollbooth, setShowTollbooth] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProPaywall, setShowProPaywall] = useState(false);

  // 🛡️ 终极防呆装甲
  const getSafeCost = (plan: any) => {
    if (!plan) return 0;
    if (plan.cost_range && Array.isArray(plan.cost_range) && plan.cost_range.length === 2) {
      return Number(plan.cost_range[1]) || 0;
    }
    if (plan.bom && Array.isArray(plan.bom)) {
      return plan.bom.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
    }
    return 0;
  };

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

  // 老鸟公式联动引擎
  useEffect(() => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans?.[activeTab];
    if (!plan) return; 
    
    const safeCost = getSafeCost(plan);
    const totalSafeCost = safeCost + (2 / exchangeRate); 
    const newFob = totalSafeCost * markup;
    
    plan.final_price = newFob;
    plan.margin = newFob > 0 ? (newFob - totalSafeCost) / newFob : 0;
    setLocalQuote(updated);
  }, [markup, exchangeRate, activeTab]); 

  if (!isOpen || !inquiry) return null;

  const isAnalyzed = inquiry.status === 'completed' && localQuote;
  const availablePlans = localQuote?.plans ? Object.keys(localQuote.plans) : [];

  const handleCopy = (text: string, type: 'client' | 'factory') => {
    if (!isPro && type === 'factory') {
      setShowProPaywall(true);
      return;
    }
    navigator.clipboard.writeText(text);
    trackEvent('copy_pitch_text', { pitch_type: type }, inquiry?.user_id);
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
    const plan = updated.plans?.[activeTab];
    if (!plan) return;

    const newFob = parseFloat(newFobStr) || 0;
    plan.final_price = newFob;
    
    const safeCost = getSafeCost(plan);
    const totalSafeCost = safeCost + (2 / exchangeRate);
    plan.margin = newFob > 0 ? (newFob - totalSafeCost) / newFob : 0;
    setLocalQuote(updated);
  };

  const handleMarginSliderChange = (marginPercent: number) => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans?.[activeTab];
    if (!plan) return;
    
    const safeCost = getSafeCost(plan);
    const totalSafeCost = safeCost + (2 / exchangeRate);
    const newFob = totalSafeCost / (1 - (marginPercent / 100));
    
    plan.final_price = newFob;
    plan.margin = marginPercent / 100;
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
    setShowRetryModal(false); 
    setShowTollbooth(true);   
  };

  const confirmRetry = () => {
    trackEvent('execute_ai_refine', { note_length: retryNote.length }, inquiry?.user_id);
    if (onRetry) onRetry(retryNote);
    setShowTollbooth(false);
    setRetryNote('');
  };

  const getExportData = () => {
    if (!localQuote?.plans || !activeTab) return localQuote;
    const plan = localQuote.plans?.[activeTab];
    return {
      ...localQuote,
      product_name: `${localQuote.product_name} - ${plan?.name || activeTab.toUpperCase()}`,
      style_no: styleNo, 
      bom: plan?.bom || [],
      margin: (plan?.margin * plan?.final_price) || 0,
      final_price: plan?.final_price || 0,
      moq: moq 
    };
  };

  return (
    <>
      <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 p-2 md:p-4 lg:p-8`}>
        <div className={`bg-slate-50 w-full max-w-[95vw] xl:max-w-[85vw] h-[98vh] md:h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
          
          <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
                <BotMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h2 className="font-black text-slate-800 text-base leading-tight tracking-tight">QuoteMaster 战斧终端</h2>
              </div>
            </div>
            
            <div className="flex-1 max-w-md mx-4"> 
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 transition-all h-9">
                <span className="px-3 text-slate-500 text-xs font-bold bg-slate-100 border-r border-slate-200 h-full flex items-center whitespace-nowrap shrink-0">
                  款号 Style No.
                </span>
                <input type="text" value={styleNo} onChange={(e) => setStyleNo(e.target.value)} placeholder="选填，将印在 PDF 上" className="w-full px-3 py-1 text-sm text-slate-800 bg-transparent outline-none placeholder:text-slate-300" />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button onClick={() => setShowRetryModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
                <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">修正指令</span>
              </button>
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative bg-slate-100/50">
            {!isAnalyzed ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-500 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
                <p className="text-base font-medium">商业引擎深度演算中，正在匹配全球趋势与底层工艺...</p>
              </div>
            ) : (
              <>
                {/* 左侧栏：上下文与控制台 */}
                <div className="w-full lg:w-[300px] xl:w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-5 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                  <div className="aspect-square w-full rounded-xl overflow-hidden border border-slate-100 bg-slate-50 mb-4 shadow-inner relative group">
                    {inquiry?.thumbnail_url ? (
                      <img src={inquiry.thumbnail_url} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">暂无询盘图片</div>
                    )}
                  </div>
                  
                  <h1 className="text-lg font-black text-slate-800 mb-2 leading-tight line-clamp-2">
                    {localQuote?.product_name || inquiry?.product_name || '未知商品'}
                  </h1>
                  
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 pb-4 border-b border-slate-100 line-clamp-3" title={localQuote?.analysis_reasoning}>
                    <BotMessageSquare className="w-3 h-3 inline-block mr-1 text-slate-400" />
                    {localQuote?.analysis_reasoning || '未生成诊断结论。'}
                  </p>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-2 uppercase">
                      <Calculator className="w-4 h-4 text-indigo-500" /> 核算参数引擎
                    </p>
                    
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">安全核算汇率 (真实约7.2)</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <input type="number" step="0.1" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-transparent outline-none" />
                        <span className="px-3 text-slate-400 text-xs font-bold bg-slate-100 border-l border-slate-200">¥/$</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">MOQ (起订量估算)</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <input type="number" value={moq} onChange={(e) => setMoq(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-transparent outline-none" />
                        <span className="px-3 text-slate-400 text-xs font-bold bg-slate-100 border-l border-slate-200">PCS</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">退税/基础加成 (%)</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <input type="number" step="1" value={((markup - 1) * 100).toFixed(0)} onChange={(e) => setMarkup(1 + Number(e.target.value)/100)} className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-transparent outline-none" />
                        <span className="px-3 text-slate-400 text-xs font-bold bg-slate-100 border-l border-slate-200">%</span>
                      </div>
                    </div>

                    {(() => {
                      const currentPlan = localQuote?.plans?.[activeTab];
                      if (!currentPlan) return null;
                      
                      const safeCost = getSafeCost(currentPlan);
                      const totalSafeCost = safeCost + (2 / exchangeRate);
                      const finalPriceValue = currentPlan.final_price || (totalSafeCost * markup); 
                      const marginValue = currentPlan.margin !== undefined ? currentPlan.margin : ((finalPriceValue - totalSafeCost) / finalPriceValue);

                      return (
                        <div className="pt-4 border-t border-slate-100 mt-2">
                           <p className="text-[11px] font-bold text-slate-500 mb-2 flex justify-between">
                             <span>利润率调控 (Margin)</span>
                             <span className={`font-black ${marginValue < 0.15 ? 'text-rose-600' : 'text-emerald-600'}`}>{(marginValue * 100).toFixed(0)}%</span>
                           </p>
                           <input type="range" min="5" max="60" step="1" value={(marginValue * 100).toFixed(0)} onChange={(e) => handleMarginSliderChange(Number(e.target.value))} className="w-full accent-slate-800 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 右侧流：对客结果与智能折叠区 */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                    
                    {!localQuote?.plans || availablePlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center h-full shadow-sm">
                        <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="text-lg text-slate-700 font-bold mb-2">无结构化方案数据</h4>
                        <p className="text-sm text-slate-500 max-w-md">历史脏数据或 AI 发生幻觉导致缺失关键字段。<br/>请点击左上角“修正指令”，随便发一句话唤醒最新版引擎重算即可恢复。</p>
                      </div>
                    ) : (
                      <>
                        {availablePlans.length > 1 && (
                          // 🌟 加了 pr-24 给右侧的解锁按钮留出空间
                          <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-200 inline-flex relative pr-24">
                            {availablePlans.map((key) => (
                              <button
                                key={key}
                                // 🌟 如果是免费用户且点击了 plan_b，拦截并弹出付费框；否则正常切换
                                onClick={() => {
                                  if (!isPro && key === 'plan_b') {
                                    setShowProPaywall(true);
                                  } else {
                                    setActiveTab(key);
                                  }
                                }}
                                className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                  activeTab === key ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                } ${!isPro && key === 'plan_b' ? 'opacity-60' : ''}`}
                              >
                                {localQuote.plans[key]?.name || key.toUpperCase()}
                                {!isPro && key === 'plan_b' && <Lock className="w-3 h-3 ml-1" />}
                              </button>
                            ))}
                            
                            {/* 🌟 真正的解锁按钮：点击唤起 Paywall */}
                            {!isPro && availablePlans.includes('plan_b') && (
                              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                <button 
                                  onClick={() => setShowProPaywall(true)}
                                  className="flex items-center gap-1 text-[10px] font-black bg-gradient-to-r from-amber-300 to-amber-500 text-amber-950 px-3 py-1.5 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all animate-pulse cursor-pointer"
                                >
                                  <Lock className="w-3 h-3" /> 解锁方案B
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {(() => {
                          const currentPlan = localQuote?.plans?.[activeTab];
                          if (!currentPlan) return null;

                          const costRange = currentPlan.cost_range || [];
                          const hasRange = Array.isArray(costRange) && costRange.length === 2;
                          const safeCost = getSafeCost(currentPlan);
                          const totalSafeCost = safeCost + (2 / exchangeRate);
                          const finalPriceValue = currentPlan.final_price || (totalSafeCost * markup); 
                          const realCnyValue = (finalPriceValue * 7.2).toFixed(2);

                          return (
                            <div className="space-y-6 w-full animate-in slide-in-from-bottom-2 duration-300">
                              
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                    {localQuote?.confidence_level && (
                                      <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black text-white rounded-bl-lg shadow-sm
                                        ${localQuote.confidence_level === '高' ? 'bg-emerald-500' : localQuote.confidence_level === '中' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                        系统置信度: {localQuote.confidence_level}
                                      </div>
                                    )}
                                    <p className="text-xs font-bold text-slate-400 mb-1">AI 预估底价区间 (USD)</p>
                                    <div className="flex items-baseline gap-2 text-3xl font-black text-slate-800">
                                      {hasRange ? `$${costRange[0].toFixed(2)} - ${costRange[1].toFixed(2)}` : `$${safeCost.toFixed(2)}`}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                      {localQuote?.disclaimer || '基于行业基准估算，实际请与工厂确认'}
                                    </p>
                                </div>

                                <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative group">
                                    <p className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                                      自定义对客报价 (FOB) <Edit3 className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity text-white" />
                                    </p>
                                    <div className="flex items-center text-4xl font-black text-emerald-400">
                                      $<input type="number" value={finalPriceValue.toFixed(2)} onChange={(e) => handleFobChange(e.target.value)} className="bg-transparent w-full outline-none focus:ring-2 focus:ring-emerald-500 rounded px-1 transition-all text-white" />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 font-mono">核算人民币收益 ≈ <span className="text-white font-bold">¥{realCnyValue}</span></p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                  <p className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-500" /> 交期估算 (ETA)</p>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">打样 Sample</p>
                                      <p className="text-sm font-black text-slate-800">{localQuote?.eta_forecast?.sample_time || '5-7 Days'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">大货 Production</p>
                                      <p className="text-sm font-black text-slate-800">{localQuote?.eta_forecast?.production_time || '15-25 Days'}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="md:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-100 relative group flex flex-col">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-black text-blue-800 flex items-center gap-1.5 uppercase tracking-wide">
                                      <MessageCircle className="w-4 h-4"/> WhatsApp 应急稳单快语
                                    </p>
                                    <button onClick={() => handleCopy(localQuote?.whatsapp_script || '', 'client')} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-white text-blue-600 border border-blue-200 rounded shadow-sm hover:bg-blue-600 hover:text-white transition-colors">
                                      {isCopiedClient ? <><CheckCheck className="w-3 h-3" /> 已复制</> : <><Copy className="w-3 h-3" /> 复制发送</>}
                                    </button>
                                  </div>
                                  <div className="flex-1 bg-white rounded-xl border border-blue-50 p-4 shadow-sm">
                                    <p className="text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap selection:bg-blue-200">
                                      {localQuote?.whatsapp_script || 'Waiting for AI generation...'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                                <button 
                                  onClick={() => setIsWarningsOpen(!isWarningsOpen)}
                                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <ShieldAlert className={`w-5 h-5 ${isWarningsOpen ? 'text-amber-600' : 'text-slate-400'}`} />
                                    <span className={`font-bold text-sm ${isWarningsOpen ? 'text-slate-800' : 'text-slate-600'}`}>打样防翻车工艺预警 (发给工厂)</span>
                                    {!isWarningsOpen && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">⚠️ 存在风险</span>}
                                  </div>
                                  {isWarningsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </button>
                                
                                {isWarningsOpen && (
                                  <div className="p-6 border-t border-slate-100 bg-amber-50/30 relative animate-in slide-in-from-top-2 duration-200">
                                    <p className="text-sm text-amber-900/80 leading-relaxed whitespace-pre-wrap pr-12">
                                      {localQuote?.factory_warnings || '未检测到明显工艺风险。'}
                                    </p>
                                    <button onClick={() => handleCopy(localQuote?.factory_warnings || '', 'factory')} className="absolute top-6 right-6 p-2 bg-white rounded-md shadow-sm border border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors">
                                      {isCopiedFactory ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 relative ${!isPro ? 'pb-16' : ''}`}>
                                <button 
                                  onClick={() => setIsBomOpen(!isBomOpen)}
                                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <BarChart3 className={`w-5 h-5 ${isBomOpen ? 'text-slate-800' : 'text-slate-400'}`} />
                                    <span className={`font-bold text-sm ${isBomOpen ? 'text-slate-800' : 'text-slate-600'}`}>底层 BOM 拆解与护城河成本 (自己看)</span>
                                  </div>
                                  {isBomOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </button>
                                
                                {isBomOpen && (
                                  <div className={`border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 ${!isPro ? 'filter blur-[4px] grayscale opacity-50 select-none pointer-events-none' : ''}`}>
                                    <table className="w-full text-left">
                                      <thead className="bg-white border-b border-slate-100">
                                        <tr>
                                          <th className="px-6 py-3 font-bold text-slate-400 text-xs uppercase tracking-wider">物料/工艺明细 (USD)</th>
                                          <th className="px-6 py-3 font-bold text-slate-400 text-xs uppercase tracking-wider text-right w-32">成本</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {currentPlan.bom && Array.isArray(currentPlan.bom) ? currentPlan.bom.map((item: any, idx: number) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                              <td className="px-6 py-3 text-slate-700 font-medium text-sm">{item.name || item.item}</td>
                                              <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">${item.cost || 0}</td>
                                            </tr>
                                          )) : (
                                          <tr><td colSpan={2} className="px-6 py-6 text-center text-slate-400 text-sm">暂无明细</td></tr>
                                        )}
                                        <tr className="bg-slate-50/50">
                                          <td className="px-6 py-3 text-slate-500 font-medium text-xs flex items-center gap-1.5"><Tag className="w-3 h-3"/> 包装及辅料费 (系统硬算)</td>
                                          <td className="px-6 py-3 text-right font-mono font-bold text-slate-500">${(1 / exchangeRate).toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-slate-50/50">
                                          <td className="px-6 py-3 text-slate-500 font-medium text-xs flex items-center gap-1.5"><TrendingUp className="w-3 h-3"/> 国内内陆运费 (系统硬算)</td>
                                          <td className="px-6 py-3 text-right font-mono font-bold text-slate-500">${(1 / exchangeRate).toFixed(2)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {!isPro && isBomOpen && (
                                  <div className="absolute inset-0 top-[60px] z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                                    <div className="bg-white px-6 py-5 rounded-2xl shadow-xl flex flex-col items-center border border-slate-200">
                                      <ShieldCheck className="w-8 h-8 text-slate-900 mb-2" />
                                      <p className="text-xs font-bold text-slate-800 mb-3">升级 Pro 解锁精确成本拆解</p>
                                      <button onClick={() => setShowProPaywall(true)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800 shadow-md">
                                        立即解锁
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="h-20"></div>

                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {localQuote?.plans && availablePlans.length > 0 && (
                    <div className="border-t border-slate-200 bg-white/80 backdrop-blur-md p-4 shrink-0 flex items-center justify-between gap-4 z-20 sticky bottom-0">
                      <button onClick={handleSaveChanges} disabled={isSaving} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} <span className="hidden sm:inline">保存</span>
                      </button>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            if (!isPro) {
                              setShowProPaywall(true);
                            } else {
                              trackEvent('export_pdf', { plan_type: activeTab }, inquiry?.user_id);
                              setShowExportModal(true);
                            }
                          }} 
                          className="px-6 sm:px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> 生成对客 PDF
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

      {showProPaywall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-[800px] w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 relative">
            <button onClick={() => setShowProPaywall(false)} className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-white rounded-full text-slate-400 hover:text-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="bg-slate-900 text-white p-8 md:w-5/12 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
              <Crown className="w-12 h-12 text-amber-400 mb-6 relative z-10" />
              <h2 className="text-2xl font-black mb-4 leading-tight relative z-10">开通 Pro 权限<br/>掌控极致底牌</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                解锁真正的底层 BOM 拆解与多阶梯方案，把谈判主动权拿回自己手里。
              </p>
              <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /><p className="text-sm"><strong className="text-white block">X光级 BOM 拆解</strong>告别瞎猜成本</p></div>
                <div className="flex items-start gap-3"><FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /><p className="text-sm"><strong className="text-white block">一键渲染专业 PDF</strong>不再自己排版</p></div>
              </div>
            </div>
            <div className="p-8 md:w-7/12 bg-white flex flex-col justify-center text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-2">选择您的赚钱装备</h3>
              <p className="text-sm text-slate-500 mb-6">少报错一次价，不仅是省钱，更是赢单。</p>
              <div className="border-2 border-slate-900 bg-slate-50 rounded-2xl p-5 relative shadow-md mx-auto w-full max-w-xs mb-6">
                <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg rounded-tr-xl">抢单首选</div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-black text-slate-800 text-lg">Pro 专业版 <span className="text-xs font-normal text-slate-500 ml-1">/ 季度</span></h4>
                  <span className="text-2xl font-black text-slate-900">¥999</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 mb-2">👇 扫码添加开发者微信开通</p>
                <div className="w-24 h-24 bg-white border border-slate-200 mx-auto rounded-lg shadow-sm p-1 mb-2"><img src="/pay-qr.png" alt="WeChat QR" className="w-full h-full object-contain" /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRetryModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-indigo-600" /> 修正指令</h3>
              <button onClick={() => setShowRetryModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 max-h-24 overflow-y-auto leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">当前上下文：</span>{localQuote?.analysis_reasoning || '无'}
              </div>
              <textarea value={retryNote} onChange={(e) => setRetryNote(e.target.value)} placeholder="例如：去掉拉链重新核算..." className="w-full h-32 p-4 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
              <button onClick={executeRetry} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors">
                <Send className="w-4 h-4" /> 确认指令
              </button>
            </div>
          </div>
        </div>
      )}

      {showTollbooth && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 p-8 text-center relative">
            <button onClick={() => setShowTollbooth(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><RefreshCw className="w-8 h-8 text-slate-800" /></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">启动重新演算</h3>
            <p className="text-sm text-slate-500 mb-6">系统将消耗 1 次算力，根据您的新指令重新演算并生成方案。</p>
            <div className="space-y-3">
              <button onClick={confirmRetry} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">确认重算</button>
              <button onClick={() => setShowTollbooth(false)} className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200">取消</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportPreviewModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} quoteData={getExportData()} />
      )}
    </>
  );
}
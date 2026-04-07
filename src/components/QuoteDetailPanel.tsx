'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BotMessageSquare, Loader2, BarChart3, TrendingUp, Tag, 
  FileText, Download, Calculator, RefreshCw, Copy, CheckCheck, Edit3, Save, MessageCircle, Send, Crown,
  Lock, AlertTriangle, Zap, ShieldCheck, Clock, ShieldAlert // 🌟 新增了 Clock 和 ShieldAlert 图标
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
  
  // 🌟 老鸟报价参数区：防守型汇率、起订量、加成比例
  const [exchangeRate, setExchangeRate] = useState<number>(6.0); // 默认 6.0 藏利润
  const [moq, setMoq] = useState<number>(500); // 顺应小单快反，默认 500
  const [markup, setMarkup] = useState<number>(1.13); // 默认 13% 利润/退税加成

  const [isCopiedClient, setIsCopiedClient] = useState(false);
  const [isCopiedFactory, setIsCopiedFactory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryNote, setRetryNote] = useState('');
  
  const [showTollbooth, setShowTollbooth] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [showProPaywall, setShowProPaywall] = useState(false);

  // 初始化数据
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

  // 老鸟公式联动引擎 (监听参数变化自动重算)
  useEffect(() => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    
    const costRange = plan.cost_range || [];
    const safeCost = costRange.length === 2 ? costRange[1] : (plan.bom?.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0) || 0);
    
    // 💡 老鸟护城河公式：总成本 = 纯成本 + (包装费1元/设定汇率) + (运费1元/设定汇率)
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
    const plan = updated.plans[activeTab];
    const newFob = parseFloat(newFobStr) || 0;
    plan.final_price = newFob;
    
    const safeCost = (plan.cost_range && plan.cost_range.length === 2) 
      ? plan.cost_range[1] 
      : (plan.bom?.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0) || 0);
      
    const totalSafeCost = safeCost + (2 / exchangeRate);
    plan.margin = newFob > 0 ? (newFob - totalSafeCost) / newFob : 0;
    setLocalQuote(updated);
  };

  const handleMarginSliderChange = (marginPercent: number) => {
    if (!localQuote?.plans || !activeTab) return;
    const updated = { ...localQuote };
    const plan = updated.plans[activeTab];
    
    const safeCost = (plan.cost_range && plan.cost_range.length === 2) 
      ? plan.cost_range[1] 
      : (plan.bom?.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0) || 0);
      
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
    const plan = localQuote.plans[activeTab];
    return {
      ...localQuote,
      product_name: `${localQuote.product_name} - ${plan.name || activeTab.toUpperCase()}`,
      bom: plan.bom,
      margin: (plan.margin * plan.final_price) || 0,
      final_price: plan.final_price,
      moq: moq 
    };
  };

  return (
    <>
      <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 p-4 lg:p-8`}>
        <div className={`bg-white w-full max-w-[90vw] xl:max-w-[85vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
          
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
                <BotMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">QuoteMaster / 极速核价终端</h2>
                <p className="text-xs text-slate-500">{inquiry.product_name || 'AI 深度演算中'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowRetryModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> 修正指令
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
                <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
                <p className="text-base font-medium">商业引擎深度演算中，正在匹配全球趋势与底层工艺...</p>
              </div>
            ) : (
              <>
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
                  
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-4">
                    <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                      <BotMessageSquare className="w-4 h-4 text-slate-800" /> AI 全局商业诊断
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {localQuote?.analysis_reasoning || '未生成诊断结论。'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-white flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto p-6 xl:p-8">
                    {!localQuote?.plans || availablePlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 text-center h-full">
                        <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="text-lg text-slate-700 font-bold mb-2">无结构化方案数据</h4>
                        <p className="text-sm text-slate-500 max-w-md">数据格式不兼容，请点击左上角“修正指令”以唤醒最新版引擎。</p>
                      </div>
                    ) : (
                      <div className="max-w-5xl mx-auto space-y-8">
                        {availablePlans.length > 1 && (
                          <div className="flex p-1.5 bg-slate-100 rounded-xl max-w-2xl relative">
                            {availablePlans.map((key) => (
                              <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                                  activeTab === key 
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                              >
                                {localQuote.plans[key].name || key.toUpperCase()}
                              </button>
                            ))}
                            {!isPro && availablePlans.includes('plan_b') && activeTab !== 'plan_b' && (
                              <div className="absolute right-4 top-0 bottom-0 flex items-center pointer-events-none">
                                <span className="flex items-center gap-1 text-[10px] font-black bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                  <Lock className="w-3 h-3" /> 解锁跑量方案
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {(() => {
                          const currentPlan = localQuote.plans[activeTab];
                          if (!currentPlan) return null;

                          const costRange = currentPlan.cost_range || [];
                          const hasRange = costRange.length === 2;
                          const safeCost = hasRange ? costRange[1] : (currentPlan.bom?.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0) || 0);
                          
                          const totalSafeCost = safeCost + (2 / exchangeRate);
                          const finalPriceValue = currentPlan.final_price || (totalSafeCost * markup); 
                          const marginValue = currentPlan.margin !== undefined ? currentPlan.margin : ((finalPriceValue - totalSafeCost) / finalPriceValue);
                          
                          const realCnyValue = (finalPriceValue * 7.2).toFixed(2);

                          return (
                            <div className="space-y-8 animate-in fade-in duration-300">
                              
                              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                                <p className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Calculator className="w-4 h-4 text-slate-500" /> 商业核算参数 (构建利润护城河)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">MOQ (起订量)</label>
                                    <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-800 transition-all">
                                      <input type="number" value={moq} onChange={(e) => setMoq(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                                      <span className="px-3 text-slate-400 text-xs font-medium bg-slate-50 border-l border-slate-200">件</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">安全核算汇率 <span className="font-normal text-slate-400 text-[10px]">(真实约7.2)</span></label>
                                    <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-800 transition-all">
                                      <input type="number" step="0.1" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                                      <span className="px-3 text-slate-400 text-xs font-medium bg-slate-50 border-l border-slate-200">¥/$</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">退税/基础加成</label>
                                    <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-800 transition-all">
                                      <input type="number" step="1" value={((markup - 1) * 100).toFixed(0)} onChange={(e) => setMarkup(1 + Number(e.target.value)/100)} className="w-full px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                                      <span className="px-3 text-slate-400 text-xs font-medium bg-slate-50 border-l border-slate-200">%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 🌟 核心主菜：带置信度护栏的价格底盘 */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                  {localQuote?.confidence_level && (
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black text-white rounded-bl-lg 
                                      ${localQuote.confidence_level === '高' ? 'bg-emerald-500' : localQuote.confidence_level === '中' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                      置信度: {localQuote.confidence_level}
                                    </div>
                                  )}
                                  <p className="text-sm font-bold text-slate-500 mb-2">AI 底线成本区间 (USD)</p>
                                  <div className="flex items-baseline gap-2 text-3xl font-black text-slate-800">
                                    {hasRange ? `$${costRange[0].toFixed(2)} - ${costRange[1].toFixed(2)}` : `$${safeCost.toFixed(2)}`}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                    {localQuote?.disclaimer || '基于行业基准估算，实际请与工厂确认'}
                                  </p>
                                </div>

                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-md group">
                                  <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center justify-between">
                                    自定义对客报价 (FOB) <Edit3 className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                  </p>
                                  <div className="flex items-center text-4xl font-black text-emerald-700">
                                    $<input type="number" value={finalPriceValue.toFixed(2)} onChange={(e) => handleFobChange(e.target.value)} className="bg-transparent w-full outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400 rounded px-1 transition-all" />
                                  </div>
                                  <p className="text-xs text-emerald-600/80 mt-2 font-mono">核算 ≈ ¥{realCnyValue}</p>
                                </div>

                                <div className={`p-6 rounded-2xl border shadow-sm ${marginValue < 0.15 ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
                                  <p className={`text-sm font-bold mb-3 ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-700'}`}>
                                    利润率调控 (Margin)
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="range" 
                                      min="5" max="60" step="1" 
                                      value={(marginValue * 100).toFixed(0)} 
                                      onChange={(e) => handleMarginSliderChange(Number(e.target.value))}
                                      className="w-full accent-blue-600"
                                    />
                                    <span className={`text-2xl font-black ${marginValue < 0.15 ? 'text-rose-600' : 'text-blue-700'}`}>
                                      {(marginValue * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 🌟 决胜配菜区：打样预警、智能交期、散装口语 */}
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                                {/* 左侧：稳客双杀 (交期 + 快语) */}
                                <div className="space-y-4">
                                  {/* ETA 预测 */}
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                      <Clock className="w-4 h-4 text-indigo-500" /> AI 智能交期预测 (ETA)
                                    </div>
                                    <div className="text-right text-xs">
                                      <p className="mb-1"><span className="text-slate-400">打样:</span> <span className="font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded">{localQuote?.eta_forecast?.sample_time || '5-7 Days'}</span></p>
                                      <p><span className="text-slate-400">大货:</span> <span className="font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded">{localQuote?.eta_forecast?.production_time || '15-25 Days'}</span></p>
                                    </div>
                                  </div>
                                  
                                  {/* 散装 WhatsApp 快语 */}
                                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative group">
                                    <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                      <MessageCircle className="w-4 h-4"/> WhatsApp 应急稳单快语
                                    </p>
                                    <p className="text-sm text-slate-600 font-mono leading-relaxed pr-8 whitespace-pre-wrap">
                                      {localQuote?.whatsapp_script || 'Waiting for AI generation...'}
                                    </p>
                                    <button 
                                      onClick={() => handleCopy(localQuote?.whatsapp_script || '', 'client')} 
                                      className="absolute top-4 right-4 p-2 bg-white rounded-md shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition-colors border border-blue-100"
                                    >
                                      {isCopiedClient ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>

                                {/* 右侧：避坑指南 (工厂沟通) */}
                                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col relative group">
                                  <p className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-amber-600"/> 打样防翻车工艺预警
                                  </p>
                                  <p className="text-sm text-amber-900/80 leading-relaxed flex-1 whitespace-pre-wrap">
                                    {localQuote?.factory_warnings || 'AI 未检测到明显工艺风险。但请提醒工厂注意常规走线与面料缩水率。'}
                                  </p>
                                  <button 
                                    onClick={() => handleCopy(localQuote?.factory_warnings || '', 'factory')} 
                                    className="absolute top-4 right-4 p-2 bg-white/50 rounded-md shadow-sm text-amber-700 hover:bg-amber-100 transition-colors"
                                  >
                                    {isCopiedFactory ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              <div className="relative mt-8">
                                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                                  <span className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500" /> 底层 BOM 结构 (USD)</span>
                                </h3>
                                
                                <div className={`border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${!isPro ? 'filter blur-[4px] grayscale opacity-60 select-none pointer-events-none' : ''}`}>
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-sm">物料/工艺精确明细</th>
                                        <th className="px-6 py-4 font-bold text-slate-600 text-sm text-right w-48">安全底价 (USD)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {currentPlan.bom && Array.isArray(currentPlan.bom) ? currentPlan.bom.map((item: any, idx: number) => (
                                          <tr key={idx} className="bg-white">
                                            <td className="px-6 py-4 text-slate-700 font-medium text-sm">{item.name || item.item}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">${item.cost || 0}</td>
                                          </tr>
                                        )) : (
                                        <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400">暂无明细</td></tr>
                                      )}
                                      
                                      <tr className="bg-slate-50">
                                        <td className="px-6 py-4 text-slate-700 font-medium text-sm flex items-center gap-2">📦 包装及辅料费 (系统硬算)</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">${(1 / exchangeRate).toFixed(2)}</td>
                                      </tr>
                                      <tr className="bg-slate-50">
                                        <td className="px-6 py-4 text-slate-700 font-medium text-sm flex items-center gap-2">🚚 国内内陆运费 (系统硬算)</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">${(1 / exchangeRate).toFixed(2)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                {!isPro && (
                                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[1px]">
                                    <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-200 animate-in zoom-in-95">
                                      <ShieldCheck className="w-12 h-12 text-slate-900 mb-3" />
                                      <h4 className="text-lg font-black text-slate-800 mb-2">不想再“瞎猜”成本？</h4>
                                      <p className="text-sm text-slate-500 mb-5 text-center max-w-[280px]">
                                        升级 Pro 解锁具体的面料、辅料及人工拆解项，让你彻底摸清利润底牌。
                                      </p>
                                      <button onClick={() => setShowProPaywall(true)} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/20">
                                        解锁精确成本拆解
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-white p-5 shrink-0 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
                    <button onClick={handleSaveChanges} disabled={isSaving} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存修改
                    </button>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          if (!isPro) {
                            setShowProPaywall(true);
                          } else {
                            trackEvent('export_pdf', { plan_type: activeTab }, inquiry?.user_id);
                            setShowExportModal(true);
                          }
                        }} 
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5" /> 渲染客户 PDF 报价单
                      </button>
                    </div>
                  </div>

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
              <h2 className="text-2xl font-black mb-4 leading-tight relative z-10">拒绝被工厂绑架<br/>开启战斧核价终端</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                解锁真正的底层 BOM 拆解与多阶梯方案，把谈判主动权拿回自己手里。
              </p>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm"><strong className="text-white block">X光级 BOM 拆解</strong>面辅料人工分项明细，告别瞎猜成本</p>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm"><strong className="text-white block">独家 A/B 逼单方案</strong>自动生成“高配锚点+跑量成交”策略</p>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm"><strong className="text-white block">一键渲染专业 PDF</strong>不再自己排版，让客户秒回邮件</p>
                </div>
              </div>
            </div>

            <div className="p-8 md:w-7/12 bg-white flex flex-col justify-center">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2">选择您的赚钱装备</h3>
                <p className="text-sm text-slate-500">少报错一次价，不仅是省钱，更是赢单。</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border-2 border-slate-900 bg-slate-50 rounded-2xl p-5 relative cursor-pointer shadow-md transform hover:-translate-y-1 transition-all">
                  <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg rounded-tr-xl">抢单首选</div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-black text-slate-800 text-lg">Pro 专业版 <span className="text-xs font-normal text-slate-500 ml-1">/ 季度</span></h4>
                    <span className="text-2xl font-black text-slate-900">¥999</span>
                  </div>
                  <p className="text-xs text-slate-600">解锁完整底层拆解、打样避坑指南与 PDF 渲染。</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center mb-4">
                <p className="text-xs font-bold text-slate-800 mb-2">👇 请扫码添加开发者微信开通</p>
                <div className="w-32 h-32 bg-white border border-slate-200 mx-auto rounded-lg shadow-sm flex items-center justify-center p-1 mb-2">
                  <img src="/pay-qr.jpg" alt="WeChat QR" className="w-full h-full object-contain" />
                </div>
                <p className="text-[10px] text-slate-500">转账后发送截图，1分钟内人工激活 Pro 权限</p>
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 max-h-32 overflow-y-auto leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">当前 AI 认知基准：</span>
                {localQuote?.analysis_reasoning || '无'}
              </div>
              <div>
                <label className="text-sm font-bold text-slate-800 mb-2 block">请输入修正指令</label>
                <textarea 
                  value={retryNote}
                  onChange={(e) => setRetryNote(e.target.value)}
                  placeholder="例如：客户预算有限，只要性价比方案；或者：去掉拉链重新核算。" 
                  className="w-full h-32 p-4 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 resize-none placeholder:text-slate-400"
                />
              </div>
              <button onClick={executeRetry} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md">
                <Send className="w-4 h-4" /> 下一步：确认指令
              </button>
            </div>
          </div>
        </div>
      )}

      {showTollbooth && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center space-y-5 relative">
              <button onClick={() => setShowTollbooth(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-sm">
                <RefreshCw className="w-10 h-10 text-slate-800" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">启动 AI 重新演算</h3>
                <p className="text-sm text-slate-500 leading-relaxed px-4">
                  系统将根据您的最新指令：“<span className="text-slate-700 font-medium line-clamp-2">{retryNote}</span>”，重新调动大模型进行核价与方案重构。
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-sm shadow-inner">
                <span className="text-slate-600 font-bold">本次消耗算力：</span>
                <span className="font-black text-slate-900 flex items-center gap-1.5"><Crown className="w-4 h-4" /> 1 次</span>
              </div>

              <div className="pt-2 space-y-3">
                <button 
                  onClick={confirmRetry}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 transition-all text-base"
                >
                  确认扣除并重算
                </button>
                <button 
                  onClick={() => setShowTollbooth(false)}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all border border-slate-200"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
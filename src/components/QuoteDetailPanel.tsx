import React, { useState, useEffect, useMemo } from "react";
import { X, Edit2, Save, AlertCircle, DollarSign, Calculator, FileText, MessageSquareQuote, Loader2, Send, Download, ShieldAlert } from "lucide-react";
import ExportPreviewModal from './ExportPreviewModal'; 
import ProfitCalculator from './ProfitCalculator';

interface BOMItem {
  id?: string;
  item?: string; 
  name?: string; 
  cost: number;
  unit?: string;
  notes?: string;
}

interface QuoteData {
  id?: string;
  product_name?: string;
  total_fob_price?: number; 
  final_price?: number; 
  total_cost?: number;
  bom?: BOMItem[];
  analysis_reasoning?: string; 
  margin?: number;
  moq?: string | number; // 🌟 新增 MOQ 字段
}

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  onSave?: (updatedData: any) => void;
}

export default function QuoteDetailPanel({
  isOpen,
  onClose,
  quoteData,
  onSave,
}: QuoteDetailPanelProps) {
  const [localData, setLocalData] = useState<QuoteData | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableBom, setEditableBom] = useState<BOMItem[]>([]);
  const [margin, setMargin] = useState<number>(0);
  
  // 🌟 新增：MOQ 状态管理，默认给个 500 的心理暗示
  const [moq, setMoq] = useState<string>("500");

  const [aiNote, setAiNote] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (quoteData && isOpen) {
      setLocalData(quoteData); 
      setEditableBom(JSON.parse(JSON.stringify(quoteData.bom || [])));
      setIsEditing(false);
      // 如果之前保存过 moq，回显它
      if (quoteData.moq) setMoq(String(quoteData.moq));
      
      const bomTotal = (quoteData.bom || []).reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
      const aiFinalPrice = quoteData.final_price || quoteData.total_cost || 0;
      
      const initialMargin = aiFinalPrice > bomTotal ? (aiFinalPrice - bomTotal) : 0;
      setMargin(Number(initialMargin.toFixed(2)));
    }
  }, [quoteData, isOpen]);

  const calculatedTotal = useMemo(() => {
    const bomTotal = editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return bomTotal + (Number(margin) || 0);
  }, [editableBom, margin]);

  // 🌟 升级：把 MOQ 和 ±15% 免责声明直接写进话术里！
  const generatedPitch = useMemo(() => {
    const productName = localData?.product_name || "the requested item";
    const price = calculatedTotal.toFixed(2);
    const moqText = moq ? ` based on a MOQ of ${moq} pcs` : "";
    
    return `Dear Client,\n\nThank you for your inquiry. Based on the reference image and your requirements, we are pleased to offer our best estimated FOB price for ${productName} at $${price}/pc${moqText}.\n\nPlease note this is an estimated quote (±15% variance) based on image analysis. Final price is subject to physical sample confirmation. Let me know if you need to proceed with sampling.\n\nBest regards,\n[Your Name]`;
  }, [calculatedTotal, localData?.product_name, moq]);

  const handleCostChange = (index: number, newCost: string) => {
    const updatedBom = [...editableBom];
    updatedBom[index].cost = newCost === "" ? 0 : parseFloat(newCost);
    setEditableBom(updatedBom);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    if (onSave && localData) {
      onSave({
        ...localData,
        bom: editableBom,
        final_price: calculatedTotal,
        margin: margin,
        moq: moq, // 🌟 保存时带上 MOQ
      });
    }
  };

  const handleAiFix = async () => {
    if (!aiNote.trim()) return alert('请告诉 AI 哪里算错了？例如：亮片只有50个');
    if (!localData?.id) return alert('找不到订单ID，无法重算');
    
    setIsAiFixing(true);

    try {
      const res = await fetch("https://api.toughlove.online/api/fix_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: localData.id,
          user_note: aiNote 
        }),
      });

      if (!res.ok) throw new Error('网络请求失败');
      const result = await res.json();
      const newData = result.new_data;
      
      setLocalData({ ...localData, ...newData });
      setEditableBom(newData.bom || []);
      
      const newBomTotal = (newData.bom || []).reduce((sum: number, i: any) => sum + (Number(i.cost) || 0), 0);
      const aiFinalPrice = newData.final_price || newData.total_cost || 0;
      const initialMargin = aiFinalPrice > newBomTotal ? (aiFinalPrice - newBomTotal) : 0;
      setMargin(Number(initialMargin.toFixed(2)));

      setAiNote(''); 
      alert('🎉 AI 纠错成功，已自动更新 BOM 成本与总价！');
      
      if (onSave) {
        onSave({ ...localData, ...newData, final_price: aiFinalPrice, margin: initialMargin, moq: moq });
      }
      
    } catch (error) {
      console.error(error);
      alert('AI 纠错请求失败，请检查网络或后端日志');
    } finally {
      setIsAiFixing(false);
    }
  };

  if (!isOpen || !localData) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity">
        {/* 🌟 修改点 1：把 max-w-xl 改成了 max-w-6xl w-[95vw]，大大拉宽了整个弹窗 */}
        <div className="w-[95vw] max-w-6xl bg-slate-50 h-full shadow-2xl flex flex-col animate-slide-in-right">
          
          {/* Header区 */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                AI 智能核价单
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {localData.product_name || "系统客观拆解，支持人工微调"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition shadow-sm"
                title="导出为 PDF 报价单"
              >
                <Download className="w-4 h-4" />
                导出报价单
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition ml-2">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 内容区：滚动容器 */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            
            {/* 🌟 修改点 2：使用 Grid 网格布局，实现左右双列分屏 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              
              {/* 👈 左列 (占宽 5/12)：情报与沟通区 */}
              <div className="lg:col-span-5 space-y-6 flex flex-col">
                
                {/* 1. AI 纠错重算模块 */}
                {localData.analysis_reasoning && (
                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-3">
                      <FileText className="w-4 h-4" /> AI 核价依据
                    </h3>
                    <p className="text-sm text-blue-700/80 leading-relaxed whitespace-pre-wrap mb-5 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                      {localData.analysis_reasoning}
                    </p>
                    
                    <div className="border-t border-slate-100 pt-4">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 mb-2 uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5" /> 发现 AI 算错了？告诉它重算
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={aiNote}
                          onChange={(e) => setAiNote(e.target.value)}
                          placeholder="例如：亮片只有50个左右..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-gray-800 placeholder:text-gray-400"
                          onKeyDown={(e) => e.key === 'Enter' && handleAiFix()}
                        />
                        <button 
                          onClick={handleAiFix}
                          disabled={isAiFixing || !aiNote.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-5 font-medium rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-blue-400 shadow-sm shadow-blue-200"
                        >
                          {isAiFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : '重算'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 话术生成区 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <MessageSquareQuote className="w-4 h-4" /> 推荐回复话术 (草稿)
                  </h3>
                  <textarea 
                    readOnly
                    className="flex-1 w-full text-sm text-gray-600 bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[160px] focus:outline-none resize-none"
                    value={generatedPitch}
                  />
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPitch);
                        alert("复制成功！");
                      }}
                      className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                    >
                      一键复制话术
                    </button>
                  </div>
                </div>

              </div>

              {/* 👉 右列 (占宽 7/12)：硬核算账与汇总区 */}
              <div className="lg:col-span-7 space-y-6 flex flex-col">
                
                {/* 1. BOM 调整表格 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      BOM 成本明细 (USD)
                    </h3>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                        <Edit2 className="w-4 h-4" /> 人工微调
                      </button>
                    ) : (
                      <button onClick={handleSaveClick} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition shadow-sm shadow-emerald-200">
                        <Save className="w-4 h-4" /> 保存锁定
                      </button>
                    )}
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5 font-bold text-slate-700">项目 (Item)</th>
                          <th className="px-5 py-3.5 font-bold text-slate-700 text-right">预估单价 ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editableBom.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition">
                            <td className="px-5 py-3">
                              <span className="font-semibold text-slate-800">{item.item || item.name}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.cost === 0 ? "" : item.cost}
                                  onChange={(e) => handleCostChange(index, e.target.value)}
                                  className="w-24 text-right border border-blue-300 rounded-lg px-2 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="0.00"
                                />
                              ) : (
                                <span className="font-mono font-medium">${Number(item.cost).toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-orange-50/50">
                          <td className="px-5 py-4">
                            <span className="font-bold text-orange-700 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" /> 弹性溢价 / 风险预留
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={margin === 0 ? "" : margin}
                                onChange={(e) => setMargin(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                className="w-24 text-right border border-orange-300 bg-white rounded-lg px-2 py-1.5 text-orange-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="font-mono font-bold text-orange-600">
                                + ${Number(margin).toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. 隐形利润核算器组件 */}
                <div className="w-full">
                  <ProfitCalculator 
                    defaultCostRMB={editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) * 7.2} 
                  />
                </div>

                {/* 3. 修改点 3：把原先固定在底部的汇总区，移进来了，跟计算器无缝衔接 */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm mt-auto">
                  
                  <div className="mb-5 pb-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        最小起订量 (MOQ)
                      </label>
                      <p className="text-xs text-slate-500 mt-1">报价需基于起订量，避免后续扯皮</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={moq}
                        onChange={(e) => setMoq(e.target.value)}
                        placeholder="500"
                        className="w-28 text-right border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-mono"
                      />
                      <span className="text-sm text-slate-500 font-medium">pcs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-600">最终预估 FOB 价</p>
                      <div className="flex items-center gap-1.5 mt-2 bg-blue-50/80 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100/80">
                        <ShieldAlert className="w-4 h-4" />
                        <p className="text-[11px] font-bold">
                          安全预估区间: ${(calculatedTotal * 0.85).toFixed(2)} - ${(calculatedTotal * 1.15).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-end gap-1 text-blue-600">
                        <DollarSign className="w-6 h-6 mb-1.5" />
                        <span className="text-5xl font-black tracking-tight font-mono leading-none">
                          {calculatedTotal.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-400 mt-1">/ pc</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsExportOpen(true)}
                    className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200 flex justify-center items-center gap-2 group"
                  >
                    <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    确认并生成正式报价单
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      <ExportPreviewModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        quoteData={{
          ...localData,
          bom: editableBom,
          margin: margin,
          final_price: calculatedTotal,
          moq: moq 
        }} 
      />
    </>
  );
}
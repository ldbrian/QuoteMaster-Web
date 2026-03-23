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
  moq?: string | number;
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
  
  const [moq, setMoq] = useState<string>("500");

  const [aiNote, setAiNote] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (quoteData && isOpen) {
      setLocalData(quoteData); 
      setEditableBom(JSON.parse(JSON.stringify(quoteData.bom || [])));
      setIsEditing(false);
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
        moq: moq, 
      });
    }
  };

  const handleAiFix = async () => {
    if (!aiNote.trim()) return alert('请告诉 AI 哪里算错了？');
    if (!localData?.id) return alert('找不到订单ID');
    setIsAiFixing(true);
    try {
      const res = await fetch("https://api.toughlove.online/api/fix_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: localData.id, user_note: aiNote }),
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
      alert('🎉 AI 纠错成功');
    } catch (error) {
      console.error(error);
      alert('AI 纠错请求失败');
    } finally {
      setIsAiFixing(false);
    }
  };

  if (!isOpen || !localData) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
        <div className="w-[95vw] max-w-7xl bg-slate-50 h-full shadow-2xl flex flex-col animate-slide-in-right duration-300 overflow-hidden">
          
          {/* Header区 (固定顶部) */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                AI 智能核价单
              </h2>
              <p className="text-sm text-gray-500 mt-1">系统客观拆解，支持人工微调</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 🌟 核心修改点 1：内容区不再包裹那个奇怪的吸底卡片 */}
          {/* 内容区 (滚动容器) */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* 👈 左列 */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. AI 纠错核价依据 */}
                {localData.analysis_reasoning && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-blue-500" /> AI 核价依据
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-6 bg-slate-50 p-4 rounded-xl border border-gray-100">
                      {localData.analysis_reasoning}
                    </p>
                    <div className="border-t border-gray-100 pt-5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2.5 uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> 发现 AI 算错了？告诉它重算
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={aiNote} onChange={(e) => setAiNote(e.target.value)} placeholder="例如：亮片只有50个左右..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none bg-white text-gray-800 transition" onKeyDown={(e) => e.key === 'Enter' && handleAiFix()} />
                        <button onClick={handleAiFix} disabled={isAiFixing || !aiNote.trim()} className="bg-slate-900 hover:bg-blue-600 text-white px-6 font-medium rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 shadow">
                          {isAiFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : '重算'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 话术生成区 */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <MessageSquareQuote className="w-4 h-4 text-blue-500" /> 推荐回复话术 (草稿)
                  </h3>
                  <textarea readOnly className="w-full text-sm text-gray-600 bg-slate-50 border border-gray-100 rounded-xl p-4 min-h-[200px] focus:outline-none resize-none leading-relaxed" value={generatedPitch} />
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => { navigator.clipboard.writeText(generatedPitch); alert("复制成功！"); }} className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
                      一键复制话术
                    </button>
                  </div>
                </div>
              </div>

              {/* 👉 右列 */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. BOM 调整表格 */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">BOM 成本明细 (USD)</h3>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                        <Edit2 className="w-4 h-4" /> 人工微调
                      </button>
                    ) : (
                      <button onClick={handleSaveClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition shadow-sm shadow-emerald-100">
                        <Save className="w-4 h-4" /> 保存锁定
                      </button>
                    )}
                  </div>
                  
                  <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-3.5 font-bold text-gray-700">项目 (Item)</th>
                          <th className="px-5 py-3.5 font-bold text-gray-700 text-right">预估单价 ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editableBom.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5"><span className="font-medium text-gray-800">{item.item || item.name}</span></td>
                            <td className="px-5 py-3.5 text-right">
                              {isEditing ? (
                                <input type="number" step="0.01" value={item.cost === 0 ? "" : item.cost} onChange={(e) => handleCostChange(index, e.target.value)} className="w-24 text-right border border-blue-200 rounded-lg px-2.5 py-1.5 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white" placeholder="0.00" />
                              ) : (
                                <span className="font-mono font-bold text-gray-950">${Number(item.cost).toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-orange-50/50">
                          <td className="px-5 py-4"><span className="font-bold text-orange-700 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> 弹性溢价 / 风险预留</span></td>
                          <td className="px-5 py-4 text-right">
                            {isEditing ? (
                              <input type="number" step="0.01" value={margin === 0 ? "" : margin} onChange={(e) => setMargin(e.target.value === "" ? 0 : parseFloat(e.target.value))} className="w-24 text-right border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-orange-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-100" placeholder="0.00" />
                            ) : (
                              <span className="font-mono font-bold text-orange-600">+ ${Number(margin).toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. 隐形利润核算器组件 */}
                <div className="w-full">
                  <ProfitCalculator defaultCostRMB={editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) * 7.2} />
                </div>
              </div>

            </div>
          </div>

          {/* 🌟 核心修改点 2：把汇总和按钮移到这里！横跨整个弹窗底部！ */}
          {/* Footer区 (固定底部，横跨全屏) */}
          <div className="px-8 py-5 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] z-10">
            <div className="grid grid-cols-12 gap-6 items-center">
              
              {/* MOQ 输入 (左侧) */}
              <div className="col-span-3 flex items-center gap-3 border-r border-gray-100 pr-6">
                <div>
                  <label className="text-sm font-bold text-gray-800">最小起订量 (MOQ)</label>
                  <p className="text-xs text-slate-500 mt-0.5">避免后续扯皮</p>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} placeholder="500" className="w-24 text-right border border-gray-300 bg-slate-50 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:bg-white focus:border-blue-200 outline-none font-mono" />
                  <span className="text-sm text-slate-500 font-medium">pcs</span>
                </div>
              </div>

              {/* 最终报价 (中间) */}
              <div className="col-span-5 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-600 mb-1">最终预估 FOB 价</p>
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <p className="text-[11px] font-bold">
                      预估区间 (±15%): ${(calculatedTotal * 0.85).toFixed(2)} - ${(calculatedTotal * 1.15).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 text-blue-600">
                  <DollarSign className="w-7 h-7 mb-1.5 text-blue-500" />
                  <span className="text-6xl font-black tracking-tight font-mono leading-none">
                    {calculatedTotal.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-slate-400 mt-1.5">/ pc</span>
                </div>
              </div>
              
              {/* 导出按钮 (右侧) */}
              <div className="col-span-4 pl-6 border-l border-gray-100">
                <button 
                  onClick={() => setIsExportOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 group text-lg"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  确认并生成正式报价单
                </button>
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
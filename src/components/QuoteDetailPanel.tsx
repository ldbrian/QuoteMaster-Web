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
    
    return `Dear Client,

Thank you for your inquiry. Based on the reference image and your requirements, we are pleased to offer our best estimated FOB price for ${productName} at $${price}/pc${moqText}.

Please note this is an estimated quote (±15% variance) based on image analysis. Final price is subject to physical sample confirmation. Let me know if you need to proceed with sampling.

Best regards,
[Your Name]`;
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
      <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
        <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
          {/* Header区 */}
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition shadow-sm"
                title="导出为 PDF 报价单"
              >
                <Download className="w-4 h-4" />
                导出报价单
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* AI 纠错重算模块 */}
            {localData.analysis_reasoning && (
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                  <FileText className="w-4 h-4" /> AI 核价依据
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-wrap mb-4">
                  {localData.analysis_reasoning}
                </p>
                
                <div className="border-t border-blue-200/60 pt-3 mt-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 mb-2 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5" /> 发现 AI 算错了？输入反馈让它重算
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={aiNote}
                      onChange={(e) => setAiNote(e.target.value)}
                      placeholder="例如：亮片只有50个左右..."
                      className="flex-1 px-3 py-2 rounded-md border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800 placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleAiFix()}
                    />
                    <button 
                      onClick={handleAiFix}
                      disabled={isAiFixing || !aiNote.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-blue-400"
                    >
                      {isAiFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : '重算'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 表格区 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  BOM 成本明细 (USD)
                </h3>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition">
                    <Edit2 className="w-4 h-4" /> 人工微调
                  </button>
                ) : (
                  <button onClick={handleSaveClick} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition shadow-sm">
                    <Save className="w-4 h-4" /> 保存锁定
                  </button>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">项目 (Item)</th>
                      <th className="px-4 py-3 font-medium text-right">预估单价 ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editableBom.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{item.item || item.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={item.cost === 0 ? "" : item.cost}
                              onChange={(e) => handleCostChange(index, e.target.value)}
                              className="w-24 text-right border border-blue-300 rounded-md px-2 py-1 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="font-mono">${Number(item.cost).toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-orange-50/30">
                      <td className="px-4 py-3">
                        <span className="font-medium text-orange-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> 弹性溢价 / 风险预留
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={margin === 0 ? "" : margin}
                            onChange={(e) => setMargin(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            className="w-24 text-right border border-orange-300 bg-white rounded-md px-2 py-1 text-orange-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono font-semibold text-orange-600">
                            + ${Number(margin).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* 🌟 核心护城河：隐形利润核算器 (上帝视角) */}
            <div className="pt-2 pb-4">
              <ProfitCalculator 
                // 自动把 BOM 的 USD 总和乘以 7.2，作为工厂 RMB 底价的默认初始值
                defaultCostRMB={editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) * 7.2} 
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <MessageSquareQuote className="w-4 h-4" /> 推荐回复话术 (草稿)
              </h3>
              <textarea 
                readOnly
                className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[160px] focus:outline-none"
                value={generatedPitch}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(generatedPitch)}
                className="text-xs text-blue-600 font-medium mt-2 hover:underline px-1"
              >
                一键复制话术
              </button>
            </div>

          </div>

          {/* 底部汇总区 */}
          <div className="border-t border-gray-200 bg-gray-50 p-6 shrink-0 relative">
            
            {/* 🌟 核心升级：MOQ 交互区，紧贴在总价上方 */}
            <div className="mb-4 pb-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  最小起订量 (MOQ)
                </label>
                <p className="text-xs text-gray-500 mt-0.5">报价需基于起订量，避免后续扯皮</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="500"
                  className="w-24 text-right border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <span className="text-sm text-gray-600 font-medium w-8">pcs</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">最终预估 FOB 价</p>
                {/* 🌟 核心升级：±15% 价格安全区间展示 */}
                <div className="flex items-center gap-1 mt-1.5 bg-blue-100/60 text-blue-700 px-2.5 py-1 rounded border border-blue-200/50">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <p className="text-xs font-semibold">
                    安全预估区间: ${(calculatedTotal * 0.85).toFixed(2)} - ${(calculatedTotal * 1.15).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-end gap-1 text-blue-600">
                  <DollarSign className="w-5 h-5 mb-1" />
                  <span className="text-4xl font-bold tracking-tight font-mono">
                    {calculatedTotal.toFixed(2)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 mt-1">/ pc</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsExportOpen(true)}
              className="w-full mt-5 bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-md flex justify-center items-center gap-2"
            >
              <Download className="w-5 h-5" />
              确认并生成正式报价单
            </button>
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
          moq: moq // 🌟 把填好的 MOQ 传给装配台！
        }} 
      />
    </>
  );
}
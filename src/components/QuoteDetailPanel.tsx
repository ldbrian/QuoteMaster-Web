import React, { useState, useEffect, useMemo } from "react";
import { X, Edit2, Save, AlertCircle, DollarSign, Calculator, FileText, MessageSquareQuote, Send, Loader2 } from "lucide-react";

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
  // 🌟 新增：接管全局状态，方便 AI 纠错后覆盖
  const [localData, setLocalData] = useState<QuoteData | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableBom, setEditableBom] = useState<BOMItem[]>([]);
  const [margin, setMargin] = useState<number>(0);
  
  // 🌟 新增：AI 纠错相关的状态
  const [aiNote, setAiNote] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);

  useEffect(() => {
    if (quoteData && isOpen) {
      setLocalData(quoteData); // 初始化全局数据
      setEditableBom(JSON.parse(JSON.stringify(quoteData.bom || [])));
      setIsEditing(false);
      
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

  // 英文话术保持英文，因为这是发给国外客户的
  const generatedPitch = useMemo(() => {
    const productName = localData?.product_name || "the requested item";
    const price = calculatedTotal.toFixed(2);
    return `Dear Client,

Thank you for your inquiry. Based on the reference image and your requirements, we are pleased to offer our best FOB Shanghai price for ${productName} at $${price}/pc.

This price includes premium materials and standard packaging. Please let me know if you need physical samples or have further modifications.

Best regards,
[Your Name]`;
  }, [calculatedTotal, localData?.product_name]);

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
      });
    }
  };

  // 🤖 核心新增：AI 一键纠错重算（小白模式）
  const handleAiFix = async () => {
    if (!aiNote.trim()) return alert('请写一下哪里算错了？例如：亮片只有50个');
    if (!localData?.id) return alert('找不到订单ID，无法重算');
    
    setIsAiFixing(true);

    try {
      const res = await fetch("https://api.toughlove.online/api/fix_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: localData.id,
          old_quote: localData, // 把当前的错误数据发给 AI 做靶子
          user_note: aiNote   // 业务员的吐槽
        }),
      });

      if (!res.ok) throw new Error('网络请求失败');
      const result = await res.json();
      
      const newData = result.new_data;
      
      // 1. 用 AI 返回的最新数据覆盖本地状态
      setLocalData(newData);
      setEditableBom(newData.bom || []);
      
      // 2. 重新计算溢价 (保持之前的差价逻辑)
      const newBomTotal = (newData.bom || []).reduce((sum: number, i: any) => sum + (Number(i.cost) || 0), 0);
      const aiFinalPrice = newData.final_price || newData.total_cost || 0;
      const initialMargin = aiFinalPrice > newBomTotal ? (aiFinalPrice - newBomTotal) : 0;
      setMargin(Number(initialMargin.toFixed(2)));

      setAiNote(''); // 清空输入框
      alert('🎉 AI 纠错成功，已自动更新报价表！');
      
      // 3. 顺便触发一下父组件的保存回调，更新列表
      if (onSave) {
        onSave({
          ...newData,
          final_price: aiFinalPrice,
          margin: initialMargin
        });
      }
      
    } catch (error) {
      console.error(error);
      alert('AI 纠错超时或失败，请重试');
    } finally {
      setIsAiFixing(false);
    }
  };

  if (!isOpen || !localData) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
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
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {localData.analysis_reasoning && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4" /> AI 核价依据
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-wrap">
                {localData.analysis_reasoning}
              </p>
            </div>
          )}

          {/* 🛠️ CTO 注入：AI 纠错输入框 (对付幻觉的终极武器) */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
              <AlertCircle className="w-4 h-4" /> 发现 AI 算错了？告诉它错在哪
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={aiNote}
                onChange={(e) => setAiNote(e.target.value)}
                placeholder="例如：AI你看错了，亮片只有50个..."
                className="flex-1 px-3 py-2 rounded-md border border-amber-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-800"
                onKeyDown={(e) => e.key === 'Enter' && handleAiFix()}
              />
              <button 
                onClick={handleAiFix}
                disabled={isAiFixing || !aiNote.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                title="发送给 AI 重新核算"
              >
                {isAiFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

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
        <div className="border-t border-gray-200 bg-gray-50 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">最终预估 FOB 价</p>
              <p className="text-xs text-gray-400 mt-1">包含硬成本与弹性溢价</p>
            </div>
            <div className="flex items-end gap-1 text-blue-600">
              <DollarSign className="w-6 h-6 mb-1" />
              <span className="text-4xl font-bold tracking-tight font-mono">
                {calculatedTotal.toFixed(2)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              alert("🚧 【新功能内测中】\n\n一键生成带公司 Logo 的精美 PDF 报价单功能正在紧张开发中！\n\n如果您需要此功能，请通过页面右下角的【吐槽反馈】告诉我们，我们会为您优先排期上线！");
            }}
            className="w-full mt-6 bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-md flex justify-center items-center gap-2"
          >
            确认并生成正式报价单
          </button>
        </div>
      </div>
    </div>
  );
}
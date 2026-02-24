import React, { useState, useEffect, useMemo } from "react";
import { X, Edit2, Save, AlertCircle, DollarSign, Calculator } from "lucide-react";

// 定义后端传过来的 BOM 数据结构
interface BOMItem {
  id?: string;
  name: string;
  cost: number;
  unit?: string;
  notes?: string;
}

interface QuoteData {
  id: string;
  total_fob_price: number;
  bom: BOMItem[];
}

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  onSave?: (updatedData: QuoteData & { margin: number }) => void; // 预留给未来存入数据库的接口
}

export default function QuoteDetailPanel({
  isOpen,
  onClose,
  quoteData,
  onSave,
}: QuoteDetailPanelProps) {
  // --- 核心状态接管 ---
  const [isEditing, setIsEditing] = useState(false);
  const [editableBom, setEditableBom] = useState<BOMItem[]>([]);
  const [margin, setMargin] = useState<number>(0); // 利润调节阀/风险金

  // 当面板打开或收到新数据时，初始化可编辑状态
  useEffect(() => {
    if (quoteData && isOpen) {
      // 深拷贝原始 BOM，防止直接修改 Props
      setEditableBom(JSON.parse(JSON.stringify(quoteData.bom || [])));
      setIsEditing(false);
      setMargin(0); // 每次打开清空额外附加利润
    }
  }, [quoteData, isOpen]);

  // --- 财务引擎：实时计算总价 ---
  const calculatedTotal = useMemo(() => {
    const bomTotal = editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return bomTotal + (Number(margin) || 0);
  }, [editableBom, margin]);

  // --- 事件处理函数 ---
  const handleCostChange = (index: number, newCost: string) => {
    const updatedBom = [...editableBom];
    // 允许空字符串输入以便用户删除重新打字，计算时会转为 0
    updatedBom[index].cost = newCost === "" ? 0 : parseFloat(newCost);
    setEditableBom(updatedBom);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    // 模拟保存动作，未来这里调用 Supabase 接口
    if (onSave && quoteData) {
      onSave({
        ...quoteData,
        bom: editableBom,
        total_fob_price: calculatedTotal,
        margin: margin,
      });
    }
    console.log("【保存的最终底牌】:", { editableBom, margin, calculatedTotal });
  };

  // 如果面板未打开或没有数据，不渲染
  if (!isOpen || !quoteData) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      {/* 抽屉面板本体 */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header区 */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              AI 智能核价单
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              系统客观拆解，支持人工覆写
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 操作栏 */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              BOM 成本明细 (USD)
            </h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
              >
                <Edit2 className="w-4 h-4" />
                人工介入 (微调)
              </button>
            ) : (
              <button
                onClick={handleSaveClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                保存并锁定
              </button>
            )}
          </div>

          {/* 表格区 */}
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
                      <span className="font-medium text-gray-800">{item.name}</span>
                      {item.notes && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost === 0 ? "" : item.cost}
                          onChange={(e) => handleCostChange(index, e.target.value)}
                          className="w-24 text-right border border-blue-300 rounded-md px-2 py-1 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-mono">${Number(item.cost).toFixed(2)}</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* --- 战略把戏：利润调节阀 / 风险金 --- */}
                <tr className="bg-orange-50/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-orange-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      弹性溢价 / 风险预留
                    </span>
                    <span className="block text-xs text-orange-500 mt-0.5">
                      (仅内部可见的利润空间)
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

        {/* 底部汇总区 (Footer) */}
        <div className="border-t border-gray-200 bg-gray-50 p-6">
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
          
          <button className="w-full mt-6 bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-md flex justify-center items-center gap-2">
            确认并生成正式报价单
          </button>
        </div>
      </div>
    </div>
  );
}
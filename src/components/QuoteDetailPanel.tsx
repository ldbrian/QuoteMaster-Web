import React, { useState, useEffect, useMemo } from "react";
import { X, Edit2, Save, AlertCircle, DollarSign, Calculator, FileText, MessageSquareQuote, Loader2, Download, ShieldAlert, Wand2, ArrowRight } from "lucide-react";
import ExportPreviewModal from './ExportPreviewModal'; 
import ProfitCalculator from './ProfitCalculator';
import { supabase } from '@/src/utils/supabase/client'; // 确保路径正确

interface BOMItem { id?: string; item?: string; name?: string; cost: number; unit?: string; notes?: string; }

interface QuotePlan {
  title?: string;
  bom?: BOMItem[];
  total_cost?: number;
  final_price?: number;
  tech_pack?: string;
  factory_pitch?: string;
  reasoning?: string;
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
  tech_pack?: string;
  factory_pitch?: string;
  plans?: {
    plan_a?: QuotePlan;
    plan_b?: QuotePlan;
    plan_c?: QuotePlan;
  };
}

interface QuoteDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData | null;
  onSave?: (updatedData: any) => void;
}

export default function QuoteDetailPanel({ isOpen, onClose, quoteData, onSave }: QuoteDetailPanelProps) {
  const [localData, setLocalData] = useState<QuoteData | null>(null);
  
  // 🌟 方案切换与当前数据态
  const [activePlanKey, setActivePlanKey] = useState<string>('plan_a');
  const [isEditing, setIsEditing] = useState(false);
  const [editableBom, setEditableBom] = useState<BOMItem[]>([]);
  const [margin, setMargin] = useState<number>(0);
  const [moq, setMoq] = useState<string>("500");

  // 🌟 纠错弹窗专属状态
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [fixNote, setFixNote] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);
  
  const [isExportOpen, setIsExportOpen] = useState(false);

  // 初始化数据提取逻辑 (兼容新版嵌套 plans 与旧版扁平结构)
  useEffect(() => {
    if (quoteData && isOpen) {
      setLocalData(quoteData); 
      if (quoteData.moq) setMoq(String(quoteData.moq));
      
      let initialBom: BOMItem[] = [];
      let aiFinalPrice = 0;

      // 如果是新版包含 A/B/C 方案的数据
      if (quoteData.plans && quoteData.plans['plan_a']) {
        setActivePlanKey('plan_a');
        initialBom = quoteData.plans['plan_a'].bom || [];
        aiFinalPrice = quoteData.plans['plan_a'].final_price || 0;
      } else {
        // 兼容旧版单一方案数据
        setActivePlanKey('legacy');
        initialBom = quoteData.bom || [];
        aiFinalPrice = quoteData.final_price || quoteData.total_cost || 0;
      }
      
      setEditableBom(JSON.parse(JSON.stringify(initialBom)));
      setIsEditing(false);
      
      const bomTotal = initialBom.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
      const initialMargin = aiFinalPrice > bomTotal ? (aiFinalPrice - bomTotal) : 0;
      setMargin(Number(initialMargin.toFixed(2)));
    }
  }, [quoteData, isOpen]);

  // 当用户切换 A/B/C Tab 时，刷新下方的数据
  const handleTabChange = (planKey: string) => {
    setActivePlanKey(planKey);
    setIsEditing(false);
    if (localData?.plans && localData.plans[planKey as keyof typeof localData.plans]) {
      const plan = localData.plans[planKey as keyof typeof localData.plans] as QuotePlan;
      const newBom = plan.bom || [];
      setEditableBom(JSON.parse(JSON.stringify(newBom)));
      const bomTotal = newBom.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
      const aiFinalPrice = plan.final_price || plan.total_cost || 0;
      setMargin(Number((aiFinalPrice > bomTotal ? (aiFinalPrice - bomTotal) : 0).toFixed(2)));
    }
  };

  const calculatedTotal = useMemo(() => {
    const bomTotal = editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return bomTotal + (Number(margin) || 0);
  }, [editableBom, margin]);

  // 获取当前生效的话术和工艺单
  const currentPlan = localData?.plans ? localData.plans[activePlanKey as keyof typeof localData.plans] : null;
  const displayTechPack = currentPlan?.tech_pack || localData?.tech_pack || "AI 正在分析核心工艺...";
  const displayPitch = currentPlan?.factory_pitch || localData?.factory_pitch || "此方案建议直接拿样板跟工厂死磕价格。";

  const handleCostChange = (index: number, newCost: string) => {
    const updatedBom = [...editableBom];
    updatedBom[index].cost = newCost === "" ? 0 : parseFloat(newCost);
    setEditableBom(updatedBom);
  };

  const handleSaveClick = () => { setIsEditing(false); };

  // 🌟 CTO：终极无头 Worker 纠错轮询机制
  const handleSubmitFix = async () => {
    if (!fixNote.trim()) return alert('老板，请下达具体的修改指令！');
    if (!localData?.id) return alert('找不到订单ID，无法重算');
    
    setIsAiFixing(true);
    try {
      // 1. 拔掉 API 网线，直接改写数据库状态，召唤后台 Worker
      const { error: updateErr } = await supabase.from('inquiries').update({ 
          status: 'fixing', user_prompt: fixNote 
      }).eq('id', localData.id);

      if (updateErr) throw updateErr;

      // 2. 智能轮询等待 Worker 算完
      let attempts = 0;
      let isSuccess = false;
      while (attempts < 35) { // 最多等 70 秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: checkData } = await supabase.from('inquiries').select('status').eq('id', localData.id).single();

        if (checkData?.status === 'quoted') {
          // Worker 算完了！拉取最新数据
          const { data: msgData } = await supabase.from('messages').select('quote_data').eq('inquiry_id', localData.id).order('created_at', { ascending: false }).limit(1).single();

          if (msgData?.quote_data) {
            const newData = msgData.quote_data;
            setLocalData({ ...localData, ...newData });
            
            // 重新切回 Plan A 作为默认展示
            if (newData.plans && newData.plans['plan_a']) {
              setActivePlanKey('plan_a');
              const newBom = newData.plans['plan_a'].bom || [];
              setEditableBom(newBom);
              const bomTotal = newBom.reduce((sum: number, i: any) => sum + (Number(i.cost) || 0), 0);
              const aiFinalPrice = newData.plans['plan_a'].final_price || 0;
              setMargin(Number((aiFinalPrice > bomTotal ? (aiFinalPrice - bomTotal) : 0).toFixed(2)));
            }
            isSuccess = true;
            break;
          }
        } else if (checkData?.status === 'failed') {
          throw new Error("Worker 处理纠错失败");
        }
        attempts++;
      }

      if (isSuccess) {
        setIsFixModalOpen(false);
        setFixNote(''); 
        alert('🎉 AI 全局纠错成功，已为您重新生成 A/B/C 三阶方案！');
      } else {
        alert('等待超时，AI 思考太久了，请稍后关闭弹窗刷新重试');
      }
    } catch (error) {
      console.error(error);
      alert('网络异常或数据库更新失败');
    } finally {
      setIsAiFixing(false);
    }
  };

  if (!isOpen || !localData) return null;

  return (
    <>
      {/* 🌟 驾驶舱主界面 */}
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
        <div className="w-[95vw] max-w-7xl bg-slate-50 h-full shadow-2xl flex flex-col animate-slide-in-right duration-300 overflow-hidden relative">
          
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" /> AI 智能核价单 <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">PRO</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">{localData.product_name}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* 👈 左列：全局情报与话术区 */}
              <div className="lg:col-span-5 space-y-6 flex flex-col">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-500" /> AI 全局核价依据
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-gray-100 max-h-[250px] overflow-y-auto">
                    {localData.analysis_reasoning}
                  </p>
                  
                  {/* 🌟 霸道重算入口 */}
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <button onClick={() => setIsFixModalOpen(true)} className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all">
                      <Wand2 className="w-4 h-4" /> 对结果不满意？指令 AI 全局重算
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                  <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 mb-3">对厂沟通大纲 (Tech-Pack)</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{displayTechPack}</p>
                </div>

                <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white flex-1">
                  <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <MessageSquareQuote className="w-4 h-4" /> 微信压价/逼单话术 (当前方案专属)
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{displayPitch}</p>
                  <button onClick={() => { navigator.clipboard.writeText(displayPitch); alert("话术已复制！"); }} className="mt-4 text-xs text-emerald-600 font-bold bg-emerald-100/50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
                    一键复制微信
                  </button>
                </div>
              </div>

              {/* 👉 右列：硬核算账与方案区 */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 🌟 A/B/C 方案切换 Tab */}
                {localData.plans && (
                  <div className="flex space-x-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                    {['plan_a', 'plan_b', 'plan_c'].map((key) => {
                      const plan = localData.plans![key as keyof typeof localData.plans];
                      if (!plan) return null;
                      const isActive = activePlanKey === key;
                      return (
                        <button key={key} onClick={() => handleTabChange(key)}
                          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${isActive ? 'bg-white text-blue-700 shadow-sm border border-blue-100 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-[0.98]'}`}
                        >
                          {plan.title || key.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      {localData.plans ? `当前方案 BOM 成本 ($)` : `BOM 成本明细 ($)`}
                    </h3>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4" /> 人工微调</button>
                    ) : (
                      <button onClick={handleSaveClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-sm"><Save className="w-4 h-4" /> 保存锁定</button>
                    )}
                  </div>
                  
                  <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-slate-50 border-b border-gray-100">
                        <tr><th className="px-5 py-3.5 font-bold text-gray-700">项目 (Item)</th><th className="px-5 py-3.5 font-bold text-gray-700 text-right">预估单价 ($)</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editableBom.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-gray-800">{item.item || item.name}</td>
                            <td className="px-5 py-3.5 text-right">
                              {isEditing ? <input type="number" step="0.01" value={item.cost === 0 ? "" : item.cost} onChange={(e) => handleCostChange(index, e.target.value)} className="w-24 text-right border border-blue-200 rounded-lg px-2.5 py-1 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
                              : <span className="font-mono font-bold text-gray-950">${Number(item.cost).toFixed(2)}</span>}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-orange-50/50">
                          <td className="px-5 py-4 font-bold text-orange-700 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> 弹性溢价 / 风险预留</td>
                          <td className="px-5 py-4 text-right">
                            {isEditing ? <input type="number" step="0.01" value={margin === 0 ? "" : margin} onChange={(e) => setMargin(e.target.value === "" ? 0 : parseFloat(e.target.value))} className="w-24 text-right border border-orange-200 bg-white rounded-lg px-2.5 py-1 text-orange-900 font-bold outline-none" />
                            : <span className="font-mono font-bold text-orange-600">+ ${Number(margin).toFixed(2)}</span>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="w-full"><ProfitCalculator defaultCostRMB={editableBom.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) * 7.2} /></div>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] z-10">
            <div className="grid grid-cols-12 gap-6 items-center">
              <div className="col-span-3 flex items-center gap-3 border-r border-gray-100 pr-6">
                <div><label className="text-sm font-bold text-gray-800">最小起订量</label><p className="text-xs text-slate-500 mt-0.5">避免后续扯皮</p></div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} className="w-24 text-right border border-gray-300 bg-slate-50 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none font-mono" />
                  <span className="text-sm text-slate-500 font-medium">pcs</span>
                </div>
              </div>
              <div className="col-span-5 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-600 mb-1">当前方案预估 FOB</p>
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100">
                    <ShieldAlert className="w-3.5 h-3.5" /><p className="text-[11px] font-bold">区间: ${(calculatedTotal * 0.85).toFixed(2)} - ${(calculatedTotal * 1.15).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 text-blue-600">
                  <DollarSign className="w-7 h-7 mb-1.5 text-blue-500" />
                  <span className="text-6xl font-black tracking-tight font-mono leading-none">{calculatedTotal.toFixed(2)}</span>
                  <span className="text-sm font-bold text-slate-400 mt-1.5">/ pc</span>
                </div>
              </div>
              <div className="col-span-4 pl-6 border-l border-gray-100">
                <button onClick={() => setIsExportOpen(true)} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition-all shadow-lg group text-lg">
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" /> 生成多方案 PDF 报价单
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 霸道纠错指令弹窗 (左边只读，右边发号施令) */}
      {isFixModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600" /> 指挥 AI 重新调校方案</h3>
              <button onClick={() => setIsFixModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* 左侧：只读参考数据 */}
              <div className="w-1/2 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto">
                <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-lg font-bold mb-4 flex items-center gap-1.5">
                  <AlertCircle size={14}/> 左侧为当前 AI 设定的基准数据，仅供您决策参考。
                </div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">当前主材设定 (以 Plan A 为例)：</h4>
                <div className="space-y-2 mb-6">
                  {editableBom.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-white p-2.5 rounded border border-slate-100 shadow-sm">
                      <span className="text-slate-600 font-medium truncate pr-4">{item.item || item.name}</span>
                      <span className="text-slate-900 font-bold font-mono">${Number(item.cost).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">AI 原始逻辑：</h4>
                <p className="text-xs text-slate-500 leading-relaxed bg-white p-3 rounded border border-slate-100">
                  {localData.analysis_reasoning}
                </p>
              </div>

              {/* 右侧：老板指令下发区 */}
              <div className="w-1/2 bg-white p-8 flex flex-col relative">
                <h3 className="text-lg font-black text-slate-800 mb-2">老板，请指示：</h3>
                <p className="text-sm text-slate-500 mb-6">用大白话告诉 AI 需要怎么改，AI 会自动联动修改 A/B/C 三个方案的成本和工艺单。</p>
                
                <textarea 
                  value={fixNote}
                  onChange={(e) => setFixNote(e.target.value)}
                  placeholder="例如：
1. 面料算错了，应该是 100% 涤纶，成本降一半。
2. 尺寸要加大到 50x50cm，加大耗料。
3. 客户不要任何包装，去掉包装费。"
                  className="flex-1 w-full bg-slate-50 border border-indigo-100 rounded-2xl p-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none text-base leading-relaxed transition-all shadow-inner"
                />

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleSubmitFix}
                    disabled={isAiFixing || !fixNote.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 w-full justify-center text-lg active:scale-95"
                  >
                    {isAiFixing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Wand2 size={20} /> 立即全案重算 <ArrowRight size={20}/></>}
                  </button>
                </div>
              </div>
            </div>
            
            {/* 全屏 Loading 遮罩层 (重算时显示) */}
            {isAiFixing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                 <h2 className="text-xl font-bold text-slate-800 mb-2">AI 正在全局重算...</h2>
                 <p className="text-slate-500 text-sm">正在为您同步调校 A/B/C 三个方案，这可能需要 20-30 秒</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ExportPreviewModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} quoteData={{...localData, bom: editableBom, margin: margin, final_price: calculatedTotal, moq: moq }} />
    </>
  );
}
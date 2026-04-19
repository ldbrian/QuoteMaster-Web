import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react'; // 引入关闭图标

const PRO_TIPS = [
  "💡 老师傅经验：压铸铝件表面若需阳极氧化，务必确认材质含硅量，否则易出现黑斑。",
  "💡 避坑指南：报 FOB 价时，别忘了把国内拖车费和进仓费算进去，这是利润流失的隐形黑洞。",
  "💡 行业黑话：五金塑胶件的“一出几”直接决定单件成本，打样时需提前规划量产方案。",
  "💡 泡货预警：体积大轻的产品，提醒客户核算海运体积重，建议改用折叠包装省运费。",
  "💡 质检红线：出口欧美的金属件，务必提前和工厂确认是否能过 RoHS 环保指令。"
];

interface ActiveWaitingModalProps {
  isOpen: boolean;
}

export default function ActiveWaitingModal({ isOpen }: ActiveWaitingModalProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [userClosed, setUserClosed] = useState(false); // 🌟 新增：记录用户是否手动关闭

  // 每次 isOpen 从 false 变 true（新任务进来时），重置关闭状态
  useEffect(() => {
    if (isOpen) setUserClosed(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || userClosed) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, userClosed]);

  if (!isOpen || userClosed) return null; // 如果非打开状态，或者用户手动关了，就不渲染

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-6 relative animate-in zoom-in-95">
        
        {/* 🌟 退出按钮：让任务在后台继续跑 */}
        <button 
          onClick={() => setUserClosed(true)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
          title="最小化到后台"
        >
          <X size={18} />
        </button>

        <div className="relative flex justify-center items-center w-20 h-20">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
          <div className="relative bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">引擎正在拆解 BOM...</h3>
          <p className="text-sm text-slate-500">正在调取全球全网工厂数据库，预计需要 15-30 秒。<br/><span className="text-xs text-blue-500">您可以关闭此弹窗，核价将在后台继续进行。</span></p>
        </div>

        <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 min-h-[5rem] flex items-center justify-center transition-all duration-500 shadow-inner">
          <p className="text-sm font-medium text-blue-800 animate-fade-in-up" key={currentTipIndex}>
            {PRO_TIPS[currentTipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
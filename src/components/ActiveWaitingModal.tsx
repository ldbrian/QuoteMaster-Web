import React, { useState, useEffect } from 'react';

// 🌟 这里是你给论坛老哥们准备的“硬核诱饵”，可以随时增删
const PRO_TIPS = [
  "💡 老师傅经验：压铸铝件表面若需阳极氧化，务必确认材质含硅量，否则易出现黑斑。",
  "💡 避坑指南：报 FOB 价时，别忘了把国内拖车费和进仓费算进去，这是利润流失的隐形黑洞。",
  "💡 行业黑话：五金塑胶件的“一出几”（模具穴数）直接决定单件成本，打样时需提前规划量产方案。",
  "💡 泡货预警：体积大、重量轻的产品，务必提醒客户核算海运体积重，建议改用折叠包装省运费。",
  "💡 质检红线：出口欧美的金属件，务必提前和工厂确认是否能过 RoHS 环保指令。"
];

interface ActiveWaitingModalProps {
  isOpen: boolean;
}

export default function ActiveWaitingModal({ isOpen }: ActiveWaitingModalProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // 控制 Tip 轮播，每 4 秒切换一次
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-6">
        
        {/* 脉冲动画的雷达/齿轮图标 (Tailwind 实现极简动画) */}
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">QuoteMaster 引擎正在拆解 BOM...</h3>
          <p className="text-sm text-gray-500">正在调取全球全网工厂数据库，预计需要 15-30 秒</p>
        </div>

        {/* 核心区：Tip 轮播展示 */}
        <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 min-h-[5rem] flex items-center justify-center transition-all duration-500">
          <p className="text-sm font-medium text-blue-800 animate-fade-in-up">
            {PRO_TIPS[currentTipIndex]}
          </p>
        </div>
        
      </div>
    </div>
  );
}
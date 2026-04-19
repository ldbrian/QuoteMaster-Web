import React, { useState, useEffect } from 'react';
import { trackEvent } from '@/src/utils/analytics'; // 确保路径正确

interface QuoteFeedbackProps {
  inquiryId: string;
  category: string; 
}

export default function QuoteFeedback({ inquiryId, category }: QuoteFeedbackProps) {
  const [feedback, setFeedback] = useState<'none' | 'up' | 'down'>('none');
  const [isVisible, setIsVisible] = useState(true); // 🌟 新增：控制是否挂载

  const handleRate = (type: 'up' | 'down') => {
    if (feedback !== 'none') return;
    setFeedback(type);
    
    trackEvent('quote_feedback', {
      inquiry_id: inquiryId,
      category: category,
      rating: type === 'up' ? 'accurate' : 'inaccurate'
    });

    // 🌟 1.5秒后自动销毁组件
    setTimeout(() => {
      setIsVisible(false);
    }, 1500);
  };

  // 如果状态变为不可见，直接不渲染
  if (!isVisible) return null;

  return (
    <div className={`mt-2 flex flex-col sm:flex-row items-center justify-between text-sm transition-opacity duration-500 ${feedback !== 'none' ? 'opacity-80' : 'opacity-100'}`}>
      <span className="mb-3 sm:mb-0 text-slate-500 font-medium mr-6">
        {feedback === 'none' ? '这个核价结果准吗？您的反馈将帮助 AI 持续进化' : '感谢您的反馈！正在为您优化模型...'}
      </span>
      
      <div className="flex gap-3">
        <button
          onClick={() => handleRate('up')}
          disabled={feedback !== 'none'}
          className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all ${
            feedback === 'up' 
              ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 scale-105' 
              : 'bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 border border-slate-200'
          } ${feedback === 'down' ? 'hidden' : ''}`}
        >
          <span>👍</span> {feedback === 'up' ? '神准！' : '靠谱'}
        </button>

        <button
          onClick={() => handleRate('down')}
          disabled={feedback !== 'none'}
          className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all ${
            feedback === 'down' 
              ? 'bg-rose-100 text-rose-700 font-bold border border-rose-200 scale-105' 
              : 'bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200'
          } ${feedback === 'up' ? 'hidden' : ''}`}
        >
          <span>👎</span> {feedback === 'down' ? '已记录反馈' : '报偏了'}
        </button>
      </div>
    </div>
  );
}
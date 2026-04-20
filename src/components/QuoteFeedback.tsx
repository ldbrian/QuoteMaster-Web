import React, { useState, useEffect } from 'react';
import { trackEvent } from '@/src/utils/analytics'; 

interface QuoteFeedbackProps {
  inquiryId: string;
  category: string; 
}

export default function QuoteFeedback({ inquiryId, category }: QuoteFeedbackProps) {
  const [feedback, setFeedback] = useState<'none' | 'up' | 'down'>('none');
  
  // 🌟 初始状态设为 true (先藏起来)，避免页面刚加载时闪烁
  const [isHidden, setIsHidden] = useState(true); 
  const [hasChecked, setHasChecked] = useState(false); // 记录是否已经查过本地缓存

  // 🌟 新增：组件挂载时，去本地查一下有没有评价过这个 ID
  useEffect(() => {
    const ratedItems = JSON.parse(localStorage.getItem('rated_quotes') || '[]');
    if (!ratedItems.includes(inquiryId)) {
      setIsHidden(false); // 如果没评价过，才把它显示出来
    }
    setHasChecked(true);
  }, [inquiryId]);

  const handleRate = (type: 'up' | 'down') => {
    if (feedback !== 'none') return;
    setFeedback(type);
    
    // 1. 发送埋点到服务器
    trackEvent('quote_feedback', {
      inquiry_id: inquiryId,
      category: category,
      rating: type === 'up' ? 'accurate' : 'inaccurate'
    });

    // 🌟 2. 把这个 ID 记入小本本 (localStorage)
    const ratedItems = JSON.parse(localStorage.getItem('rated_quotes') || '[]');
    if (!ratedItems.includes(inquiryId)) {
      ratedItems.push(inquiryId);
      localStorage.setItem('rated_quotes', JSON.stringify(ratedItems));
    }

    // 3. 延迟 1.5 秒后自动隐藏组件
    setTimeout(() => {
      setIsHidden(true);
    }, 1500);
  };

  // 如果还没查完缓存，或者已经被标记为隐藏，直接不渲染
  if (!hasChecked || isHidden) return null;

  return (
    <div className={`mt-2 flex flex-col sm:flex-row items-center justify-between text-sm transition-opacity duration-500 ${feedback !== 'none' ? 'opacity-80' : 'opacity-100'}`}>
      <span className="mb-3 sm:mb-0 text-slate-500 font-medium mr-6">
        {feedback === 'none' ? '这个核价结果准吗？您的反馈将帮助 AI 持续进化' : '✅ 感谢反馈！正在为您优化模型...'}
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
import React, { useState } from 'react';
import { trackEvent } from '@/src/utils/analytics'; // 确保引入你的埋点函数

interface QuoteFeedbackProps {
  inquiryId: string;
  category: string; 
}

export default function QuoteFeedback({ inquiryId, category }: QuoteFeedbackProps) {
  const [feedback, setFeedback] = useState<'none' | 'up' | 'down'>('none');

  const handleRate = (type: 'up' | 'down') => {
    if (feedback !== 'none') return; // 防止重复点击
    setFeedback(type);
    
    // 🌟 触发埋点记录
    trackEvent('quote_feedback', {
      inquiry_id: inquiryId,
      category: category,
      rating: type === 'up' ? 'accurate' : 'inaccurate'
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
      <span className="mb-3 sm:mb-0">
        这个核价结果准吗？您的反馈将帮助 AI 持续进化
      </span>
      
      <div className="flex gap-3">
        <button
          onClick={() => handleRate('up')}
          disabled={feedback !== 'none'}
          className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors ${
            feedback === 'up' 
              ? 'bg-green-100 text-green-700 font-medium border border-green-200' 
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-transparent'
          } ${feedback === 'down' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>👍</span> {feedback === 'up' ? '神准！' : '靠谱'}
        </button>

        <button
          onClick={() => handleRate('down')}
          disabled={feedback !== 'none'}
          className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors ${
            feedback === 'down' 
              ? 'bg-red-100 text-red-700 font-medium border border-red-200' 
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-transparent'
          } ${feedback === 'up' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>👎</span> {feedback === 'down' ? '已记录反馈' : '报偏了'}
        </button>
      </div>
    </div>
  );
}
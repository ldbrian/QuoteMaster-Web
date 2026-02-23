'use client';

import React, { useEffect, useState } from 'react';
import { X, DollarSign, Cpu, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/src/utils/supabase/client';

interface QuoteDetailPanelProps {
  isOpen: boolean;
  inquiryId: string | null;
  onClose: () => void;
}

export default function QuoteDetailPanel({ isOpen, inquiryId, onClose }: QuoteDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [inquiry, setInquiry] = useState<any>(null);
  const [aiMessage, setAiMessage] = useState<any>(null);

  useEffect(() => {
    if (isOpen && inquiryId) {
      fetchDetails();
    } else {
      // 重置状态
      setInquiry(null);
      setAiMessage(null);
    }
  }, [isOpen, inquiryId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // 1. 获取询盘基础信息
      const { data: inquiryData } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .single();
      
      // 2. 获取 AI 的最新回复 (包含 quote_data JSON)
      const { data: messageData } = await supabase
        .from('messages')
        .select('*')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setInquiry(inquiryData);
      setAiMessage(messageData);
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  // 控制抽屉滑入滑出的 CSS 类
  const panelClasses = `fixed inset-y-0 right-0 z-50 w-full md:w-[500px] bg-white shadow-2xl border-l border-slate-100 transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  const quoteData = aiMessage?.quote_data || {};
  const bomList = quoteData.bom || [];

  return (
    <>
      {/* 黑色半透明背景遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* 抽屉面板 */}
      <div className={panelClasses}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin" /> Loading details...
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Quote Details
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* 内容区可以滚动 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* 顶部：图片 + 核心报价 */}
              <div className="flex gap-6 items-start">
                <div className="w-28 h-28 shrink-0 bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200">
                  {inquiry?.thumbnail_url ? (
                    <img src={inquiry.thumbnail_url} alt="Product" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">No Img</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                    {inquiry?.product_name || 'Analyzing...'}
                  </h3>
                  <div className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 mb-3">
                    {inquiry?.status}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-blue-600 leading-none">
                      ${inquiry?.estimated_value || '0.00'}
                    </span>
                    <span className="text-xs font-bold text-slate-400 mb-1">FOB</span>
                  </div>
                </div>
              </div>

              {/* AI 分析小作文 (Reasoning) */}
              {quoteData.analysis_reasoning && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 relative overflow-hidden">
                  <Cpu size={80} className="absolute -right-4 -bottom-4 text-blue-100/50" />
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Cpu size={14} /> AI Analysis
                  </h4>
                  <p className="text-sm text-blue-900/80 leading-relaxed relative z-10">
                    {quoteData.analysis_reasoning}
                  </p>
                </div>
              )}

              {/* BOM (物料清单) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cost Breakdown (BOM)</h4>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                      <tr>
                        <th className="px-4 py-2.5">Item</th>
                        <th className="px-4 py-2.5 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bomList.length > 0 ? (
                        bomList.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-700">{item.item}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              ${item.cost?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                            No detailed BOM available.
                          </td>
                        </tr>
                      )}
                      {/* 总计行 */}
                      <tr className="bg-slate-50 font-bold">
                        <td className="px-4 py-3 text-slate-700 text-right">Estimated Total Cost:</td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          ${quoteData.total_cost?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
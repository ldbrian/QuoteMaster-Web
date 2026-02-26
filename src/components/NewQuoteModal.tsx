'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, FileImage } from 'lucide-react';
import { supabase } from '@/src/utils/supabase/client'; 

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewQuoteModal({ isOpen, onClose, onSuccess }: NewQuoteModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!file) return alert('Please upload an image first');
    setUploading(true);

    try {
      // 1. 上传图片到 Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inquiry-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. 获取图片公开链接
      const { data: { publicUrl } } = supabase.storage
        .from('inquiry-images')
        .getPublicUrl(fileName);

      // 3. 在数据库创建新询盘，状态设为 analyzing
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: 'Analyzing...', 
          source: 'Dashboard Upload',
          status: 'analyzing',
          thumbnail_url: publicUrl,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. 发送给后端大模型计算
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_prompt", note);
      let response;
      let result;

      try {
        // 第一次尝试拨号
        response = await fetch("https://api.toughlove.online/api/get_quote", {
          method: "POST",
          body: formData,
        });
      } catch (firstError) {
        // 🚨 触发僵尸连接拦截！
        console.warn("⚠️ 检测到休眠断联，正在自动建立新连接重试...", firstError);
        // 毫不犹豫地进行第二次“全新拨号”
        response = await fetch("https://api.toughlove.online/api/get_quote", {
          method: "POST",
          body: formData,
        });
      }

      // 如果重试了还是不行，或者后端返回了 500 等错误码
      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status}`);
      }
      
      result = await response.json();
      console.log("🎉 AI 估价成功返回:", result);

      // 5. 🚀 关键修复：把 AI 的结果更新到 Supabase 数据库！
      if (result && !result.error) {
        // 5.1 更新主订单状态（解除 analyzing 状态，更新真实价格）
        await supabase
          .from('inquiries')
          .update({
            status: 'quoted', // 状态改为已报价
            product_name: result.product_name || 'AI Quoted Item',
            estimated_value: result.final_price || result.total_cost || 0,
          })
          .eq('id', newInquiry.id);

        // 5.2 把详细的 BOM 表和分析理由存入 messages 表（供详情页展示）
        const aiReply = `根据您的图片分析：\n\n【成本估算】\n${result.analysis_reasoning}\n\n最终FOB报价: $${result.final_price}`;
        await supabase.from('messages').insert({
          inquiry_id: newInquiry.id,
          role: 'assistant',
          content: aiReply,
          quote_data: result // 把整个 json 存进去
        });
      } else {
        // 如果后端报错，把状态改为 failed
        await supabase.from('inquiries').update({ status: 'failed' }).eq('id', newInquiry.id);
      }

      // 6. 成功回调，关闭弹窗，刷新主界面
      onSuccess();
      onClose();
      setFile(null);
      setNote('');
      
    } catch (error: any) {
      console.error('Full error:', error);
      alert('Upload or analysis failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false); // 永远别忘了关掉转圈圈
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">New AI Quote</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* 图片上传区 */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex flex-col items-center text-blue-600">
                <FileImage size={40} className="mb-2" />
                <p className="text-sm font-medium text-center px-4 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-blue-400 mt-1">Click to replace</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">Click or Drag to upload</p>
                <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 5MB)</p>
              </>
            )}
          </div>

          {/* 需求输入框 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Modification Request</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. Change fabric to organic cotton, add embroidery logo on chest..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[100px] resize-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : 'Start AI Analysis'}
          </button>
        </div>

      </div>
    </div>
  );
}
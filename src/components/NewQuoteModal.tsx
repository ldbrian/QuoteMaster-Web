'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, FileImage } from 'lucide-react';
import { supabase } from '@/src/utils/supabase/client'; // 使用您修正后的路径

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 上传成功后回调
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
        .from('inquiry-images') // 确保这里是你创建的 Bucket 名字
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. 获取图片公开链接
      const { data: { publicUrl } } = supabase.storage
        .from('inquiry-images')
        .getPublicUrl(fileName);

      // 3. 在数据库创建新询盘，并立即拿回 ID
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: 'Analyzing...', 
          source: 'Dashboard Upload',
          status: 'analyzing',
          thumbnail_url: publicUrl,
          // 如果你的数据库有 note 字段，可以在这里加：note: note
        })
        .select() // 👈 关键：加上这个才能返回数据
        .single(); // 👈 关键：只返回一条

      if (dbError) throw dbError;

      // 4. 🚀 触发后端 AI 分析 (Fire and Forget)
      // 注意：这里我们只管触发，不等待 AI 返回结果，以免前端卡顿
      try {
        await fetch('http://127.0.0.1:8000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiry_id: newInquiry.id,
            image_url: publicUrl,
            user_note: note
          })
        });
      } catch (err) {
        console.error('Failed to trigger AI backend:', err);
        // 这里不 throw error，因为数据已经存库了，不算完全失败
      }

      // 5. 成功回调
      onSuccess();
      onClose();
      setFile(null);
      setNote('');
      
    } catch (error: any) {
      console.error('Full error:', error);
      alert('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
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

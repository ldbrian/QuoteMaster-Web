'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, FileImage, Trash2 } from 'lucide-react';
import { supabase } from '@/src/utils/supabase/client'; 
import imageCompression from 'browser-image-compression';

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_IMAGES = 4; // CTO 设定：最多 4 张

export default function NewQuoteModal({ isOpen, onClose, onSuccess }: NewQuoteModalProps) {
  const [files, setFiles] = useState<File[]>([]); 
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > MAX_IMAGES) {
      alert(`老板/业务员，最多只能上传 ${MAX_IMAGES} 张图片哦！`);
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // 删除单张缩略图
  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return alert('请至少上传一张产品图片');
    setUploading(true);

    try {
      // 并发压缩多张图片
      const options = {
        maxSizeMB: 0.5, 
        maxWidthOrHeight: 1920, 
        useWebWorker: true,
        fileType: 'image/jpeg', 
        initialQuality: 0.8     
      };
      
      console.log(`开始并发压缩 ${files.length} 张图片...`);
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, options)));

      // 并发上传图片到 Supabase
      const uploadPromises = compressedFiles.map(async (compressedFile, index) => {
        const fileName = `${Date.now()}-${index}.jpg`;
        const { data, error } = await supabase.storage
          .from('inquiry-images')
          .upload(fileName, compressedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('inquiry-images')
          .getPublicUrl(fileName);
          
        return publicUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);
      console.log('所有图片上传完毕，链接:', imageUrls);

      // 在数据库创建新询盘
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: '分析中...', 
          source: '工作台上传',
          status: 'analyzing',
          thumbnail_url: imageUrls[0], 
          image_urls: imageUrls 
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 触发 Python 异步后台任务
      let res;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await fetch("https://api.toughlove.online/api/get_quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inquiry_id: newInquiry.id,
              image_urls: imageUrls, 
              user_prompt: note
            }),
          });
          
          if (res.ok) break;
          throw new Error(`状态码异常: ${res.status}`);
        } catch (error) {
          if (attempt === 3) throw error; 
          console.warn(`⚠️ 网络闪断 (尝试 ${attempt}/3)，0.5秒后静默重试...`);
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
      }

      onSuccess();
      onClose();
      setFiles([]);
      setNote('');
      
    } catch (error: any) {
      console.error('Full error:', error);
      alert('上传或分析失败: ' + (error.message || '未知错误'));
      setUploading(false);
    } 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">新建 AI 多图核价</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* 多图上传区 */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:border-blue-400 transition-all min-h-[160px]">
            {files.length > 0 ? (
              <div className="w-full">
                {/* 缩略图网格 */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeFile(index)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {/* 继续添加按钮 */}
                  {files.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 text-slate-400 transition-colors">
                      <Upload size={20} />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-center text-slate-500">已选择 {files.length}/{MAX_IMAGES} 张图片</p>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer w-full py-6">
                <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">点击上传产品多视图</p>
                <p className="text-xs text-slate-400 mt-1">支持正反面、细节图 (最多 {MAX_IMAGES} 张)</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          {/* 🌟 补回来的：AI Supported Categories Prompt */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed shadow-sm">
            <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              💡 AI 智能核价支持品类：
            </p>
            <ul className="list-disc list-inside ml-1 text-slate-500 space-y-1 text-xs">
              <li><strong className="text-slate-600">服装：</strong>T恤、卫衣、外套、长短裤、裙装等</li>
              <li><strong className="text-slate-600">箱包：</strong>帆布袋、托特包、背包等</li>
              <li><strong className="text-slate-600">帽类与配饰：</strong>棒球帽、针织帽、围巾、手套等</li>
            </ul>
            <p className="mt-2 text-[11px] text-slate-400 italic leading-tight">
              * 注：暂不支持五金、电子、注塑等非柔性制造品类的精准核价。
            </p>
          </div>

          {/* 需求输入框 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">客户特殊要求/修改备注</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：请综合分析正面图案和背面刺绣，核算综合成本..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[100px] resize-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : '开始 AI 综合核价'}
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, FileImage } from 'lucide-react';
import { supabase } from '@/src/utils/supabase/client'; 
import imageCompression from 'browser-image-compression';

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
    if (!file) return alert('请先上传一张图片');
    setUploading(true);

    try {
      // 🌟 核心防线：在上传前，狠狠地压缩它！
      console.log('压缩前大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      // 🌟 核心防线：不仅压缩，强制转换所有图片为标准 JPG 格式！
      const options = {
        maxSizeMB: 0.5, 
        maxWidthOrHeight: 1920, 
        useWebWorker: true,
        fileType: 'image/jpeg', // 👈 新增：强制剥离 PNG 透明层，拍扁成 JPG
        initialQuality: 0.8     // 👈 新增：控制画质，进一步缩小体积
      };
      
      const compressedFile = await imageCompression(file, options);
      console.log('转换并压缩后大小:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');

      // 1. 上传【压缩后】的图片到 Supabase
      // 👈 抛弃原图后缀，直接写死为 .jpg，确保后端和 AI 拿到的绝对是 JPG！
      const fileName = `${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inquiry-images')
        .upload(fileName, compressedFile); // 👈 这里改传 compressedFile

      if (uploadError) throw uploadError;

      // 2. 获取图片公开链接
      const { data: { publicUrl } } = supabase.storage
        .from('inquiry-images')
        .getPublicUrl(fileName);

      // 3. 在数据库创建新询盘
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: '分析中...', 
          source: '工作台上传',
          status: 'analyzing',
          thumbnail_url: publicUrl,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. 🚀 触发 Python 异步后台任务 
      // 🚀 终极防断连装甲：最多尝试 3 次发包
      let res;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await fetch("https://api.toughlove.online/api/get_quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inquiry_id: newInquiry.id,
              image_url: publicUrl,
              user_prompt: note
            }),
          });
          
          if (res.ok) {
            console.log(`🎉 第 ${attempt} 次请求成功！`);
            break; // 一旦成功，立刻跳出循环
          } else {
            throw new Error(`状态码异常: ${res.status}`);
          }
        } catch (error) {
          if (attempt === 3) {
            // 如果 3 次都失败了，那才是真死了，抛出错误给外层的 catch
            throw error; 
          }
          console.warn(`⚠️ 网络闪断 (尝试 ${attempt}/3)，0.5秒后静默重试...`);
          // 核心魔法：停顿 0.5 秒，让浏览器强制建立一条新的 TCP 通道
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
      }

      // 5. 瞬间关闭弹窗
      onSuccess();
      onClose();
      setFile(null);
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
          <h3 className="font-bold text-slate-800">新建 AI 核价</h3>
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
                <p className="text-xs text-blue-400 mt-1">点击替换图片</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">点击或拖拽上传图片</p>
                <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG (最大 5MB)</p>
              </>
            )}
          </div>
          
          {/* 🌟 AI Supported Categories Prompt */}
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
              placeholder="例如：面料换成有机棉，胸前加一个刺绣 Logo..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[100px] resize-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : '开始 AI 智能核价'}
          </button>
        </div>

      </div>
    </div>
  );
}
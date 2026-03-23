'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2, Sparkles, PlayCircle } from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
import imageCompression from 'browser-image-compression';

// 🌟 核心机密：提前焊死的完美演示数据
const DEMO_CASES = [
  {
    id: "demo-1",
    title: "高定棒球帽",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-1",
      product_name: "Premium Cotton Baseball Cap with 3D Embroidery",
      analysis_reasoning: "通过图像分析：\n1. 材质为高克重纯棉斜纹布（约 10x10 纱支）。\n2. 正面包含高密度的 3D 立体刺绣 Logo。\n3. 配件包含定制金属调节扣及内里吸汗带。\n整体工艺属于中高端品质。",
      moq: "1000",
      bom: [
        { name: "100% Cotton Twill Fabric (纯棉斜纹面料)", cost: 0.45 },
        { name: "3D Logo Embroidery (正面立体刺绣)", cost: 0.35 },
        { name: "Metal Buckle & Eyelets (金属调节扣与透气孔)", cost: 0.15 },
        { name: "Inner Sweatband & Taping (内里吸汗带与包边)", cost: 0.20 },
        { name: "Cut & Sew Labor (裁剪与车缝人工)", cost: 0.60 },
        { name: "Standard Polybag & Carton (标准包装)", cost: 0.10 }
      ],
      margin: 0.45,
      final_price: 2.30
    }
  },
  {
    id: "demo-2",
    title: "不锈钢保温杯",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-2",
      product_name: "500ml Stainless Steel Vacuum Flask with Silicone Sleeve",
      analysis_reasoning: "通过图像分析：\n1. 杯身采用双层 304/316 不锈钢抽真空工艺。\n2. 表面处理为哑光喷塑。\n3. 底部与手握处配有定制开模的防滑硅胶套。\n此品类模具费用较高，需特别注意起订量。",
      moq: "3000",
      bom: [
        { name: "304 Stainless Steel Inner & Outer (双层不锈钢杯身)", cost: 1.80 },
        { name: "Vacuum Insulation Process (抽真空工艺费)", cost: 0.40 },
        { name: "Powder Coating Finish (表面哑光喷塑)", cost: 0.35 },
        { name: "Custom Silicone Sleeve (定制防滑硅胶套)", cost: 0.65 },
        { name: "PP Lid with Rubber Seal (PP杯盖)", cost: 0.45 },
        { name: "Assembly & Color Box (组装与彩盒包装)", cost: 0.35 }
      ],
      margin: 0.80,
      final_price: 4.80
    }
  },
  {
    id: "demo-3",
    title: "黄麻托特包",
    image: "https://images.unsplash.com/photo-1597348989645-46b190ce4918?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-3",
      product_name: "Eco-friendly Jute Tote Bag with Cotton Handles",
      analysis_reasoning: "通过图像分析：\n1. 主体面料为天然粗黄麻布（Jute），内里可能带有防水覆膜（PE Coating）。\n2. 提手为加厚纯棉织带，十字车缝加固。\n3. 正面有单色丝网印刷 Logo。\n属于典型的快消促销品，材料成本低，主要拼人工。",
      moq: "5000",
      bom: [
        { name: "Natural Jute Fabric w/ PE Lamination (黄麻布含覆膜)", cost: 0.65 },
        { name: "Cotton Webbing Handles (纯棉手提带)", cost: 0.25 },
        { name: "1-Color Silkscreen Print (单色丝网印刷)", cost: 0.12 },
        { name: "Sewing Labor (车缝人工)", cost: 0.35 },
        { name: "Bulk Packing (大货捆扎包装)", cost: 0.08 }
      ],
      margin: 0.30,
      final_price: 1.75
    }
  }
];

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSelectDemo?: (demoData: any) => void; 
}

const MAX_IMAGES = 4;

export default function NewQuoteModal({ isOpen, onClose, onSuccess, onSelectDemo }: NewQuoteModalProps) {
  const [files, setFiles] = useState<File[]>([]); 
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 🌟 CTO：拉取当前用户的 ID，用于后续扣费
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > MAX_IMAGES) {
      alert(`老板/业务员，最多只能上传 ${MAX_IMAGES} 张图片哦！`);
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // 🌟 覆盖替换 handleSubmit 函数
  const handleSubmit = async () => {
    if (files.length === 0) return alert('请至少上传一张产品图片');
    if (!userId) return alert('用户身份异常，请刷新页面重试');
    
    setUploading(true);

    try {
      // ... (保留前面压缩和上传图片的代码，不要动) ...
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 };
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, options)));

      const uploadPromises = compressedFiles.map(async (compressedFile, index) => {
        const fileName = `${Date.now()}-${index}.jpg`;
        const { error } = await supabase.storage.from('inquiry-images').upload(fileName, compressedFile);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('inquiry-images').getPublicUrl(fileName);
        return publicUrl;
      });
      const imageUrls = await Promise.all(uploadPromises);

      // 🌟 核心：直接插入数据库，把用户的备注也存进去。状态设为 analyzing，唤醒后台 Worker！
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: '分析中...', 
          source: '工作台上传',
          status: 'analyzing',  // <--- 极其关键的触发开关
          thumbnail_url: imageUrls[0], 
          image_urls: imageUrls,
          user_prompt: note     // 把用户写的需求传给 Worker
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 🌟 扣费执行
      const { error: rpcError } = await supabase.rpc('increment_usage_count', { user_id: userId });
      if (rpcError) console.error("扣费执行失败:", rpcError);

      onSuccess();
      onClose();
      setFiles([]);
      setNote('');
      
    } catch (error: any) {
      console.error('Full error:', error);
      alert('网络或上传异常，请重试');
      setUploading(false);
    } 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-slate-800">新建 AI 多图核价</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body (可滚动区域) */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* 多图上传区 */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:border-blue-400 transition-all min-h-[140px]">
            {files.length > 0 ? (
              <div className="w-full">
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
              <label className="flex flex-col items-center cursor-pointer w-full py-4">
                <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">点击上传产品多视图</p>
                <p className="text-xs text-slate-400 mt-1">支持细节图 (最多 {MAX_IMAGES} 张)</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          {/* 需求输入框 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">客户特殊要求/修改备注</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：请综合分析正面图案和背面刺绣..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px] resize-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : '开始 AI 综合核价'}
          </button>

          {/* 🌟 核心杀招：Aha Moment 横向滑动演示区 */}
          <div className="pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">没图片？点这里体验极速秒算</p>
            </div>
            
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {DEMO_CASES.map((demo) => (
                <div 
                  key={demo.id} 
                  onClick={() => {
                    if (onSelectDemo) {
                      onSelectDemo(demo.quoteData);
                      onClose(); 
                    }
                  }}
                  className="shrink-0 w-[140px] group relative rounded-xl overflow-hidden cursor-pointer snap-start border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all bg-slate-50"
                >
                  <div className="h-[90px] overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                    </div>
                    <img src={demo.image} alt={demo.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-xs font-bold text-slate-800 truncate">{demo.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
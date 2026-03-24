'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2, Sparkles, PlayCircle } from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
import imageCompression from 'browser-image-compression';

// 🌟 核心机密：已同步最新 A/B/C 三阶方案架构的完美演示数据
const DEMO_CASES = [
  {
    id: "demo-1",
    title: "高定棒球帽",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-1",
      product_name: "Premium Cotton Baseball Cap with 3D Embroidery",
      analysis_reasoning: "通过图像分析：材质为高克重纯棉斜纹布，正面含高密度 3D 立体刺绣 Logo。整体工艺属于中高端品质，已为您生成三阶核价方案。",
      plans: {
        plan_a: {
          name: "Plan A (Cost-Effective / 极致性价比)",
          simplified_materials: "Standard cotton twill, regular flat embroidery instead of 3D, plastic buckle.",
          fob_price_range: "$1.40 - $1.60",
          moq: 2000,
          bom: [{ name: "Standard Cotton", cost: 0.30 }, { name: "Flat Embroidery", cost: 0.15 }, { name: "Plastic Buckle", cost: 0.05 }, { name: "Labor", cost: 0.40 }],
          margin: 0.35,
          factory_pitch: "工厂沟通：用常规全棉纱卡，刺绣改平绣，走电商跑量大货标准。"
        },
        plan_b: {
          name: "Plan B (Standard / 标准还原)",
          simplified_materials: "Premium 100% cotton twill, high-density 3D logo embroidery, metal adjustable buckle.",
          fob_price_range: "$2.10 - $2.40",
          moq: 1000,
          bom: [{ name: "Premium Cotton Twill", cost: 0.45 }, { name: "3D Embroidery", cost: 0.35 }, { name: "Metal Buckle", cost: 0.15 }, { name: "Labor", cost: 0.60 }],
          margin: 0.45,
          factory_pitch: "工厂沟通：严格按照原图还原，3D刺绣要饱满，五金配件用防锈电镀。"
        },
        plan_c: {
          name: "Plan C (Premium / 高端品牌线)",
          simplified_materials: "Heavyweight brushed cotton, 3D embroidery with custom inner taping and branded tags.",
          fob_price_range: "$3.20 - $3.80",
          moq: 500,
          bom: [{ name: "Heavyweight Cotton", cost: 0.65 }, { name: "Complex 3D Embroidery", cost: 0.50 }, { name: "Custom Taping & Tags", cost: 0.45 }, { name: "Premium Labor", cost: 0.80 }],
          margin: 0.55,
          factory_pitch: "工厂沟通：走精品线，内里做全包边印logo，所有走线必须完美，按日本单质检标准。"
        }
      }
    }
  },
  {
    id: "demo-2",
    title: "不锈钢保温杯",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-2",
      product_name: "500ml Stainless Steel Vacuum Flask",
      analysis_reasoning: "通过图像分析：杯身采用双层不锈钢抽真空工艺，带有定制硅胶套。开模成本较高。",
      plans: {
        plan_a: {
          name: "Plan A (Cost-Effective)",
          simplified_materials: "201 Stainless steel outer, 304 inner, standard painted finish.",
          fob_price_range: "$2.80 - $3.20",
          moq: 3000,
          bom: [{ name: "201/304 Steel", cost: 1.20 }, { name: "Standard Paint", cost: 0.20 }, { name: "Labor", cost: 0.80 }],
          margin: 0.30,
          factory_pitch: "工厂沟通：外201内304，普通喷漆，不带硅胶套，冲价格底线。"
        },
        plan_b: {
          name: "Plan B (Standard)",
          simplified_materials: "Double wall 304 stainless steel, powder coating, silicone sleeve.",
          fob_price_range: "$4.50 - $4.90",
          moq: 1500,
          bom: [{ name: "Dual 304 Steel", cost: 1.80 }, { name: "Powder Coating", cost: 0.35 }, { name: "Silicone Sleeve", cost: 0.65 }, { name: "Labor", cost: 0.80 }],
          margin: 0.40,
          factory_pitch: "工厂沟通：内外304，哑光喷塑，硅胶套开模具，保证过 FDA 测试。"
        },
        plan_c: {
          name: "Plan C (Premium)",
          simplified_materials: "316 Medical grade stainless steel inner, ceramic coating, custom sleeve.",
          fob_price_range: "$6.50 - $7.20",
          moq: 1000,
          bom: [{ name: "316 Inner/304 Outer", cost: 2.50 }, { name: "Ceramic Inner Coating", cost: 0.90 }, { name: "Premium Sleeve", cost: 0.80 }, { name: "Labor", cost: 1.00 }],
          margin: 0.50,
          factory_pitch: "工厂沟通：内胆升级316加陶瓷涂层，保温保冷时效要求达到 24 小时以上。"
        }
      }
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
      alert(`最多只能上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return alert('请至少上传一张产品图片');
    if (!userId) return alert('用户身份异常，请刷新页面重试');
    
    setUploading(true);

    try {
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

      // 🔴 修复点：严格遵守状态机契约，写入 'pending'
      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: 'AI 深度解析中...', 
          source: '工作台上传',
          status: 'pending',    // <--- 修复 23514 错误的核心
          thumbnail_url: imageUrls[0], 
          image_urls: imageUrls,
          user_prompt: note
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 扣费执行
      const { error: rpcError } = await supabase.rpc('increment_usage_count', { user_id: userId });
      if (rpcError) console.error("扣费执行失败:", rpcError);

      onSuccess();
      onClose();
      setFiles([]);
      setNote('');
      
    } catch (error: any) {
      console.error('上传异常:', error);
      alert('系统繁忙，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-slate-800">新建 AI 多套核价方案</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* 上传区 */}
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
                <p className="text-xs text-center text-slate-500">已选择 {files.length}/{MAX_IMAGES} 张</p>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer w-full py-4">
                <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">点击上传产品细节图</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          {/* 需求框 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">客户要求 / 改动点</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：预算有限，出个低配版方案；或者：要求按最高标准打样..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px] resize-none"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : '触发 AI 引擎'}
          </button>

          {/* 演示数据区 */}
          <div className="pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">演示数据 (已适配三阶方案)</p>
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
                      <PlayCircle className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2, Sparkles, PlayCircle, ShieldCheck, Zap, Crown } from 'lucide-react'; 
import { supabase } from '@/src/utils/supabase/client'; 
import imageCompression from 'browser-image-compression';
import { trackEvent } from '@/src/utils/analytics'; // 引入埋点发报机

// 🌟 核心机密：提前焊死的完美演示数据 (已升级至 v2 动态多方案引擎架构)
const DEMO_CASES = [
  {
    id: "demo-1",
    title: "高定棒球帽",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-1",
      product_name: "Premium Cotton Baseball Cap with 3D Embroidery",
      analysis_reasoning: "诊断：典型的欧美街头高街风 (Streetwear)，目前在 TikTok 搜索热度极高。材质为高克重纯棉斜纹布，正面含高密度 3D 立体刺绣 Logo。整体工艺属于中高端品质，已为您生成高低搭配两套方案以锁定不同预算的客户。",
      plans: {
        plan_a: {
          name: "方案 A (标准原版还原)",
          simplified_materials: "Premium 100% heavy cotton twill, high-density 3D embroidery logo, custom metal adjustable buckle. Perfect for high-end retail.",
          moq: 1000,
          bom: [
            { name: "100% Cotton Twill Fabric (纯棉斜纹面料)", cost: 0.45 },
            { name: "3D Logo Embroidery (正面立体刺绣)", cost: 0.35 },
            { name: "Metal Buckle & Eyelets (金属调节扣与透气孔)", cost: 0.15 },
            { name: "Cut & Sew Labor (裁剪与车缝人工)", cost: 0.60 }
          ],
          margin: 0.45,
          final_price: 2.80,
          factory_pitch: "老板，这个单子客户要求很高，严格按原版品质做。面料必须是纯棉重磅斜纹，3D刺绣要饱满不能露底。五金做无镍电镀。做好了后续翻单很大。"
        },
        plan_b: {
          name: "方案 B (电商跑量平替版)",
          simplified_materials: "Standard cotton twill, flat embroidery logo, plastic snapback closure. Cost-effective option for promotional events.",
          moq: 3000,
          bom: [
            { name: "T/C Twill Fabric (涤棉斜纹面料)", cost: 0.25 },
            { name: "Flat Embroidery (普通平绣)", cost: 0.15 },
            { name: "Plastic Snapback (塑料排扣)", cost: 0.05 },
            { name: "Cut & Sew Labor (裁剪与车缝人工)", cost: 0.45 }
          ],
          margin: 0.35,
          final_price: 1.38,
          factory_pitch: "走跨境电商的跑量单，价格压得很死。面料换成便宜的涤棉，刺绣改成普通平绣，后扣换塑料的。车工不需要太精细，别有大瑕疵就行，帮我把成本卡在 6 块钱人民币以内。"
        }
      }
    }
  },
  {
    id: "demo-2",
    title: "黄麻托特包",
    image: "https://images.unsplash.com/photo-1597348989645-46b190ce4918?auto=format&fit=crop&w=400&q=80",
    quoteData: {
      id: "demo-q-3",
      product_name: "Eco-friendly Jute Tote Bag",
      analysis_reasoning: "诊断：典型的环保快消促销品 (Eco-Promo)。结构简单，主拼人工与走量。客户预算明确，因此仅提供 1 套跑量极致性价比方案。",
      plans: {
        plan_a: {
          name: "极致性价比版 (跑量)",
          simplified_materials: "100% Natural Jute fabric with PE inner lamination for water resistance. Soft cotton webbing handles. Ideal for grocery shopping and eco-promotions.",
          moq: 5000,
          bom: [
            { name: "Natural Jute w/ PE Lamination (黄麻布含覆膜)", cost: 0.65 },
            { name: "Cotton Webbing Handles (纯棉手提带)", cost: 0.25 },
            { name: "1-Color Silkscreen Print (单色丝网印刷)", cost: 0.12 },
            { name: "Sewing Labor (车缝人工)", cost: 0.35 }
          ],
          margin: 0.25,
          final_price: 1.82,
          factory_pitch: "展会急单，一次性发 5000 个。不需要精细包装，大货直接蛇皮袋捆扎装箱。印刷只要不掉色就行。厂长给我个最低包工包料底价，这单全靠走量赚钱。"
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
  
  // 🌟 新增：拦截收费站状态
  const [showTollbooth, setShowTollbooth] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    if (isOpen) {
      fetchUser();
      setShowTollbooth(false); // 每次打开重置拦截器
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

  // 🌟 拦截器：点击触发按钮时先拦截
  const handleTriggerAI = () => {
    if (files.length === 0) return alert('请至少上传一张产品图片');
    if (!userId) return alert('用户身份异常，请刷新页面重试');
    // 弹出收费确认页面
    setShowTollbooth(true);
  };

  // 🌟 真正执行上传和扣费的逻辑
  const executeSubmit = async () => {
    setShowTollbooth(false);
    setUploading(true);
    // 📊 埋点 5：全站最核心动作！用户真正消耗算力发起了请求
    trackEvent('execute_ai_quote', { 
      image_count: files.length, 
      has_prompt: !!note 
    }, userId);

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

      const { data: newInquiry, error: dbError } = await supabase
        .from('inquiries')
        .insert({
          product_name: 'AI 深度解析中...', 
          source: '工作台上传',
          status: 'pending',    
          thumbnail_url: imageUrls[0], 
          image_urls: imageUrls,
          user_prompt: note
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 执行底层扣费 (调用 DB RPC)
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 relative z-10">
          <h3 className="font-bold text-slate-800">新建 AI 多套核价方案</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 relative z-10">
          
          {/* 上传区 */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 transition-all min-h-[140px]">
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
                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 text-slate-400 transition-colors bg-white">
                      <Upload size={20} />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-center text-slate-500 font-medium">已选择 {files.length}/{MAX_IMAGES} 张图片</p>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer w-full py-5">
                <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={22} className="text-blue-600" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">点击上传产品细节图</p>
                <p className="text-xs text-slate-400">支持正面、侧面及材质特写（最多4张）</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          {/* 需求框 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">客户要求 / 调整策略 (选填)</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：预算卡得很死，尽量压低 BOM 成本；或者：要求按欧洲顶级环保标准打样..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* 🌟 绿色盾牌：安全承诺预埋 */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900 mb-0.5">企业级隐私安全保障</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">您的图片与商业机密全程加密传输，仅用于本次核价演算，绝不用于公有模型训练或对第三方泄露。</p>
            </div>
          </div>

          <button 
            onClick={handleTriggerAI}
            disabled={uploading || files.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : '启动 AI 极速核价'}
          </button>

          {/* 演示数据区 */}
          <div className="pt-5 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">试试内置真实爆款 (免扣算力)</p>
            </div>
            
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {DEMO_CASES.map((demo) => (
                <div 
                  key={demo.id} 
                  onClick={() => {
                    // 📊 埋点 6：用户使用了演示数据体验功能
                    trackEvent('use_demo_case', { demo_id: demo.id }, userId);
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
                  <div className="p-2 text-center bg-white">
                    <p className="text-xs font-bold text-slate-800 truncate">{demo.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* 🌟 收费站拦截遮罩 (Tollbooth) */}
        {showTollbooth && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5 shadow-sm border-4 border-white">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">启动 AI 商业引擎</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed px-2">
              系统将通过大模型深度提取多图特征、精准拆解底层 BOM 成本，并为您智能生成高低搭配的多阶报价矩阵。
            </p>
            
            <div className="bg-slate-50 px-5 py-4 rounded-xl border border-slate-200 mb-8 w-full flex justify-between items-center shadow-inner">
              <span className="text-sm font-bold text-slate-600">本次操作消耗算力</span>
              <span className="font-black text-blue-600 flex items-center gap-1 text-lg">
                <Crown className="w-5 h-5" /> 1 次
              </span>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={executeSubmit} 
                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2 text-base"
              >
                确认扣除并解析
              </button>
              <button 
                onClick={() => setShowTollbooth(false)} 
                className="w-full py-3.5 bg-transparent text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                先不测了
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
import React from 'react';
import { PlayCircle, Sparkles, TrendingUp } from 'lucide-react';

// 🌟 核心机密：提前焊死的完美演示数据（不消耗 API 额度，瞬间加载！）
const DEMO_CASES = [
  {
    id: "demo-1",
    title: "高定款纯棉棒球帽",
    category: "服饰配饰 (Apparel)",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80", // 免费的高清网图
    tag: "最近爆款",
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
    title: "不锈钢保温杯 (带硅胶套)",
    category: "日用杂货 (Drinkware)",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80",
    tag: "高利润区",
    quoteData: {
      id: "demo-q-2",
      product_name: "500ml Stainless Steel Vacuum Flask with Silicone Sleeve",
      analysis_reasoning: "通过图像分析：\n1. 杯身采用双层 304/316 不锈钢抽真空工艺。\n2. 表面处理为哑光喷塑（Powder Coating）。\n3. 底部与手握处配有定制开模的防滑硅胶套。\n此品类模具费用较高，需特别注意起订量。",
      moq: "3000",
      bom: [
        { name: "304 Stainless Steel Inner & Outer (双层不锈钢杯身)", cost: 1.80 },
        { name: "Vacuum Insulation Process (抽真空工艺费)", cost: 0.40 },
        { name: "Powder Coating Finish (表面哑光喷塑)", cost: 0.35 },
        { name: "Custom Silicone Sleeve (定制防滑硅胶套)", cost: 0.65 },
        { name: "PP Lid with Rubber Seal (PP杯盖及密封圈)", cost: 0.45 },
        { name: "Assembly & Color Box (组装与彩盒包装)", cost: 0.35 }
      ],
      margin: 0.80,
      final_price: 4.80
    }
  },
  {
    id: "demo-3",
    title: "环保黄麻托特包",
    category: "箱包包装 (Bags)",
    image: "https://images.unsplash.com/photo-1597348989645-46b190ce4918?auto=format&fit=crop&w=400&q=80",
    tag: "小单快反",
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

export default function DemoShowcase({ onSelectDemo }: { onSelectDemo: (data: any) => void }) {
  return (
    <div className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-800">
          没有图片？先体验一下 <span className="text-blue-600">Aha Moment</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEMO_CASES.map((demo) => (
          <div 
            key={demo.id} 
            className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
            onClick={() => onSelectDemo(demo.quoteData)} // 🌟 点击直接把数据传给详情页！
          >
            {/* 标签 */}
            <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm text-gray-700 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-red-500" /> {demo.tag}
            </div>
            
            {/* 图片 */}
            <div className="h-40 overflow-hidden relative bg-gray-100">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-0"></div>
              <img 
                src={demo.image} 
                alt={demo.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* 悬浮的播放按钮 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg">
                  <PlayCircle className="w-4 h-4" /> 查看 AI 报价单
                </div>
              </div>
            </div>

            {/* 文字信息 */}
            <div className="p-4">
              <p className="text-xs text-blue-600 font-bold tracking-wider uppercase mb-1">{demo.category}</p>
              <h4 className="text-sm font-bold text-gray-900 mb-2">{demo.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">
                {demo.quoteData.analysis_reasoning.split('\n')[0]}...
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
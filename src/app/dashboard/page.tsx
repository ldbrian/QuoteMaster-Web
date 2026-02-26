'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/utils/supabase/client'; 
import NewQuoteModal from '@/src/components/NewQuoteModal'; 
import QuoteDetailPanel from '@/src/components/QuoteDetailPanel';
import { 
  Search, Bell, Plus, MoreVertical, 
  LayoutGrid, FileText, Users, MessageSquare, 
  BarChart2, Settings, Globe, Loader2
} from 'lucide-react';

// 状态标签映射
const statusMap: any = {
  converted: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  analyzing: "bg-blue-50 text-blue-600 border border-blue-100",
  quoted: "bg-purple-50 text-purple-600 border border-purple-100",
  pending: "bg-amber-50 text-amber-600 border border-amber-100",
};

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  
  // 🌟 核心新增：专门用来存放“合并后”的详细数据，传给抽屉
  const [detailData, setDetailData] = useState<any>(null); 

  // 数据拉取函数 (主列表只拉取轻量数据)
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // 🌟 核心新增：点击行的处理函数。先展示框架，再去捞取详细的 JSON
  const handleOpenDetail = async (lead: any) => {
    // 1. 瞬间打开抽屉，先把基础名字和总价传进去
    setSelectedInquiryId(lead.id);
    setDetailData(lead); 

    try {
      // 2. 悄悄去 messages 表里，把属于这个询盘的详细 AI 算价 JSON 捞出来
      const { data, error } = await supabase
        .from('messages')
        .select('quote_data')
        .eq('inquiry_id', lead.id)
        .not('quote_data', 'is', null) // 确保里面有 json
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      // 3. 如果捞到了，就把主表数据和详细 JSON 完美融合，再次喂给抽屉！
      if (data && data.length > 0 && data[0].quote_data) {
        setDetailData({
          ...lead,               // 原本的商品名等
          ...data[0].quote_data  // BOM数组、分析理由、最终报价等
        });
      }
    } catch (err) {
      console.error('Failed to fetch quote details:', err);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 relative">
      
      {/* 左侧导航 */}
      <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 mb-2">Q</div>
        <nav className="flex flex-col gap-4 w-full px-3">
          <NavItem icon={<LayoutGrid size={20} />} active />
          <NavItem icon={<FileText size={20} />} />
          <NavItem icon={<Users size={20} />} />
          <NavItem icon={<BarChart2 size={20} />} />
        </nav>
        <div className="mt-auto pb-4"><NavItem icon={<Settings size={20} />} /></div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-transparent">
          <div className="relative w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search leads..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full"><Bell size={18} /></button>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-full text-white flex items-center justify-center font-bold text-xs">SC</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Real-time data from Supabase.</p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={18} /> New AI Quote
            </button>
          </div>

          {/* 指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="Total Inquiries" value={leads.length} trend="Live" trendUp={true} />
            <StatCard label="Est. Value" value="$45,200" trend="+12%" trendUp={true} />
            <StatCard label="Pending" value="3" trend="Action Needed" trendUp={false} />
          </div>

          {/* 表格区域 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recent Inquiries</h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-400 gap-2">
                <Loader2 className="animate-spin" /> Loading data...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Region</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Est. Value</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leads.map((lead) => (
                      <TableRow 
                        key={lead.id}
                        img={lead.thumbnail_url ? <img src={lead.thumbnail_url} className="w-10 h-10 object-cover rounded-lg" /> : "📦"} 
                        name={lead.product_name || 'Unknown Item'} 
                        source={lead.source} 
                        region={lead.region} 
                        status={lead.status} 
                        price={lead.estimated_value ? `$${lead.estimated_value}` : '--'} 
                        // 🌟 修改：调用新的点击处理函数
                        onClick={() => handleOpenDetail(lead)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <NewQuoteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchLeads(); 
        }} 
      />
      
      {/* 🌟 核心修改：把新组合好的 detailData 喂给抽屉 */}
      <QuoteDetailPanel 
        isOpen={!!selectedInquiryId} 
        onClose={() => {
          setSelectedInquiryId(null);
          setDetailData(null); // 关闭时清空旧数据
        }} 
        quoteData={detailData} 
      />
    </div>
  );
}

// 子组件保持不变
function NavItem({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`flex items-center justify-center w-full h-10 rounded-lg cursor-pointer transition-all ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
      {icon}
    </div>
  );
}

function StatCard({ label, value, trend, trendUp }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-shadow">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function TableRow({ img, name, source, region, status, price, onClick }: any) {
  return (
    <tr onClick={onClick} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl shadow-inner overflow-hidden">{img}</div>
          <span className="font-semibold text-slate-700 text-sm">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">{source}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 uppercase tracking-wide">
          <Globe size={10} className="mr-1" /> {region}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${(statusMap as any)[status] || 'bg-slate-100 text-slate-500'}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-900">{price}</td>
      <td className="px-6 py-4 text-right">
        <button className="text-slate-300 hover:text-blue-600 transition-colors">
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
}
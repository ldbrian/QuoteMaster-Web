'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/utils/supabase/client'; 
import { useRouter } from 'next/navigation'; // 🌟 引入路由钩子
import NewQuoteModal from '@/src/components/NewQuoteModal'; 
import QuoteDetailPanel from '@/src/components/QuoteDetailPanel';
import { 
  Search, Bell, Plus, MoreVertical, LogOut, // 🌟 新增 LogOut 图标
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
  const [detailData, setDetailData] = useState<any>(null); 
  
  // 🌟 新增：存放当前登录用户的信息
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 🌟 核心新增：身份核验保安系统
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // 没登录？直接一脚踢到大门外
        router.push('/login');
      } else {
        // 登录了，记录下身份，然后去干活拉数据
        setUser(session.user);
        fetchLeads();
      }
    };
    checkAuth();
  }, [router]);

  // 数据拉取函数 
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

  // 点击行的处理函数
  const handleOpenDetail = async (lead: any) => {
    setSelectedInquiryId(lead.id);
    setDetailData(lead); 

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('quote_data')
        .eq('inquiry_id', lead.id)
        .not('quote_data', 'is', null) 
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].quote_data) {
        setDetailData({
          ...lead,               
          ...data[0].quote_data  
        });
      }
    } catch (err) {
      console.error('Failed to fetch quote details:', err);
    }
  };

  // 🌟 新增：敬请期待提示函数 (优雅阻挡非MVP功能)
  const handleComingSoon = () => {
    alert("🚧 功能正在紧张开发中，MVP 试用阶段敬请期待！");
  };

  // 🌟 新增：退出登录功能
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 🌟 防闪烁：如果还没验证完身份，显示全屏加载中
  if (!user) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-sm text-slate-500 font-medium">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 relative">
      
      {/* 左侧导航 - 🌟 拦截非MVP功能 */}
      <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 mb-2">Q</div>
        <nav className="flex flex-col gap-4 w-full px-3">
          <NavItem icon={<LayoutGrid size={20} />} active />
          <div onClick={handleComingSoon}><NavItem icon={<FileText size={20} />} /></div>
          <div onClick={handleComingSoon}><NavItem icon={<Users size={20} />} /></div>
          <div onClick={handleComingSoon}><NavItem icon={<BarChart2 size={20} />} /></div>
        </nav>
        <div className="mt-auto pb-4" onClick={handleComingSoon}><NavItem icon={<Settings size={20} />} /></div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-transparent">
          {/* 🌟 拦截搜索功能 */}
          <div className="relative w-96 group" onClick={handleComingSoon}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input readOnly type="text" placeholder="Search leads (Coming soon)..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-not-allowed focus:outline-none" />
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={handleComingSoon} className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full"><Bell size={18} /></button>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            
            {/* 🌟 显示真实用户标识与退出按钮 */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700 leading-none">
                  {user.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Workspace</p>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors" 
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Welcome back, here are your latest AI quotes.</p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={18} /> New AI Quote
            </button>
          </div>

          {/* 指标卡片 - 暂时写死，后续可加动态计算 */}
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
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No quotes yet. Click "New AI Quote" to start!
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <TableRow 
                          key={lead.id}
                          img={lead.thumbnail_url ? <img src={lead.thumbnail_url} className="w-10 h-10 object-cover rounded-lg" /> : "📦"} 
                          name={lead.product_name || 'Unknown Item'} 
                          source={lead.source} 
                          region={lead.region} 
                          status={lead.status} 
                          price={lead.estimated_value ? `$${lead.estimated_value}` : '--'} 
                          onClick={() => handleOpenDetail(lead)}
                        />
                      ))
                    )}
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
      
      <QuoteDetailPanel 
        isOpen={!!selectedInquiryId} 
        onClose={() => {
          setSelectedInquiryId(null);
          setDetailData(null); 
        }} 
        quoteData={detailData} 
      />
    </div>
  );
}

// === 子组件保持不变 ===
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
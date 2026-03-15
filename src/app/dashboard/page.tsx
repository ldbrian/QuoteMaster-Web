'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/utils/supabase/client'; 
import { useRouter } from 'next/navigation'; 
import NewQuoteModal from '@/src/components/NewQuoteModal'; 
import QuoteDetailPanel from '@/src/components/QuoteDetailPanel';
import { 
  Search, Bell, Plus, MoreVertical, LogOut,
  LayoutGrid, FileText, Users, MessageSquare, 
  BarChart2, Settings, Globe, Loader2 ,MessageCircle, Menu, X, Trash2
} from 'lucide-react'; // 👈 CTO 新增了 Trash2 图标

// 状态标签颜色映射
const statusMap: any = {
  converted: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  analyzing: "bg-blue-50 text-blue-600 border border-blue-100",
  quoted: "bg-purple-50 text-purple-600 border border-purple-100",
  pending: "bg-amber-50 text-amber-600 border border-amber-100",
  failed: "bg-red-50 text-red-600 border border-red-100",
};

// 状态中文映射
const statusTextMap: any = {
  converted: "已成交",
  analyzing: "分析中",
  quoted: "已报价",
  pending: "等待中",
  failed: "失败",
};

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null); 
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // 身份核验
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchLeads();
      }
    };
    checkAuth();
  }, [router]);

  // 拉取真实数据，并处理超时孤儿任务
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 超时检测逻辑（3分钟未完成判定为失败）
      const now = new Date().getTime();
      const TIMEOUT_MS = 3 * 60 * 1000; // 3分钟
      
      let hasUpdates = false;
      const processedData = data?.map((lead) => {
        if (lead.status === 'analyzing') {
          const leadTime = new Date(lead.created_at).getTime();
          if (now - leadTime > TIMEOUT_MS) {
            hasUpdates = true;
            // 顺手在数据库里把它改成 failed
            supabase.from('inquiries').update({ status: 'failed' }).eq('id', lead.id).then();
            return { ...lead, status: 'failed' }; // 本地直接变状态
          }
        }
        return lead;
      });

      setLeads(processedData || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // 重试失败的任务
  const handleRetry = async (lead: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止点击整行打开详情页
    
    // 获取当前最新时间，用来重置秒表
    const nowISO = new Date().toISOString();

    // 1. 乐观更新 UI，变回分析中，并且重置本地倒计时！
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'analyzing', created_at: nowISO } : l));
    
    // 2. 更新数据库：改状态，并且重置数据库的创建时间！
    await supabase.from('inquiries').update({ 
      status: 'analyzing',
      created_at: nowISO  
    }).eq('id', lead.id);

    // 3. 重新给 Python 后端发任务
    try {
      fetch("https://api.toughlove.online/api/get_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: lead.id,
          image_url: lead.thumbnail_url,
          user_prompt: "重试核价任务" 
        }),
      });
    } catch (error) {
      console.log("重试任务已发送");
    }
  };

  // 🌟 CTO 新增：删除核价记录的终极函数
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止点击删除时触发整行的跳转/点击事件
    
    // 1. 防呆确认
    const isConfirmed = window.confirm('确定要删除这条核价记录吗？删除后无法恢复。');
    if (!isConfirmed) return;

    try {
      // 2. 乐观更新：让数据在前端瞬间消失，体验极度丝滑
      setLeads((prev) => prev.filter((item) => item.id !== id));

      // 3. 真实数据库删除操作
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
    } catch (error: any) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
      // 如果报错了，为了安全起见，重新拉取一次真实的数据库列表兜底
      fetchLeads(); 
    }
  };

  // Supabase 实时监听，后端算完自动推送刷新
  useEffect(() => {
    const channel = supabase
      .channel('realtime-inquiries')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inquiries' },
        (payload) => {
          console.log('🎉 收到后端处理完成推送！', payload);
          fetchLeads(); // 静默刷新列表
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 动态计算真实的 KPI 数据
  const kpiData = useMemo(() => {
    const totalValue = leads.reduce((sum, lead) => sum + (Number(lead.estimated_value) || 0), 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue);
    const pendingCount = leads.filter(lead => lead.status === 'analyzing' || lead.status === 'pending').length;

    return { formattedTotal, pendingCount };
  }, [leads]);

  // 点击行的处理函数
  const handleOpenDetail = async (lead: any) => {
    // 如果正在分析中，不可点击打开
    if (lead.status === 'analyzing') return;
    
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

  const handleComingSoon = () => {
    alert("🚧 功能正在紧张开发中，MVP 试用阶段敬请期待！");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-sm text-slate-500 font-medium">身份验证中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 relative overflow-hidden">
      
      {/* 手机端半透明遮罩层 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 左侧导航 - 响应式改造：手机端变为滑动抽屉，PC端固定 */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col py-6 gap-6 z-50 shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Logo 和 产品名 */}
        <div className="flex items-center justify-between px-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">Q</div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">QuoteMaster</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 w-full px-4">
          <NavItem icon={<LayoutGrid size={20} />} label="AI 工作台" active />
          
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            工作空间 (即将上线)
          </div>
          
          <div onClick={handleComingSoon}>
            <NavItem icon={<FileText size={20} />} label="核价历史" disabled badge="PRO" />
          </div>
          <div onClick={handleComingSoon}>
            <NavItem icon={<Users size={20} />} label="客户管理" disabled />
          </div>
          <div onClick={handleComingSoon}>
            <NavItem icon={<BarChart2 size={20} />} label="成本分析" disabled />
          </div>
        </nav>

        <div className="mt-auto pb-4 px-4" onClick={handleComingSoon}>
          <NavItem icon={<Settings size={20} />} label="团队设置" disabled />
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-transparent">
          
          {/* 手机端：汉堡菜单按钮 + 极简 Logo */}
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg text-slate-800 tracking-tight">QM</span>
          </div>

          {/* PC端：搜索框 (手机端隐藏) */}
          <div className="relative w-96 group hidden md:block" onClick={handleComingSoon}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-50" size={16} />
            <input readOnly type="text" placeholder="搜索线索 (即将上线)..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-not-allowed opacity-60 focus:outline-none" />
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={handleComingSoon} className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full opacity-50 cursor-not-allowed hidden sm:block"><Bell size={18} /></button>
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
            
            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700 leading-none">
                  {user.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-slate-400 mt-1">当前用户</p>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors bg-slate-50 md:bg-transparent" 
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">工作台</h1>
              <p className="text-slate-500 text-sm mt-1">欢迎回来，这是您最近的 AI 核价记录。</p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-200 flex justify-center items-center gap-2 hover:bg-blue-700 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={18} /> 新建 AI 核价
            </button>
          </div>

          {/* 动态指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="总询盘数" value={leads.length} trend="实时" trendUp={true} />
            <StatCard label="预估 FOB 总值" value={kpiData.formattedTotal} trend="已计算" trendUp={true} />
            <StatCard label="等待/分析中" value={kpiData.pendingCount} trend={kpiData.pendingCount > 0 ? "处理中" : "已全部完成"} trendUp={kpiData.pendingCount === 0} />
          </div>

          {/* 表格区域 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">最近询盘</h2>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-400 gap-2">
                <Loader2 className="animate-spin" /> 数据加载中...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">产品</th>
                      <th className="px-6 py-4 hidden sm:table-cell">来源</th>
                      <th className="px-6 py-4 hidden md:table-cell">地区</th>
                      <th className="px-6 py-4">状态</th>
                      <th className="px-6 py-4">预估价值</th>
                      <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                          暂无核价记录。点击“新建 AI 核价”开始！
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <TableRow 
                          key={lead.id}
                          img={lead.thumbnail_url ? <img src={lead.thumbnail_url} className="w-10 h-10 object-cover rounded-lg" alt="" /> : "📦"} 
                          name={lead.product_name || '未知产品'} 
                          source={lead.source} 
                          region={lead.region || 'Global'} 
                          status={lead.status} 
                          price={lead.estimated_value ? `$${lead.estimated_value}` : '--'} 
                          onClick={() => handleOpenDetail(lead)}
                          onRetry={(e: React.MouseEvent) => handleRetry(lead, e)} 
                          onDelete={(e: React.MouseEvent) => handleDelete(lead.id, e)} // 👈 传递给子组件的删除函数
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
      <button
        onClick={() => {
          alert("💡 欢迎吐槽！\n\n遇到 Bug 了？觉得 AI 算得不准？想加新功能？\n\n请直接联系创始人微信：[ldbrian]\n或发送邮件至：[ldbrian@163.com]\n\n老板，用得不爽直接喷我，您的每一个建议都是我们迭代的动力！");
        }}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl shadow-blue-300 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center group"
      >
        <MessageCircle size={24} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] group-hover:ml-2 transition-all duration-300 ease-in-out font-medium text-sm">
          提个建议 / Bug
        </span>
      </button>
    </div>
  );
}

// === 修改：Navitem 支持 disabled 变灰样式 ===
function NavItem({ icon, label, active, disabled, badge }: { icon: React.ReactNode, label?: string, active?: boolean, disabled?: boolean, badge?: string }) {
  return (
    <div className={`flex items-center justify-between w-full px-4 h-11 rounded-lg transition-all 
      ${active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 font-medium'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:text-slate-700 cursor-pointer'}
    `}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {/* 诱人的小角标 */}
      {badge && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 tracking-wide shadow-sm">
          {badge}
        </span>
      )}
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

function TableRow({ img, name, source, region, status, price, onClick, onRetry, onDelete }: any) {
  const isAnalyzing = status === 'analyzing';
  const isFailed = status === 'failed';
  
  return (
    <tr onClick={onClick} className={`transition-colors group ${isAnalyzing ? 'cursor-wait opacity-80' : 'hover:bg-slate-50/80 cursor-pointer'}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl shadow-inner overflow-hidden">{img}</div>
          <span className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell">{source}</td>
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 uppercase tracking-wide">
          <Globe size={10} className="mr-1" /> {region}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${(statusMap as any)[status] || 'bg-slate-100 text-slate-500'} flex items-center gap-1`}>
          {isAnalyzing && <Loader2 size={10} className="animate-spin" />}
          {statusTextMap[status] || status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-900">{price}</td>
      <td className="px-6 py-4 text-right">
        
        {/* 🌟 CTO 级改造：动作区重构，把删除按钮优雅地加进去 */}
        <div className="flex items-center justify-end gap-3">
          {isFailed ? (
             <button 
               onClick={onRetry} 
               className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-md font-medium transition-colors"
             >
               重新测算
             </button>
          ) : (
            <button className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors" title="更多操作">
              <MoreVertical size={16} />
            </button>
          )}

          {/* 垃圾桶按钮，所有状态均可删除 */}
          <button 
            onClick={onDelete} 
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="删除记录"
          >
            <Trash2 size={16} />
          </button>
        </div>

      </td>
    </tr>
  );
}
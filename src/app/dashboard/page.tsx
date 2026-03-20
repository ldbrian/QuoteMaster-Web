'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/utils/supabase/client'; 
import { useRouter } from 'next/navigation'; 
import NewQuoteModal from '@/src/components/NewQuoteModal'; 
import QuoteDetailPanel from '@/src/components/QuoteDetailPanel';
import { 
  Search, Bell, Plus, MoreVertical, LogOut,
  LayoutGrid, FileText, Users, MessageSquare, 
  BarChart2, Settings, Globe, Loader2 ,MessageCircle, Menu, X, Trash2 ,Radar, Flame,
  Gift, Crown, Sparkles // 🌟 CTO 商业化植入：新增了这三个图标
} from 'lucide-react'; 

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
  
  // 🌟 CTO 商业化植入：新增三个状态变量
  const [profile, setProfile] = useState<any>(null); // 存数据库里的档案（剩余次数等）
  const [showGiftModal, setShowGiftModal] = useState(false); // 控制新手大礼包弹窗
  const [showPayModal, setShowPayModal] = useState(false); // 控制坦白局收款弹窗

  const router = useRouter();

  // 身份核验与档案拉取
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchLeads();
        fetchUserProfile(session.user.id); // 🌟 拉取业务档案
      }
    };
    checkAuth();
  }, [router]);

  // 🌟 CTO 商业化植入：拉取用户档案并判定是否弹大礼包
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
        // 如果是免费用户，且1次都没用过，且本地没记录过“已领奖”，就弹窗！
        if (data.tier === 'free' && data.usage_count === 0 && !localStorage.getItem('giftClaimed')) {
          setShowGiftModal(true);
        }
      }
    } catch (err) {
      console.error("无法获取用户档案", err);
    }
  };

  // 🌟 CTO 商业化植入：点击领取奖品逻辑
  const handleClaimGift = () => {
    localStorage.setItem('giftClaimed', 'true');
    setShowGiftModal(false);
    setIsModalOpen(true); // 领完奖直接弹开上传窗口趁热打铁
  };

  // 🌟 CTO 商业化植入：拦截新建报价点击（没额度就弹收款码）
  const handleNewQuoteClick = () => {
    if (profile && profile.tier === 'free' && profile.usage_count >= 15) {
      setShowPayModal(true); // 额度用光，弹出坦白局收款码
    } else {
      setIsModalOpen(true); // 还有额度或者VIP，正常打开
    }
  };

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
            supabase.from('inquiries').update({ status: 'failed' }).eq('id', lead.id).then();
            return { ...lead, status: 'failed' }; 
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
    e.stopPropagation(); 
    const nowISO = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'analyzing', created_at: nowISO } : l));
    await supabase.from('inquiries').update({ status: 'analyzing', created_at: nowISO }).eq('id', lead.id);

    try {
      fetch("https://api.toughlove.online/api/get_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: lead.id, image_url: lead.thumbnail_url, user_prompt: "重试核价任务" }),
      });
    } catch (error) {
      console.log("重试任务已发送");
    }
  };

  // 删除核价记录
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isConfirmed = window.confirm('确定要删除这条核价记录吗？删除后无法恢复。');
    if (!isConfirmed) return;

    try {
      setLeads((prev) => prev.filter((item) => item.id !== id));
      const { error } = await supabase.from('inquiries').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
      fetchLeads(); 
    }
  };

  // Supabase 实时监听
  useEffect(() => {
    const channel = supabase
      .channel('realtime-inquiries')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inquiries' },
        (payload) => {
          fetchLeads(); 
          // 🌟 每次成功算完一单，静默刷新一下用户档案，更新他消耗的次数
          if(user) fetchUserProfile(user.id); 
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 动态计算 KPIs
  const kpiData = useMemo(() => {
    const totalValue = leads.reduce((sum, lead) => sum + (Number(lead.estimated_value) || 0), 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue);
    const pendingCount = leads.filter(lead => lead.status === 'analyzing' || lead.status === 'pending').length;
    return { formattedTotal, pendingCount };
  }, [leads]);

  const handleOpenDetail = async (lead: any) => {
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
        setDetailData({ ...lead, ...data[0].quote_data });
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
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
      )}

      {/* 左侧导航 */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col py-6 gap-6 z-50 shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
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
          <div onClick={handleComingSoon}><NavItem icon={<FileText size={20} />} label="核价与打样历史" disabled badge="PRO" /></div>
          <div onClick={handleComingSoon}><NavItem icon={<BarChart2 size={20} />} label="企业成本看板" disabled /></div>

          {/* 情报大厅 */}
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flame size={12} className="text-rose-500 animate-pulse" /> 
            情报大厅 (规划中)
          </div>
          <div onClick={() => alert("🔥 【全球采买趋势雷达】正在研发中！\n\n未来您可以通过上传真实打样数据，解锁以下特权：\n1. 查看北美/欧洲本周暴增询盘品类\n2. 获取同行该类目的真实成交底价区间\n\n敬请期待我们的“外贸情报大厅”上线！")}>
            <NavItem icon={<Radar size={20} />} label="全球采买趋势雷达" disabled badge="VIP" />
          </div>
          <div onClick={handleComingSoon}><NavItem icon={<Users size={20} />} label="一键转单/甩单大厅" disabled /></div>

          {/* 🌟 CTO 商业化植入：赚取额度任务中心入口 */}
          <div className="mt-6 mx-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-800">赚取免费额度</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight mb-3">上传老订单底价 或 邀请同行，即可解锁算力盲盒。</p>
            <button onClick={() => alert("🏆 任务中心火热搭建中！\n\n下周上线后：\n1. 上传真实底价送 5 次\n2. 邀请好友注册送 10 次\n\n敬请期待！")} className="w-full py-1.5 bg-white border border-blue-200 text-blue-600 rounded text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
              前往任务中心
            </button>
          </div>
        </nav>

        <div className="mt-auto pb-4 px-4" onClick={handleComingSoon}>
          <NavItem icon={<Settings size={20} />} label="团队设置" disabled />
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-transparent">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg text-slate-800 tracking-tight">QM</span>
          </div>

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
                {/* 🌟 CTO 商业化植入：实时显示剩余额度 */}
                {profile ? (
                  profile.tier === 'free' ? (
                    <div className="text-[11px] text-blue-600 font-bold mt-1.5 flex items-center justify-end gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm cursor-help" title="用完可做任务或升级获取">
                      <Gift size={10} /> 剩余 {Math.max(0, 15 - (profile.usage_count || 0))} 次免费
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center justify-end gap-1 bg-gradient-to-r from-amber-50 to-yellow-100 px-2 py-0.5 rounded-full border border-amber-200 shadow-sm">
                      <Crown size={10} /> Pro 无限火力
                    </div>
                  )
                ) : (
                  <div className="text-[11px] text-slate-400 mt-1">加载中...</div>
                )}
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors bg-slate-50 md:bg-transparent" title="退出登录">
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
              onClick={handleNewQuoteClick} // 🌟 CTO 商业化植入：拦截器上线
              className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-200 flex justify-center items-center gap-2 hover:bg-blue-700 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={18} /> 新建 AI 核价
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="总询盘数" value={leads.length} trend="实时" trendUp={true} />
            <StatCard label="预估 FOB 总值" value={kpiData.formattedTotal} trend="已计算" trendUp={true} />
            <StatCard label="等待/分析中" value={kpiData.pendingCount} trend={kpiData.pendingCount > 0 ? "处理中" : "已全部完成"} trendUp={kpiData.pendingCount === 0} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">最近询盘</h2>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-400 gap-2"><Loader2 className="animate-spin" /> 数据加载中...</div>
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
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">暂无核价记录。点击“新建 AI 核价”开始！</td></tr>
                    ) : (
                      leads.map((lead) => (
                        <TableRow 
                          key={lead.id}
                          img={lead.thumbnail_url ? <img src={lead.thumbnail_url} className="w-10 h-10 object-cover rounded-lg" alt="" /> : "📦"} 
                          name={lead.product_name || '未知产品'} source={lead.source} region={lead.region || 'Global'} status={lead.status} price={lead.estimated_value ? `$${lead.estimated_value}` : '--'} 
                          onClick={() => handleOpenDetail(lead)}
                          onRetry={(e: React.MouseEvent) => handleRetry(lead, e)} 
                          onDelete={(e: React.MouseEvent) => handleDelete(lead.id, e)}
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

      {/* 上传弹窗 */}
      <NewQuoteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setIsModalOpen(false); fetchLeads(); }} 
        onSelectDemo={(demoData) => {
          setIsModalOpen(false);               
          setSelectedInquiryId(demoData.id);   
          setDetailData(demoData);             
        }}
      />
      
      <QuoteDetailPanel isOpen={!!selectedInquiryId} onClose={() => { setSelectedInquiryId(null); setDetailData(null); }} quoteData={detailData} />
      
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

      {/* 🌟 CTO 商业化植入 1：新手大礼包弹窗 */}
      {showGiftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden transform transition-all scale-100 animate-in zoom-in-90 border border-slate-100">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 transform -rotate-6">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">恭喜入驻 QuoteMaster!</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                已为您充值 <strong className="text-blue-600 text-lg">15 次</strong> 旗舰版 AI 极速核价特权。<br/>无需绑定信用卡，立刻感受 30 秒出单的震撼。
              </p>
              
              <button 
                onClick={handleClaimGift}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} /> 立即开启我的首单测算
              </button>
              
              <button 
                onClick={() => { localStorage.setItem('giftClaimed', 'true'); setShowGiftModal(false); }}
                className="mt-4 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                稍后使用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 CTO 商业化植入 2：坦白局收费弹窗 */}
      {showPayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
            <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={20} /></button>
            
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flame size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">🚀 免费算力已耗尽，但这只是开始...</h2>
              <div className="text-sm text-slate-600 text-left space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <p>嗨，朋友，我是 QuoteMaster 的独立开发者兼打杂小哥。</p>
                <p>感谢你用光了 15 次额度！这说明我熬夜敲出来的 AI 引擎真的帮到了你。说句掏心窝子的话，背后的底层大模型调用费确实有点贵，我的服务器已经快冒烟了 😅。</p>
                <p>如果这个工具帮你省下了时间，甚至帮你留住了客户，<strong className="text-slate-800">恳请你请我喝杯咖啡 (¥199 / 月)</strong>，解锁【Pro 无限火力版】。</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl flex items-center justify-between text-left mb-6">
                <div>
                  <p className="text-white font-bold flex items-center gap-1.5"><Crown size={16} className="text-amber-400"/> Pro 无限火力特权</p>
                  <ul className="text-slate-400 text-xs mt-1 space-y-0.5">
                    <li>• 无限制 AI 看图核价</li>
                    <li>• 解锁隐藏的深度 BOM 明细</li>
                    <li>• 开发者 1对1 优先支持</li>
                  </ul>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">¥199</p>
                  <p className="text-[10px] text-slate-400">/ 每月</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 rounded-xl relative">
                <p className="text-sm font-bold text-slate-800 mb-2">👇 请扫码支付，并添加我微信</p>
                
                {/* ⚠️ 替换这里为你真实的收款码链接！！！ */}
                <div className="w-40 h-40 bg-white border border-slate-200 mx-auto rounded-lg shadow-sm flex items-center justify-center mb-3 p-1">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WECHAT_PAY_CODE_HERE" alt="收款码" className="w-full h-full object-contain opacity-50" />
                  {/* 注：请把上面的 src 换成你真实的微信收款码图片链接，或者上传到 public 目录用 /pay-qr.jpg */}
                </div>
                
                <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-100 shadow-sm">
                  转账后请添加微信：<strong className="text-slate-800 selection:bg-blue-200">ldbrian</strong> 发送截图<br/>我将在一分钟内为您手动开通权限。
                </p>
              </div>

              <button onClick={() => setShowPayModal(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">
                暂不升级，我去看看别的
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// === 下方组件无需修改 ===
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
        <div className="flex items-center justify-end gap-3">
          {isFailed ? (
             <button onClick={onRetry} className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-md font-medium transition-colors">
               重新测算
             </button>
          ) : (
            <button className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors" title="更多操作">
              <MoreVertical size={16} />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="删除记录">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
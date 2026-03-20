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
  Gift, Crown, Sparkles, 
  Phone, UploadCloud, UserPlus, ChevronRight, CheckCircle2, Copy, ShieldCheck // 🌟 CTO 新增
} from 'lucide-react'; 

// 状态标签颜色映射
const statusMap: any = {
  converted: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  analyzing: "bg-blue-50 text-blue-600 border border-blue-100",
  quoted: "bg-purple-50 text-purple-600 border border-purple-100",
  pending: "bg-amber-50 text-amber-600 border border-amber-100",
  failed: "bg-red-50 text-red-600 border border-red-100",
};

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
  
  const [profile, setProfile] = useState<any>(null); 
  const [showGiftModal, setShowGiftModal] = useState(false); 
  const [showPayModal, setShowPayModal] = useState(false); 

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUploadQuoteModal, setShowUploadQuoteModal] = useState(false);

  // 🌟 CTO 商业化三期植入：手机号专属状态
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const router = useRouter();

  // 🌟 动态计算剩余总额度 (15基础 + 奖励 - 消耗)
  const remainingQuota = useMemo(() => {
    if (!profile) return 0;
    const base = 15;
    const bonus = profile.bonus_quota || 0;
    const used = profile.usage_count || 0;
    return Math.max(0, base + bonus - used);
  }, [profile]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchLeads();
        fetchUserProfile(session.user.id); 
      }
    };
    checkAuth();
  }, [router]);

  // 🌟 短信倒计时钩子
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
        if (data.tier === 'free' && data.usage_count === 0 && !localStorage.getItem('giftClaimed')) {
          setShowGiftModal(true);
        }
      }
    } catch (err) {
      console.error("无法获取用户档案", err);
    }
  };

  const handleClaimGift = () => {
    localStorage.setItem('giftClaimed', 'true');
    setShowGiftModal(false);
    setIsModalOpen(true); 
  };

  const handleNewQuoteClick = () => {
    if (profile && profile.tier === 'free' && remainingQuota <= 0) {
      setShowPayModal(true); 
    } else {
      setIsModalOpen(true); 
    }
  };

  // 🌟 发送验证码逻辑
  const handleSendOtp = async () => {
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      alert("请输入正确的中国大陆11位手机号码！");
      return;
    }
    setIsSending(true);
    try {
      // 调用 Supabase Auth 的发送短信接口
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+86' + phoneNumber,
      });
      
      if (error) throw error;
      
      setCountdown(60); 
      alert("验证码已发送，请注意查收！(测试阶段若未收到，请检查后台短信配置)");
    } catch (error: any) {
      console.error('发送验证码失败:', error);
      alert('发送失败，请稍后再试。');
    } finally {
      setIsSending(false);
    }
  };

  // 🌟 验证短信逻辑
  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) {
      alert("请输入完整的验证码！");
      return;
    }
    setIsVerifying(true);
    try {
      // 调用 Supabase 验证接口
      const { error } = await supabase.auth.verifyOtp({
        phone: '+86' + phoneNumber,
        token: otpCode,
        type: 'sms',
      });
      
      if (error) throw error;

      // 验证成功，下发 5 次奖励额度
      const newBonus = (profile.bonus_quota || 0) + 5;
      const { error: updateError } = await supabase.from('profiles').update({ 
        phone_verified: true, 
        phone: phoneNumber,
        bonus_quota: newBonus 
      }).eq('id', user.id);

      if (updateError) throw updateError;

      alert("🎉 绑定成功！已为您下发 5 次专属奖励额度！");
      fetchUserProfile(user.id); 
      setShowPhoneModal(false);
      setShowTaskModal(false);
      
    } catch (error: any) {
      console.error('验证失败:', error);
      // 测试通道后门
      if (otpCode === '888888') {
        const newBonus = (profile.bonus_quota || 0) + 5;
        await supabase.from('profiles').update({ phone_verified: true, phone: phoneNumber, bonus_quota: newBonus }).eq('id', user.id);
        alert("🎉 [测试通道] 绑定成功！已为您下发 5 次专属奖励额度！");
        fetchUserProfile(user.id);
        setShowPhoneModal(false);
      } else {
        alert("验证码错误或已过期！(测试可使用 888888)");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const now = new Date().getTime();
      const TIMEOUT_MS = 3 * 60 * 1000; 
      
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

  const handleRetry = async (lead: any, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const nowISO = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'analyzing', created_at: nowISO } : l));
    await supabase.from('inquiries').update({ status: 'analyzing', created_at: nowISO }).eq('id', lead.id);
    try {
      fetch("https://api.toughlove.online/api/get_quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: lead.id, image_url: lead.thumbnail_url, user_prompt: "重试核价任务" }),
      });
    } catch (error) {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isConfirmed = window.confirm('确定要删除这条核价记录吗？删除后无法恢复。');
    if (!isConfirmed) return;
    try {
      setLeads((prev) => prev.filter((item) => item.id !== id));
      await supabase.from('inquiries').delete().eq('id', id);
    } catch (error: any) {
      alert('删除失败: ' + error.message);
      fetchLeads(); 
    }
  };

  useEffect(() => {
    const channel = supabase.channel('realtime-inquiries').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inquiries' }, (payload) => {
      fetchLeads(); 
      if(user) fetchUserProfile(user.id); 
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
      const { data } = await supabase.from('messages').select('quote_data').eq('inquiry_id', lead.id).not('quote_data', 'is', null).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0 && data[0].quote_data) {
        setDetailData({ ...lead, ...data[0].quote_data });
      }
    } catch (err) {}
  };

  const handleComingSoon = () => alert("🚧 功能正在紧张开发中，MVP 试用阶段敬请期待！");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      <p className="text-sm text-slate-500 font-medium">身份验证中...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 relative overflow-hidden">
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}/>}

      {/* 左侧导航 */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col py-6 gap-6 z-50 shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">Q</div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">QuoteMaster</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
        </div>

        <nav className="flex flex-col gap-2 w-full px-4">
          <NavItem icon={<LayoutGrid size={20} />} label="AI 工作台" active />
          
          <div className="mt-4 mb-1 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">工作空间 (即将上线)</div>
          <div onClick={handleComingSoon}><NavItem icon={<FileText size={20} />} label="核价与打样历史" disabled badge="PRO" /></div>
          <div onClick={handleComingSoon}><NavItem icon={<BarChart2 size={20} />} label="企业成本看板" disabled /></div>

          <div className="mt-4 mb-1 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flame size={12} className="text-rose-500 animate-pulse" /> 情报大厅 (规划中)
          </div>
          <div onClick={() => alert("🔥 【全球采买趋势雷达】正在研发中！\n\n未来您可以通过上传真实打样数据，解锁以下特权：\n1. 查看北美/欧洲本周暴增询盘品类\n2. 获取同行该类目的真实成交底价区间\n\n敬请期待！")}><NavItem icon={<Radar size={20} />} label="全球采买趋势雷达" disabled badge="VIP" /></div>
          <div onClick={handleComingSoon}><NavItem icon={<Users size={20} />} label="一键转单/甩单大厅" disabled /></div>

          {/* 🌟 任务中心入口 */}
          <div className="mt-6 mx-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setShowTaskModal(true)}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-amber-500 group-hover:animate-pulse" />
              <span className="text-xs font-bold text-slate-800">赚取免费额度</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight mb-3">上传老订单底价 或 邀请同行，即可解锁算力盲盒。</p>
            <button className="w-full py-1.5 bg-white border border-blue-200 text-blue-600 rounded text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-1">
              前往任务中心 <ChevronRight size={14} />
            </button>
          </div>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-transparent">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <span className="font-bold text-lg text-slate-800 tracking-tight">QM</span>
          </div>

          <div className="relative w-96 group hidden md:block" onClick={handleComingSoon}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-50" size={16} />
            <input readOnly type="text" placeholder="搜索线索 (即将上线)..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-not-allowed opacity-60 focus:outline-none" />
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700 leading-none">{user.email?.split('@')[0] || 'Admin'}</p>
                {profile ? (
                  profile.tier === 'free' ? (
                    <div onClick={() => setShowTaskModal(true)} className="cursor-pointer text-[11px] text-blue-600 font-bold mt-1.5 flex items-center justify-end gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 shadow-sm transition-colors" title="点击获取更多额度">
                      <Gift size={10} /> 剩余 {remainingQuota} 次免费
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
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors bg-slate-50 md:bg-transparent" title="退出登录"><LogOut size={18} /></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">工作台</h1>
              <p className="text-slate-500 text-sm mt-1">欢迎回来，这是您最近的 AI 核价记录。</p>
            </div>
            <button onClick={handleNewQuoteClick} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-200 flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
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

      {/* --- 浮层与弹窗区 --- */}
      
      <NewQuoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchLeads(); }} onSelectDemo={(demoData) => { setIsModalOpen(false); setSelectedInquiryId(demoData.id); setDetailData(demoData); }} />
      <QuoteDetailPanel isOpen={!!selectedInquiryId} onClose={() => { setSelectedInquiryId(null); setDetailData(null); }} quoteData={detailData} />

      {/* 🌟 1. 任务中心弹窗 */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles className="text-amber-500" size={18}/> 任务中心：赚取免费算力</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50">
              {/* 任务一：绑定手机 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${profile?.phone_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {profile?.phone_verified ? <ShieldCheck size={20} /> : <Phone size={20} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">绑定中国大陆手机号</h4>
                    <p className="text-xs text-slate-500 mt-0.5">完成真人验证，防止恶意白嫖</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">+ 5 次额度</span>
                  {profile?.phone_verified ? (
                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                      <CheckCircle2 size={14}/> 已绑定
                    </span>
                  ) : (
                    <button 
                      onClick={() => { setShowTaskModal(false); setShowPhoneModal(true); }} 
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      去绑定
                    </button>
                  )}
                </div>
              </div>

              {/* 任务二：上传底价 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-purple-300 transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0"><UploadCloud size={20} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">上传真实打样/成交底价</h4>
                    <p className="text-xs text-slate-500 mt-0.5">贡献行业真实情报，次日审核发放</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded">+ 5 次 / 单</span>
                  <button 
                    onClick={() => { setShowTaskModal(false); setShowUploadQuoteModal(true); }} 
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    去上传
                  </button>
                </div>
              </div>

              {/* 任务三：邀请好友 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><UserPlus size={20} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">邀请外贸同行</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">每邀请1人注册<strong className="text-rose-500 font-bold">并完成手机验证</strong>，<br/>即可获得巨额奖励</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+ 10 次 / 人</span>
                  <button onClick={() => alert("🔗 您的专属邀请链接：\nhttps://quotemaster.ai/invite?code=8888\n\n（已复制到剪贴板，快去发给同行吧！）")} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
                    <Copy size={12}/> 专属链接
                  </button>
                </div>
              </div>

              {/* 支付模块通道 */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-500" />
                  <span className="text-xs text-slate-600">厌倦了做任务？</span>
                </div>
                <button onClick={() => { setShowTaskModal(false); setShowPayModal(true); }} className="text-xs font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2">
                  直接解锁 Pro 无限火力版
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 2. 手机号验证专属弹窗 */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Phone size={18} className="text-blue-600"/> 绑定手机号</h3>
              <button onClick={() => setShowPhoneModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 flex items-start gap-2 leading-relaxed">
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <p>为防止黑灰产恶意刷量，我们需要验证您的真实身份。<strong>绑定成功后，立刻为您到账 5 次核价额度！</strong></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">手机号码 (+86)</label>
                <input 
                  type="tel" 
                  maxLength={11}
                  placeholder="请输入 11 位手机号码" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">短信验证码</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="6 位验证码" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  />
                  <button 
                    onClick={handleSendOtp}
                    disabled={isSending || countdown > 0 || phoneNumber.length !== 11}
                    className="w-28 shrink-0 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-colors"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin mx-auto" /> : (countdown > 0 ? `${countdown}s 后重发` : '获取验证码')}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleVerifyOtp}
                disabled={isVerifying || otpCode.length < 4}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                {isVerifying ? <Loader2 size={18} className="animate-spin" /> : '验证并领取 5 次额度'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 3. 上传底价弹窗 */}
      {showUploadQuoteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">📤 贡献真实底价</h3>
              <button onClick={() => setShowUploadQuoteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p><strong>隐私承诺：</strong>您上传的单据将经过脱敏处理，仅用于训练大模型算法，绝对不会向任何第三方展示您的客户或公司信息。审核通过后，<strong>次日将为您发放 5 次 AI 核价额度！</strong></p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
                <UploadCloud size={32} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                <p className="text-sm font-bold text-slate-600 group-hover:text-blue-600">点击上传 PI / 工厂报价单</p>
                <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG, PDF 格式</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">真实出厂价 (选填)</label>
                  <input type="text" placeholder="例如: $1.25" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">起订量 (选填)</label>
                  <input type="text" placeholder="例如: 3000" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <button onClick={() => { alert("✅ 提交成功！\n\n系统已收到您的真实单据，我们将在 24 小时内完成人工审核并为您发放 5 次免费额度，感谢您为外贸生态做出的贡献！"); setShowUploadQuoteModal(false); }} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors mt-2">
                提交审核
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 4. 新手大礼包弹窗 */}
      {showGiftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden transform transition-all scale-100 animate-in zoom-in-90 border border-slate-100">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 transform -rotate-6"><Gift className="w-10 h-10 text-white" /></div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">恭喜入驻 QuoteMaster!</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">已为您充值 <strong className="text-blue-600 text-lg">15 次</strong> 旗舰版 AI 极速核价特权。<br/>无需绑定信用卡，立刻感受 30 秒出单的震撼。</p>
              <button onClick={handleClaimGift} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                <Sparkles size={18} /> 立即开启我的首单测算
              </button>
              <button onClick={() => { localStorage.setItem('giftClaimed', 'true'); setShowGiftModal(false); }} className="mt-4 text-xs text-slate-400 hover:text-slate-600 font-medium">稍后使用</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 5. 坦白局收费弹窗 (支付模块) */}
      {showPayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
            <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><X size={20} /></button>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Flame size={28} /></div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">🚀 免费算力已耗尽，但这只是开始...</h2>
              <div className="text-sm text-slate-600 text-left space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <p>嗨，朋友，我是 QuoteMaster 的独立开发者兼打杂小哥。</p>
                <p>感谢你用光了 15 次额度！这说明我熬夜敲出来的 AI 引擎真的帮到了你。大模型调用费确实有点贵，服务器已经快冒烟了 😅。</p>
                <p>如果这个工具帮你省下了时间，留住了客户，<strong className="text-slate-800">恳请你请我喝杯咖啡 (¥199 / 月)</strong>，解锁【Pro 无限火力版】。</p>
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
                
                <div className="w-40 h-40 bg-white border border-slate-200 mx-auto rounded-lg shadow-sm flex items-center justify-center mb-3 p-1">
                  <img src="/pay-qr.jpg" alt="开发者收款码" className="w-full h-full object-contain" />
                </div>
                
                <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-100 shadow-sm">
                  转账后请添加微信：<strong className="text-slate-800 selection:bg-blue-200">ldbrian</strong> 发送截图<br/>我将在一分钟内为您手动开通权限。
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">暂不升级，我去赚取免费额度</button>
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
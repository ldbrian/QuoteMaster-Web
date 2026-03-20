'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. 验证是不是老板本人
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      // ⚠️ 极简权限控制：这里写死你的老板邮箱
      if (session.user.email !== 'ldbrian@163.com') {
        alert("非法访问：您不是管理员！");
        router.push('/');
        return;
      }
      fetchPendingSubmissions();
    };
    checkAdmin();
  }, [router]);

  // 2. 拉取所有待审核的数据
  const fetchPendingSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quote_submissions')
      .select('*, profiles(email, bonus_quota)') // 顺便把提交人的邮箱和额度拉出来
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSubmissions(data);
    }
    setLoading(false);
  };

  // 3. 核心动作：通过审核并发放 5 次奖励
  const handleApprove = async (submissionId: string, userId: string, currentBonus: number) => {
    const isConfirmed = window.confirm("确定通过这单真实底价？将为该用户发放 5 次额度。");
    if (!isConfirmed) return;

    try {
      // a. 将状态改为已通过
      await supabase.from('quote_submissions').update({ status: 'approved' }).eq('id', submissionId);
      
      // b. 给用户增加 5 次额度
      await supabase.from('profiles').update({ bonus_quota: currentBonus + 5 }).eq('id', userId);
      
      alert("✅ 已通过并下发奖励！");
      fetchPendingSubmissions(); // 刷新列表
    } catch (error) {
      alert("操作失败！");
    }
  };

  // 4. 核心动作：拒绝
  const handleReject = async (submissionId: string) => {
    const isConfirmed = window.confirm("这是一张垃圾图？确定要拒绝吗？");
    if (!isConfirmed) return;
    await supabase.from('quote_submissions').update({ status: 'rejected' }).eq('id', submissionId);
    fetchPendingSubmissions();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-slate-800">🕵️ 老板的暗网：真实底价审核台</h1>
          <p className="text-sm text-slate-500">待审核积压：{submissions.length} 单</p>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            太棒了！今天所有的羊毛党数据都审核完了，去喝杯咖啡吧。
          </div>
        ) : (
          <div className="grid gap-6">
            {submissions.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-6 items-center">
                
                {/* 左侧：用户上传的凭证图 */}
                <div className="w-48 h-48 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                  <a href={item.image_url} target="_blank" rel="noreferrer" title="点击查看大图">
                    <img src={item.image_url} alt="报价凭证" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                  </a>
                </div>

                {/* 中间：数据信息 */}
                <div className="flex-1 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">提交人账号</p>
                  <p className="text-sm font-medium text-slate-800 bg-slate-100 inline-block px-3 py-1 rounded-md">{item.profiles?.email}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-500 font-bold mb-1">他填的真实底价</p>
                      <p className="font-mono font-bold text-blue-900">{item.expected_price || '未填'}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <p className="text-xs text-amber-500 font-bold mb-1">起订量 (MOQ)</p>
                      <p className="font-mono font-bold text-amber-900">{item.moq || '未填'}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">提交时间: {new Date(item.created_at).toLocaleString()}</p>
                </div>

                {/* 右侧：生杀大权 */}
                <div className="flex flex-col gap-3 shrink-0 w-32">
                  <button 
                    onClick={() => handleApprove(item.id, item.user_id, item.profiles?.bonus_quota || 0)}
                    className="w-full bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1 border border-emerald-200 hover:border-transparent"
                  >
                    <CheckCircle size={18} /> 发放 5 次
                  </button>
                  <button 
                    onClick={() => handleReject(item.id)}
                    className="w-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1 border border-rose-200 hover:border-transparent"
                  >
                    <XCircle size={18} /> 垃圾图拒绝
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
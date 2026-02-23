export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-2xl mb-4 shadow-lg shadow-blue-200">Q</div>
          <h1 className="text-2xl font-bold text-slate-900">QuoteMaster 2.0</h1>
          <p className="text-slate-500 mt-2 text-sm">全球外贸询盘 AI 处理中心</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">账号</label>
            <input type="text" placeholder="admin" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">密码</label>
            <input type="password" placeholder="••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 bg-slate-50" />
          </div>
          <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]">
            进入指挥中心
          </button>
        </div>
        
        <div className="mt-8 text-center border-t border-slate-50 pt-6">
          <p className="text-xs text-slate-400 font-medium">© 2026 QuoteMaster AI Enterprise</p>
        </div>
      </div>
    </div>
  );
}
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Target, MessageSquare, Building2, BarChart3, LogOut } from "lucide-react";

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname.startsWith(path);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            Q
          </div>
          <span className="font-bold text-sm text-gray-800">QuoteMaster</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/home"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              pathname === "/home"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            工作台
          </Link>
          <Link
            href="/opportunities"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isActive("/opportunities")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Target className="w-4 h-4" />
            客户开发
          </Link>
          <Link
            href="/threads"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isActive("/threads")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            跟单
          </Link>
          <Link
            href="/company-dna"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isActive("/company-dna")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            公司资料
          </Link>
          <Link
            href="/insights"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isActive("/insights")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            数据
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg ml-2"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </nav>
      </div>
    </header>
  );
}

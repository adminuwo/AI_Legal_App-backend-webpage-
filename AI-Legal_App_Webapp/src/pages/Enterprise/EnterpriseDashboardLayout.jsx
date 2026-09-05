import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, Users, GraduationCap, BookOpen, Layers, Zap, CreditCard, 
  BarChart3, Megaphone, PlusCircle, FileText, Settings, Building2, Menu, X, ArrowLeft, ShieldAlert
} from 'lucide-react';

const EnterpriseDashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarNavItems = [
    { name: 'Overview', icon: LayoutGrid, path: '/dashboard/enterprise' },
    { name: 'Students', icon: GraduationCap, path: '/dashboard/enterprise/students' },
    { name: 'Faculty', icon: Users, path: '/dashboard/enterprise/faculty' },
    { name: 'Academic Structure', icon: Layers, path: '/dashboard/enterprise/academic' },
    { name: 'Curriculum & Syllabus', icon: BookOpen, path: '/dashboard/enterprise/curriculum' },
    { name: 'Feature Access', icon: Zap, path: '/dashboard/enterprise/feature-access' },
    { name: 'AI Usage & Credits', icon: CreditCard, path: '/dashboard/enterprise/usage-credits' },
    { name: 'Analytics', icon: BarChart3, path: '/dashboard/enterprise/analytics' },
    { name: 'Announcements', icon: Megaphone, path: '/dashboard/enterprise/announcements' },
    { name: 'Add-ons', icon: PlusCircle, path: '/dashboard/enterprise/add-ons' },
    { name: 'Reports', icon: FileText, path: '/dashboard/enterprise/reports' },
    { name: 'Settings', icon: Settings, path: '/dashboard/enterprise/settings' }
  ];

  const isActive = (path) => {
    if (path === '/dashboard/enterprise') {
      return location.pathname === '/dashboard/enterprise' || location.pathname === '/dashboard/enterprise/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C8A34D]/10 border border-[#C8A34D]/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#C8A34D]" />
          </div>
          <span className="font-extrabold text-sm tracking-tight">AI LEGAL <span className="text-[#C8A34D]">ENTERPRISE</span></span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-[100dvh] w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-all duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 rounded-xl bg-[#C8A34D]/10 border border-[#C8A34D]/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#C8A34D]" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight flex items-center gap-1">
                AI LEGAL <span className="text-[#C8A34D] text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C8A34D]/10">UNIV</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold truncate">Enterprise Admin Suite</p>
            </div>
          </div>
        </div>

        {/* Institution Badge */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] font-black text-xs flex items-center justify-center shrink-0">
            RD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">RDVV Law Faculty</p>
            <p className="text-[10px] text-slate-400 truncate">@rdvv.ac.in (Verified)</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {sidebarNavItems.map(item => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  active
                    ? 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={16} className={active ? 'text-[#C8A34D]' : 'text-slate-400'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Return to App Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Back to Main App
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default EnterpriseDashboardLayout;

import { NavLink, useNavigate } from 'react-router-dom';
import { Calculator, Package, History, Settings, LogOut, Sparkles, BarChart2 } from 'lucide-react';
import { logout } from '../lib/auth';

const navItems = [
  { to: '/calculator', icon: Calculator, label: 'Tính Giá' },
  { to: '/business',   icon: BarChart2,  label: 'Business' },
  { to: '/products',   icon: Package,    label: 'Sản Phẩm' },
  { to: '/history',    icon: History,    label: 'Lịch Sử' },
  { to: '/settings',   icon: Settings,   label: 'Cài Đặt' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Top Nav */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(10,10,10,0.95)', borderColor: '#1f1f1f', backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-semibold text-white text-sm">Giá Bán</span>
          </div>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { background: 'rgba(124,58,237,0.2)', color: '#a78bfa' } : {}
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-red-500/10"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: 'rgba(10,10,10,0.98)', borderColor: '#1f1f1f', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-violet-400' : 'text-zinc-500'
                }`
              }
            >
              <Icon size={18} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-20 sm:pb-8">
        {children}
      </main>
    </div>
  );
}

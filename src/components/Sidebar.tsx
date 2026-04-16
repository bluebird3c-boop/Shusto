import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  Pill, 
  FileText, 
  Stethoscope, 
  TestTube, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  Shield,
  Activity,
  Building,
  Truck,
  FlaskConical,
  Wallet,
  RefreshCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout, forceSync } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const getMenuItems = () => {
    const commonItems = [
      { id: 'profile', label: 'প্রোফাইল', icon: UserIcon },
      { id: 'wallet', label: 'ওয়ালেট', icon: Wallet },
      { id: 'medicine', label: 'ঔষধ স্টোর', icon: Pill },
      { id: 'prescriptions', label: 'প্রেসক্রিপশন', icon: FileText },
      { id: 'doctors', label: 'ডাক্তার', icon: Stethoscope },
      { id: 'lab', label: 'ল্যাব টেস্ট', icon: TestTube },
      { id: 'physio', label: 'ফিজিওথেরাপি', icon: Activity },
      { id: 'hospital', label: 'হাসপাতাল', icon: Building },
      { id: 'ambulance', label: 'অ্যাম্বুলেন্স', icon: Truck },
      { id: 'privacy', label: 'গোপনীয়তা নীতি', icon: Shield },
    ];

    let dashboardItem = { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard };

    if (user?.role === 'admin') {
      dashboardItem = { id: 'dashboard', label: 'অ্যাডমিন প্যানেল', icon: Shield };
    } else if (user?.role === 'doctor') {
      dashboardItem = { id: 'dashboard', label: 'ডাক্তার প্যানেল', icon: Stethoscope };
    } else if (user?.role === 'pharmacy') {
      dashboardItem = { id: 'dashboard', label: 'ফার্মেসি প্যানেল', icon: Pill };
    } else if (user?.role === 'physio') {
      dashboardItem = { id: 'dashboard', label: 'ফিজিওথেরাপি প্যানেল', icon: Activity };
    } else if (user?.role === 'hospital') {
      dashboardItem = { id: 'dashboard', label: 'হাসপাতাল প্যানেল', icon: Building };
    } else if (user?.role === 'ambulance') {
      dashboardItem = { id: 'dashboard', label: 'অ্যাম্বুলেন্স প্যানেল', icon: Truck };
    } else if (user?.role === 'lab') {
      dashboardItem = { id: 'dashboard', label: 'ল্যাব প্যানেল', icon: FlaskConical };
    }

    return [dashboardItem, ...commonItems];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Menu Toggle */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md text-slate-600"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
              <Stethoscope size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight block">Shusto</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                  {user?.role || 'User'}
                </span>
                <button 
                  onClick={() => forceSync()}
                  className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="Sync Role"
                >
                  <RefreshCcw size={10} />
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                  activeTab === item.id 
                    ? "bg-emerald-50 text-emerald-600" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/user/100/100"} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-emerald-100"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}
    </>
  );
}

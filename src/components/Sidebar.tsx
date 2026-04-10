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
  Wallet
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const getMenuItems = () => {
    const commonItems = [
      { id: 'profile', label: 'Profile', icon: UserIcon },
      { id: 'wallet', label: 'Wallet', icon: Wallet },
      { id: 'medicine', label: 'Medicine', icon: Pill },
      { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
      { id: 'doctors', label: 'Doctor', icon: Stethoscope },
      { id: 'lab', label: 'Lab Test', icon: TestTube },
      { id: 'physio', label: 'Physio', icon: Activity },
      { id: 'hospital', label: 'Hospital', icon: Building },
      { id: 'ambulance', label: 'Ambulance', icon: Truck },
      { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    ];

    let dashboardItem = { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard };

    if (user?.role === 'admin') {
      dashboardItem = { id: 'dashboard', label: 'Admin Panel', icon: Shield };
    } else if (user?.role === 'doctor') {
      dashboardItem = { id: 'dashboard', label: 'Doctor Panel', icon: Stethoscope };
    } else if (user?.role === 'pharmacy') {
      dashboardItem = { id: 'dashboard', label: 'Pharmacy Panel', icon: Pill };
    } else if (user?.role === 'physio') {
      dashboardItem = { id: 'dashboard', label: 'Physio Panel', icon: Activity };
    } else if (user?.role === 'hospital') {
      dashboardItem = { id: 'dashboard', label: 'Hospital Panel', icon: Building };
    } else if (user?.role === 'ambulance') {
      dashboardItem = { id: 'dashboard', label: 'Ambulance Panel', icon: Truck };
    } else if (user?.role === 'lab') {
      dashboardItem = { id: 'dashboard', label: 'Lab Panel', icon: FlaskConical };
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
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                {user?.role || 'User'}
              </span>
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

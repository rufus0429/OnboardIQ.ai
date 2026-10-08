import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { 
  LayoutDashboard, 
  Activity, 
  MessageSquare, 
  BarChart, 
  Users, 
  Settings, 
  FastForward, 
  LogOut 
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { workspaceId, loadingWorkspace } = useWorkspace();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Diagnosis', path: '/diagnosis', icon: Activity },
    { name: 'Interventions', path: '/interventions', icon: MessageSquare },
    { name: 'Results', path: '/results', icon: BarChart },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Simulator', path: '/simulator', icon: FastForward },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="text-xl font-semibold text-slate-900 tracking-tight">OnboardIQ</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Workspace</h1>
          <div className="flex items-center text-sm text-slate-500">
            {user.email}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {loadingWorkspace ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Loading workspace...</p>
            </div>
          ) : !workspaceId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">Failed to load workspace.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

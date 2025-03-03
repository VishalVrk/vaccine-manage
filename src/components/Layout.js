import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, LogOut, PlusCircle, BarChart } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Layout = ({ children, userRole }) => {
  const location = useLocation();

  // Define navigation items based on user role
  const adminNav = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/vaccine-record', label: 'Appointment Records', icon: Calendar },
    { path: '/vaccine-appointment', label: 'Appointment Management System', icon: PlusCircle },
    { path: '/report-generation', label: 'Report Generation', icon: PlusCircle },
    { path: '/remainder-system', label: 'Reminder System', icon: BarChart }
  ];

  const patientNav = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
  ];

  const navigationItems = userRole === "admin" ? adminNav : patientNav;

  const isActivePath = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="px-4 py-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Healthcare Dashboard</h2>
        </div>

        {/* Navigation Links */}
        <nav className="py-4">
          <div className="px-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                    isActivePath(item.path) ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="px-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isEmployer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', forAll: true },
    { name: 'Employees', href: '/employees', forEmployer: true },
    { name: 'Leaves', href: '/leaves', forAll: true },
    { name: 'Attendance', href: '/attendance', forEmployer: true },
    { name: 'Payroll', href: '/payroll', forEmployer: true },
    { name: 'Payslips', href: '/payslips', forAll: true },
    { name: 'Holidays', href: '/holidays', forEmployer: true },
    { name: 'Reports', href: '/reports', forEmployer: true },
    { name: 'Settings', href: '/settings', forAdmin: true },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if ((item as any).forAll) return true;
    if ((item as any).forEmployer && isEmployer) return true;
    if ((item as any).forAdmin && isAdmin) return true;
    return false;
  });

  useEffect(() => {
    const fetchPendingLeaves = async () => {
      if (isEmployer) {
        try {
          const response = await api.getLeaves({ status: 'PENDING' });
          if ((response as any).success) {
            setPendingLeavesCount(((response as any).data || []).length);
          }
        } catch {}
      }
    };
    fetchPendingLeaves();
    const interval = setInterval(fetchPendingLeaves, 120000);
    return () => clearInterval(interval);
  }, [isEmployer]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo + nav links */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2 mr-6">
                <img src="/logo.svg" alt="Al Barakah MCSL" className="h-10 w-10 object-contain" />
                <span className="hidden sm:block text-sm font-bold text-green-800 leading-tight">
                  Al Barakah<br />MCSL
                </span>
              </Link>
              <div className="hidden md:flex md:space-x-4">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium h-16 ${
                      location.pathname.startsWith(item.href)
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                    {item.name === 'Leaves' && isEmployer && pendingLeavesCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                        {pendingLeavesCount > 9 ? '9+' : pendingLeavesCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: User menu + logout */}
            <div className="flex items-center gap-3">
              {/* User dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-primary-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden lg:inline">
                    {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile & Settings
                    </Link>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Logout
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white pb-3">
            <div className="space-y-1 px-4 pt-2">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname.startsWith(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                  {item.name === 'Leaves' && isEmployer && pendingLeavesCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                      {pendingLeavesCount > 9 ? '9+' : pendingLeavesCount}
                    </span>
                  )}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100"
              >
                Profile & Settings
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

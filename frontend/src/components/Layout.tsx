import React, { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isEmployer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', forAll: true },
    { name: 'Employees', href: '/employees', forEmployer: true },
    { name: 'Leaves', href: '/leaves', forAll: true },
    { name: 'Attendance', href: '/attendance', forEmployer: true },
    { name: 'Payroll', href: '/payroll', forAll: true },
    { name: 'Payslips', href: '/payslips', forAll: true },
    { name: 'Holidays', href: '/holidays', forAll: true },
    { name: 'Reports', href: '/reports', forEmployer: true },
    { name: 'Settings', href: '/settings', forAdmin: true },
  ];

  const filteredNavigation = navigation.filter((item: any) => {
    if (item.forAll) return true;
    if (item.forEmployer && isEmployer) return true;
    if (item.forAdmin && isAdmin) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-xl font-bold text-primary-600">
                  ELPMS
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname.startsWith(item.href)
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                <Link
                  to="/profile"
                  className="text-sm text-gray-700 hover:text-primary-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {user?.employee
                    ? `${user.employee.firstName} ${user.employee.lastName}`
                    : user?.email}
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

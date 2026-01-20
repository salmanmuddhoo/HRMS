import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { DashboardStats, ApiResponse } from '../types';
import Layout from '../components/Layout';

const Dashboard: React.FC = () => {
  const { user, isEmployer } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response: ApiResponse<DashboardStats> = await api.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}!
        </h1>

        {isEmployer && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.totalEmployees}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">On Leave Today</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.onLeaveToday}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.pendingLeaves}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Monthly Payroll</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          ${stats.currentMonthPayroll.totalAmount.toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Leaves */}
            {stats.recentLeaves.length > 0 && (
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Pending Leave Approvals
                  </h3>
                  <div className="space-y-3">
                    {stats.recentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {leave.leaveType} - {new Date(leave.startDate).toLocaleDateString()} to{' '}
                            {new Date(leave.endDate).toLocaleDateString()} ({leave.totalDays} days)
                          </p>
                        </div>
                        <Link
                          to={`/leaves/${leave.id}`}
                          className="text-sm text-primary-600 hover:text-primary-900"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/leaves?status=PENDING"
                    className="mt-4 text-sm text-primary-600 hover:text-primary-900 block"
                  >
                    View all pending leaves →
                  </Link>
                </div>
              </div>
            )}

            {/* Upcoming Holidays */}
            {stats.upcomingHolidays.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Upcoming Holidays
                  </h3>
                  <div className="space-y-3">
                    {stats.upcomingHolidays.map((holiday) => (
                      <div key={holiday.id} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                          <p className="text-sm text-gray-500">{holiday.description}</p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(holiday.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!isEmployer && user?.employee && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Leave Balance</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Local Leave: <span className="font-semibold">{user.employee.localLeaveBalance} days</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Sick Leave: <span className="font-semibold">{user.employee.sickLeaveBalance} days</span>
                  </p>
                </div>
                <Link
                  to="/leaves/apply"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Apply for Leave
                </Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-2">My Leaves</h3>
                <Link to="/leaves" className="text-primary-600 hover:text-primary-900">
                  View all leaves →
                </Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Payslips</h3>
                <Link to="/payslips" className="text-primary-600 hover:text-primary-900">
                  View payslips →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

interface Leave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  rejectionReason?: string;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  jobTitle: string;
  status: string;
  localLeaveBalance: number;
  sickLeaveBalance: number;
  joiningDate: string;
  user?: { role: string };
}

const Employees: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [leaveHistory, setLeaveHistory] = useState<{ emp: Employee; leaves: Leave[] } | null>(null);
  const [leaveHistoryLoading, setLeaveHistoryLoading] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [compLabel, setCompLabel] = useState('');
  const [compAmount, setCompAmount] = useState('');
  const [settingComp, setSettingComp] = useState(false);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, deptFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      const res = await api.getEmployees(params);
      if ((res as any).success) setEmployees((res as any).data || []);
    } catch {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!window.confirm(`Deactivate ${emp.firstName} ${emp.lastName}?`)) return;
    setActionId(emp.id);
    try {
      const res = await api.deactivateEmployee(emp.id);
      if ((res as any).success) { showMsg('success', 'Employee deactivated.'); fetchEmployees(); }
    } catch { showMsg('error', 'Failed to deactivate.'); }
    setActionId(null);
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`Permanently DELETE ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) return;
    setActionId(emp.id);
    try {
      const res = await api.deleteEmployee(emp.id);
      if ((res as any).success) { showMsg('success', 'Employee deleted permanently.'); fetchEmployees(); }
    } catch { showMsg('error', 'Failed to delete employee.'); }
    setActionId(null);
  };

  const handleResetPassword = async () => {
    if (!showResetModal || newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try {
      const res = await api.resetEmployeePassword(showResetModal, newPassword);
      if ((res as any).success) { showMsg('success', 'Password reset.'); setShowResetModal(null); setNewPassword(''); }
    } catch { showMsg('error', 'Failed to reset password.'); }
  };

  const handleBulkCompensation = async () => {
    if (!compLabel.trim()) { setError('Enter a compensation label (e.g. Compensation 2025)'); return; }
    const amount = parseFloat(compAmount);
    if (isNaN(amount) || amount < 0) { setError('Enter a valid amount'); return; }
    setSettingComp(true);
    try {
      const res = await api.bulkSetCompensation(compLabel.trim(), amount);
      if ((res as any).success) {
        showMsg('success', (res as any).message || 'Compensation updated for all active employees');
        setShowCompModal(false);
        setCompLabel('');
        setCompAmount('');
        fetchEmployees();
      }
    } catch { showMsg('error', 'Failed to set compensation'); }
    setSettingComp(false);
  };

  const handleViewLeaves = async (emp: Employee) => {
    setLeaveHistoryLoading(true);
    setLeaveHistory({ emp, leaves: [] });
    try {
      const res = await api.getLeaves({ employeeId: emp.id });
      if ((res as any).success) setLeaveHistory({ emp, leaves: (res as any).data || [] });
    } catch { setError('Failed to load leave history.'); setLeaveHistory(null); }
    setLeaveHistoryLoading(false);
  };

  const visibleEmployees = isAdmin ? employees : employees.filter(e => e.user?.role !== 'ADMIN');
  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', INACTIVE: 'bg-gray-100 text-gray-600', SUSPENDED: 'bg-red-100 text-red-700' };
    return `px-2 py-0.5 text-xs font-medium rounded-full ${m[s] || 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <div className="flex gap-2">
            {(isAdmin || user?.role === 'TREASURER') && (
              <button
                onClick={() => { setShowCompModal(true); setCompLabel(''); setCompAmount(''); }}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
              >
                Set Compensation
              </button>
            )}
            {isAdmin && (
              <Link
                to="/employees/add"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
              >
                + Add Employee
              </Link>
            )}
          </div>
        </div>

        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="text-center text-gray-500 py-16">No employees found.</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-gray-500">{emp.employeeId} · {emp.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{emp.department}</div>
                        <div className="text-xs text-gray-500">{emp.jobTitle}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          {emp.user?.role || 'EMPLOYEE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={statusBadge(emp.status)}>{emp.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        <div>Annual: {emp.localLeaveBalance}d</div>
                        <div>Sick: {emp.sickLeaveBalance}d</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1.5">
                          <Link
                            to={`/employees/${emp.id}/edit`}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleViewLeaves(emp)}
                            className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100"
                          >
                            Leaves
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => { setShowResetModal(emp.id); setNewPassword(''); }}
                              className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded hover:bg-yellow-100"
                            >
                              Reset PW
                            </button>
                          )}
                          {isAdmin && emp.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeactivate(emp)}
                              disabled={actionId === emp.id}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(emp)}
                              disabled={actionId === emp.id}
                              className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leave History Modal */}
        {leaveHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  Leave History — {leaveHistory.emp.firstName} {leaveHistory.emp.lastName}
                </h3>
                <button onClick={() => setLeaveHistory(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {leaveHistoryLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
                ) : leaveHistory.leaves.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No leave records found.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaveHistory.leaves.map((leave) => {
                        const statusColors: Record<string, string> = {
                          PENDING: 'bg-yellow-100 text-yellow-800',
                          APPROVED: 'bg-green-100 text-green-800',
                          REJECTED: 'bg-red-100 text-red-800',
                        };
                        return (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${leave.leaveType === 'LOCAL' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {leave.leaveType === 'LOCAL' ? 'Annual' : 'Sick'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              <div>{new Date(leave.startDate).toLocaleDateString()}</div>
                              {leave.isHalfDay ? (
                                <div className="text-xs text-purple-600">{leave.halfDayPeriod === 'MORNING' ? 'Morning' : 'Afternoon'} half-day</div>
                              ) : (
                                <div className="text-xs text-gray-400">to {new Date(leave.endDate).toLocaleDateString()}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{leave.totalDays}d</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{leave.reason}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[leave.status] || ''}`}>
                                {leave.status}
                              </span>
                              {leave.status === 'REJECTED' && leave.rejectionReason && (
                                <div className="text-xs text-red-500 mt-0.5">{leave.rejectionReason}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 border-t flex justify-end">
                <button onClick={() => setLeaveHistory(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Reset Employee Password</h3>
              <p className="text-sm text-gray-600 mb-3">Enter a new password for this employee:</p>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowResetModal(null); setNewPassword(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={newPassword.length < 6}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Compensation Modal */}
      {showCompModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Set Compensation</h3>
              <button onClick={() => setShowCompModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will add or update a compensation entry for <strong>all active employees</strong>. Previous years' compensations are preserved. Individual employees can have their amounts overridden from their profile.
            </p>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Compensation Label</label>
              <input
                type="text"
                value={compLabel}
                onChange={(e) => setCompLabel(e.target.value)}
                placeholder="e.g. Compensation 2025"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs)</label>
              <input
                type="number"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="e.g. 1300"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCompensation}
                disabled={settingComp || !compLabel.trim() || !compAmount}
                className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {settingComp ? 'Applying...' : 'Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Employees;

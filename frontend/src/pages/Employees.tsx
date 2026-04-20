import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

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
          <Link
            to="/employees/add"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            + Add Employee
          </Link>
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
        ) : employees.length === 0 ? (
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
                  {employees.map((emp) => (
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
                            onClick={() => { setShowResetModal(emp.id); setNewPassword(''); }}
                            className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded hover:bg-yellow-100"
                          >
                            Reset PW
                          </button>
                          {emp.status === 'ACTIVE' && (
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
    </Layout>
  );
};

export default Employees;

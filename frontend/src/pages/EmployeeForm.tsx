import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

interface LeaveDefaults {
  defaultLocalLeave: number;
  defaultSickLeave: number;
}

const EmployeeForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchingDefaults, setFetchingDefaults] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveDefaults, setLeaveDefaults] = useState<LeaveDefaults>({ defaultLocalLeave: 15, defaultSickLeave: 10 });
  const [useProration, setUseProration] = useState(true);
  const [manualLeave, setManualLeave] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    department: '',
    jobTitle: '',
    joiningDate: '',
    baseSalary: '',
    travellingAllowance: '',
    otherAllowances: '',
    localLeaveBalance: '',
    sickLeaveBalance: '',
    password: '',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
  });

  // Compensation entries management (edit mode only)
  const [compensations, setCompensations] = useState<{ id: string; label: string; amount: string }[]>([]);
  const [removedCompensationIds, setRemovedCompensationIds] = useState<string[]>([]);
  const [newCompLabel, setNewCompLabel] = useState('');
  const [newCompAmount, setNewCompAmount] = useState('');
  const [compError, setCompError] = useState('');

  useEffect(() => {
    fetchLeaveDefaults();
    if (isEdit) {
      fetchEmployee();
    }
  }, [id]);

  const fetchLeaveDefaults = async () => {
    try {
      const response = await api.getLeaveDefaults();
      if ((response as any).success) {
        setLeaveDefaults((response as any).data);
      }
    } catch (error) {
      console.error('Failed to fetch leave defaults:', error);
    } finally {
      setFetchingDefaults(false);
    }
  };

  const fetchEmployee = async () => {
    try {
      const response = await api.getEmployee(id!);
      if ((response as any).success) {
        const emp = (response as any).data;
        setFormData({
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone || '',
          nationalId: emp.nationalId || '',
          department: emp.department,
          jobTitle: emp.jobTitle,
          joiningDate: new Date(emp.joiningDate).toISOString().split('T')[0],
          baseSalary: emp.baseSalary.toString(),
          travellingAllowance: emp.travellingAllowance?.toString() || '',
          otherAllowances: emp.otherAllowances?.toString() || '',
          localLeaveBalance: emp.localLeaveBalance.toString(),
          sickLeaveBalance: emp.sickLeaveBalance.toString(),
          password: '',
          role: emp.user?.role || 'EMPLOYEE',
          status: emp.status,
        });
        setManualLeave(true);
        setCompensations(
          (emp.compensations || []).map((c: any) => ({
            id: c.id,
            label: c.label,
            amount: Number(c.amount).toString(),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      setError('Failed to load employee data');
    }
  };

  const handleDeleteCompensation = (idx: number) => {
    const entry = compensations[idx];
    if (entry.id) {
      setRemovedCompensationIds(prev => [...prev, entry.id]);
    }
    setCompensations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddCompensation = () => {
    const amt = parseFloat(newCompAmount);
    if (!newCompLabel.trim() || isNaN(amt) || amt < 0) { setCompError('Valid label and amount required'); return; }
    setCompError('');
    setCompensations(prev => [...prev, { id: '', label: newCompLabel.trim(), amount: amt.toString() }]);
    setNewCompLabel('');
    setNewCompAmount('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calculate prorated leave when joining date changes
  const calculateProratedLeave = (annualLeave: number, joiningDateStr: string): number => {
    if (!joiningDateStr) return annualLeave;

    const joiningDate = new Date(joiningDateStr);
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);

    if (joiningDate < yearStart) return annualLeave;
    if (joiningDate > yearEnd) return 0;

    const remainingMonths = 12 - joiningDate.getMonth();
    return Math.ceil((annualLeave / 12) * remainingMonths);
  };

  const getProratedLocal = () => calculateProratedLeave(leaveDefaults.defaultLocalLeave, formData.joiningDate);
  const getProratedSick = () => calculateProratedLeave(leaveDefaults.defaultSickLeave, formData.joiningDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData: any = {
        ...formData,
        useProration,
      };

      // If not using manual leave, clear the values so backend calculates them
      if (!manualLeave) {
        submitData.localLeaveBalance = null;
        submitData.sickLeaveBalance = null;
      }

      let response;
      if (isEdit) {
        response = await api.updateEmployee(id!, submitData);
      } else {
        response = await api.createEmployee(submitData);
      }

      if ((response as any).success) {
        if (isEdit) {
          // Sync compensation changes: delete removed entries, upsert current ones
          await Promise.all(removedCompensationIds.map(cid => api.deleteEmployeeCompensation(id!, cid)));
          await Promise.all(
            compensations.map(c => {
              const amt = parseFloat(c.amount);
              if (!c.label.trim() || isNaN(amt)) return Promise.resolve();
              return api.upsertEmployeeCompensation(id!, c.label.trim(), amt);
            })
          );
        }
        navigate('/employees');
      } else {
        setError((response as any).error || 'Failed to save employee');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!window.confirm(`Are you sure you want to reset the password for ${formData.firstName} ${formData.lastName}?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setResettingPassword(true);

    try {
      const response = await api.resetEmployeePassword(id!, newPassword);
      if ((response as any).success) {
        setSuccess('Password reset successfully');
        setNewPassword('');
        setShowResetPassword(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  if (fetchingDefaults) {
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? 'Edit Employee' : 'Add New Employee'}
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Reset Password Section (only in edit mode) */}
        {isEdit && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Reset Password</h2>
              {!showResetPassword && (
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Reset Password
                </button>
              )}
            </div>

            {showResetPassword && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    minLength={6}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This will reset the employee's password immediately.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword || !newPassword}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    {resettingPassword ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setNewPassword('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                disabled={isEdit}
                placeholder="e.g., EMP006"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isEdit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">National ID *</label>
              <input
                type="text"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                required
                placeholder="e.g. A1234567890123"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Joining Date *</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            {/* Job Info */}
            <div className="md:col-span-2 mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Job Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                placeholder="e.g., Engineering, HR, Finance"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Title *</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="EMPLOYER">Employer / Manager</option>
                <option value="DIRECTOR">Director</option>
                <option value="TREASURER">Treasurer</option>
                <option value="SECRETARY">Secretary</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            )}

            {/* Salary Info */}
            <div className="md:col-span-2 mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Salary Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Base Salary *</label>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Travelling Allowance</label>
              <input
                type="number"
                name="travellingAllowance"
                value={formData.travellingAllowance}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Other Allowances</label>
              <input
                type="number"
                name="otherAllowances"
                value={formData.otherAllowances}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
            </div>

            {/* Leave Info */}
            <div className="md:col-span-2 mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Balance</h2>
              <div className="bg-blue-50 p-4 rounded-md mb-4">
                <p className="text-sm text-blue-700">
                  Default Annual Leave: <strong>{leaveDefaults.defaultLocalLeave} days</strong> |
                  Default Sick Leave: <strong>{leaveDefaults.defaultSickLeave} days</strong>
                </p>
                {formData.joiningDate && useProration && !manualLeave && (
                  <p className="text-sm text-blue-700 mt-1">
                    Prorated for joining date: Local: <strong>{getProratedLocal()} days</strong> |
                    Sick: <strong>{getProratedSick()} days</strong>
                  </p>
                )}
              </div>

              {!isEdit && (
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={useProration}
                      onChange={(e) => setUseProration(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Prorate leaves based on joining date</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={manualLeave}
                      onChange={(e) => setManualLeave(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Set leave balance manually</span>
                  </label>
                </div>
              )}
            </div>

            {(manualLeave || isEdit) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Local Leave Balance</label>
                  <input
                    type="number"
                    name="localLeaveBalance"
                    value={formData.localLeaveBalance}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Sick Leave Balance</label>
                  <input
                    type="number"
                    name="sickLeaveBalance"
                    value={formData.sickLeaveBalance}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>
              </>
            )}

            {/* Compensations (edit mode only) */}
            {isEdit && (
              <div className="md:col-span-2 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-1">Compensations</h2>
                <p className="text-sm text-gray-500 mb-4">Each year's compensation is a separate entry. Changes are saved when you click "Update Employee".</p>
                {compError && <p className="mb-2 text-sm text-red-600">{compError}</p>}
                {compensations.length > 0 && (
                  <table className="w-full text-sm mb-4">
                    <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-600">Label</th><th className="px-3 py-2 text-right font-medium text-gray-600">Amount (Rs)</th><th className="px-3 py-2"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {compensations.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <input value={c.label} readOnly className="w-full border-0 bg-transparent text-gray-700 focus:outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={c.amount} min="0" step="0.01"
                              onChange={(e) => setCompensations(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                              className="w-full text-right border border-gray-300 rounded px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => handleDeleteCompensation(i)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                    <input type="text" value={newCompLabel} onChange={(e) => setNewCompLabel(e.target.value)}
                      placeholder="e.g. Compensation 2025"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs text-gray-500 mb-1">Amount (Rs)</label>
                    <input type="number" value={newCompAmount} onChange={(e) => setNewCompAmount(e.target.value)}
                      min="0" step="0.01" placeholder="0.00"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <button type="button" onClick={handleAddCompensation} disabled={!newCompLabel.trim() || !newCompAmount}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50">
                    + Add
                  </button>
                </div>
              </div>
            )}

            {/* Password (only for new employees) */}
            {!isEdit && (
              <>
                <div className="md:col-span-2 mt-4">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Account</h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave empty for default (Employee@123)"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                  <p className="mt-1 text-sm text-gray-500">Default password: Employee@123</p>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EmployeeForm;

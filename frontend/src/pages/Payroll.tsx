import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employee: Employee;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absenceDays: number;
  baseSalary: number;
  travellingAllowance: number;
  otherAllowances: number;
  travellingDeduction: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'DRAFT' | 'APPROVED' | 'LOCKED';
  remarks?: string;
}

const Payroll: React.FC = () => {
  const { isEmployer } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);

  // View/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [editData, setEditData] = useState({
    baseSalary: '',
    travellingAllowance: '',
    otherAllowances: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getPayrolls({
        month: selectedMonth,
        year: selectedYear,
      });
      if ((response as any).success) {
        setPayrolls((response as any).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleProcessPayroll = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.processPayroll(selectedMonth, selectedYear);
      if ((response as any).success) {
        setSuccess(`Payroll processed for ${(response as any).data?.length || 0} employees`);
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setError('');
      const response = await api.approvePayroll(id);
      if ((response as any).success) {
        setSuccess('Payroll approved successfully');
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const handleLock = async (id: string) => {
    try {
      setError('');
      const response = await api.lockPayroll(id);
      if ((response as any).success) {
        setSuccess('Payroll locked successfully');
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to lock payroll');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) return;

    try {
      setError('');
      const response = await api.deletePayroll(id);
      if ((response as any).success) {
        setSuccess('Payroll deleted successfully');
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete payroll');
    }
  };

  const handleApproveAll = async () => {
    const draftPayrolls = payrolls.filter(p => p.status === 'DRAFT');
    if (draftPayrolls.length === 0) {
      setError('No draft payrolls to approve');
      return;
    }

    if (!window.confirm(`Approve all ${draftPayrolls.length} draft payrolls?`)) return;

    try {
      setError('');
      for (const payroll of draftPayrolls) {
        await api.approvePayroll(payroll.id);
      }
      setSuccess(`${draftPayrolls.length} payrolls approved`);
      fetchPayrolls();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to approve payrolls');
      fetchPayrolls();
    }
  };

  const handleLockAll = async () => {
    const approvedPayrolls = payrolls.filter(p => p.status === 'APPROVED');
    if (approvedPayrolls.length === 0) {
      setError('No approved payrolls to lock');
      return;
    }

    if (!window.confirm(`Lock all ${approvedPayrolls.length} approved payrolls?`)) return;

    try {
      setError('');
      for (const payroll of approvedPayrolls) {
        await api.lockPayroll(payroll.id);
      }
      setSuccess(`${approvedPayrolls.length} payrolls locked`);
      fetchPayrolls();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to lock payrolls');
      fetchPayrolls();
    }
  };

  const openEditModal = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setEditData({
      baseSalary: payroll.baseSalary.toString(),
      travellingAllowance: payroll.travellingAllowance.toString(),
      otherAllowances: payroll.otherAllowances.toString(),
      remarks: payroll.remarks || '',
    });
    setShowModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSaving(true);
    setError('');

    try {
      const response = await api.updatePayroll(selectedPayroll.id, editData);
      if ((response as any).success) {
        setSuccess('Payroll updated successfully');
        setShowModal(false);
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update payroll');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      LOCKED: 'bg-gray-100 text-gray-800',
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Summary calculations
  const totalGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const draftCount = payrolls.filter(p => p.status === 'DRAFT').length;
  const approvedCount = payrolls.filter(p => p.status === 'APPROVED').length;
  const lockedCount = payrolls.filter(p => p.status === 'LOCKED').length;

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Month/Year Selection & Process */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {isEmployer && payrolls.length === 0 && (
              <button
                onClick={handleProcessPayroll}
                disabled={processing}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Process Payroll'}
              </button>
            )}
            {isEmployer && payrolls.length > 0 && draftCount > 0 && (
              <button
                onClick={handleApproveAll}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve All ({draftCount})
              </button>
            )}
            {isEmployer && payrolls.length > 0 && approvedCount > 0 && (
              <button
                onClick={handleLockAll}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Lock All ({approvedCount})
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {payrolls.length > 0 && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Employees</div>
              <div className="text-2xl font-bold text-gray-900">{payrolls.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Gross</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totalGross)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Deductions</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Net</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalNet)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Status</div>
              <div className="flex gap-2 mt-1">
                {draftCount > 0 && <span className={getStatusBadge('DRAFT')}>{draftCount} Draft</span>}
                {approvedCount > 0 && <span className={getStatusBadge('APPROVED')}>{approvedCount} Approved</span>}
                {lockedCount > 0 && <span className={getStatusBadge('LOCKED')}>{lockedCount} Locked</span>}
              </div>
            </div>
          </div>
        )}

        {/* Payroll Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            <p>No payroll records for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.</p>
            {isEmployer && (
              <p className="mt-2 text-sm">Click "Process Payroll" to generate payroll for all active employees.</p>
            )}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    {isEmployer && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrolls.map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payroll.employee.firstName} {payroll.employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payroll.employee.employeeId} &bull; {payroll.employee.department}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          <div>Working: {payroll.workingDays}</div>
                          <div className="text-green-600">Present: {payroll.presentDays}</div>
                          <div className="text-blue-600">Leave: {payroll.leaveDays}</div>
                          {payroll.absenceDays > 0 && (
                            <div className="text-red-600">Absent: {payroll.absenceDays}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(payroll.baseSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(payroll.travellingAllowance + payroll.otherAllowances)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Travel: {formatCurrency(payroll.travellingAllowance)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-red-600">
                          -{formatCurrency(payroll.totalDeductions)}
                        </div>
                        {payroll.travellingDeduction > 0 && (
                          <div className="text-xs text-gray-500">
                            Travel ded: {formatCurrency(payroll.travellingDeduction)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-700">
                        {formatCurrency(payroll.netSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={getStatusBadge(payroll.status)}>{payroll.status}</span>
                      </td>
                      {isEmployer && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {payroll.status !== 'LOCKED' && (
                              <button
                                onClick={() => openEditModal(payroll)}
                                className="text-primary-600 hover:text-primary-900 text-sm"
                              >
                                Edit
                              </button>
                            )}
                            {payroll.status === 'DRAFT' && (
                              <button
                                onClick={() => handleApprove(payroll.id)}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Approve
                              </button>
                            )}
                            {payroll.status === 'APPROVED' && (
                              <button
                                onClick={() => handleLock(payroll.id)}
                                className="text-gray-600 hover:text-gray-900 text-sm"
                              >
                                Lock
                              </button>
                            )}
                            {payroll.status !== 'LOCKED' && (
                              <button
                                onClick={() => handleDelete(payroll.id)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showModal && selectedPayroll && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Edit Payroll - {selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}
              </h2>
              <form onSubmit={handleSaveEdit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.baseSalary}
                      onChange={(e) => setEditData({ ...editData, baseSalary: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Travelling Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.travellingAllowance}
                      onChange={(e) => setEditData({ ...editData, travellingAllowance: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.otherAllowances}
                      onChange={(e) => setEditData({ ...editData, otherAllowances: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    />
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Working Days:</span>
                      <span>{selectedPayroll.workingDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Present Days:</span>
                      <span className="text-green-600">{selectedPayroll.presentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Leave Days:</span>
                      <span className="text-blue-600">{selectedPayroll.leaveDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absence Days:</span>
                      <span className="text-red-600">{selectedPayroll.absenceDays}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={editData.remarks}
                    onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    placeholder="Optional remarks..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Payroll;

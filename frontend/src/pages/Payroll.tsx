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

interface PayrollAdjustment {
  label: string;
  type: 'DEDUCTION' | 'ADDITION';
  amount: string;
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
  compensation: number;
  travellingDeduction: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'DRAFT' | 'APPROVED' | 'LOCKED';
  remarks?: string;
  adjustments?: { label: string; type: 'DEDUCTION' | 'ADDITION'; amount: number }[];
  compensations?: { id: string; label: string; amount: number }[];
}

const Payroll: React.FC = () => {
  const { canProcessPayroll, canApprovePayroll, isAdmin } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [processing, setProcessing] = useState(false);
  const [cycleDates, setCycleDates] = useState<{ startDate: string; endDate: string } | null>(null);

  // View/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [editData, setEditData] = useState({
    baseSalary: '',
    travellingAllowance: '',
    otherAllowances: '',
    remarks: '',
  });
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [saving, setSaving] = useState(false);

  const [approvingAll, setApprovingAll] = useState(false);
  const [lockingAll, setLockingAll] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const [payrollRes, cycleRes] = await Promise.all([
        api.getPayrolls({ month: selectedMonth, year: selectedYear }),
        api.getPayrollCycle(selectedMonth, selectedYear),
      ]);
      if ((payrollRes as any).success) {
        setPayrolls((payrollRes as any).data || []);
      }
      if ((cycleRes as any).success) {
        const d = (cycleRes as any).data;
        setCycleDates({ startDate: d.startDate, endDate: d.endDate });
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

  const handleResetPayroll = async () => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;
    const first = window.confirm(
      `WARNING: This will permanently delete all payroll records for ${monthLabel} ${selectedYear}, including any approved or locked records.\n\nAll payslips for this period will also be deleted.\n\nDo you want to proceed?`
    );
    if (!first) return;

    const second = window.confirm(
      `FINAL CONFIRMATION\n\nYou are about to reset payroll for ${monthLabel} ${selectedYear}. This action cannot be undone.\n\nAfter reset, payroll will need to be reprocessed from scratch.\n\nAre you absolutely sure?`
    );
    if (!second) return;

    try {
      setError('');
      const response = await api.resetPayroll(selectedMonth, selectedYear);
      if ((response as any).success) {
        setSuccess(`Payroll for ${monthLabel} ${selectedYear} has been reset. You can now reprocess it.`);
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reset payroll');
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

    setApprovingAll(true);
    setError('');
    try {
      for (const payroll of draftPayrolls) {
        await api.approvePayroll(payroll.id);
      }
      setSuccess(`${draftPayrolls.length} payrolls approved`);
      fetchPayrolls();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to approve payrolls');
      fetchPayrolls();
    } finally {
      setApprovingAll(false);
    }
  };

  const handleLockAll = async () => {
    const approvedPayrolls = payrolls.filter(p => p.status === 'APPROVED');
    if (approvedPayrolls.length === 0) {
      setError('No approved payrolls to lock');
      return;
    }

    if (!window.confirm(`Lock all ${approvedPayrolls.length} approved payrolls?`)) return;

    setLockingAll(true);
    setError('');
    try {
      for (const payroll of approvedPayrolls) {
        await api.lockPayroll(payroll.id);
      }
      setSuccess(`${approvedPayrolls.length} payrolls locked`);
      fetchPayrolls();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to lock payrolls');
      fetchPayrolls();
    } finally {
      setLockingAll(false);
    }
  };

  const STATUTORY_LABELS = ['CSG', 'NSF'];

  const openEditModal = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setEditData({
      baseSalary: payroll.baseSalary.toString(),
      travellingAllowance: payroll.travellingAllowance.toString(),
      otherAllowances: payroll.otherAllowances.toString(),
      remarks: payroll.remarks || '',
    });
    // Exclude statutory adjustments — they are auto-recalculated server-side
    setAdjustments(
      (payroll.adjustments || [])
        .filter(a => !STATUTORY_LABELS.includes(a.label))
        .map(a => ({ label: a.label, type: a.type, amount: a.amount.toString() }))
    );
    setShowModal(true);
  };

  const addAdjustmentRow = () => {
    setAdjustments(prev => [...prev, { label: '', type: 'DEDUCTION', amount: '' }]);
  };

  const removeAdjustmentRow = (idx: number) => {
    setAdjustments(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAdjustmentRow = (idx: number, field: keyof PayrollAdjustment, value: string) => {
    setAdjustments(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSaving(true);
    setError('');

    try {
      const response = await api.updatePayroll(selectedPayroll.id, { ...editData, adjustments });
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
  const totalGross = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);
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
          {cycleDates && (
            <p className="text-sm text-gray-500 mb-3">
              Attendance period: <span className="font-medium text-gray-700">{cycleDates.startDate}</span> to <span className="font-medium text-gray-700">{cycleDates.endDate}</span>
            </p>
          )}
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
            {canProcessPayroll && payrolls.length === 0 && (
              <button
                onClick={handleProcessPayroll}
                disabled={processing}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Process Payroll'}
              </button>
            )}
            {canApprovePayroll && payrolls.length > 0 && draftCount > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {approvingAll && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {approvingAll ? 'Approving...' : `Approve All (${draftCount})`}
              </button>
            )}
            {canProcessPayroll && payrolls.length > 0 && approvedCount > 0 && (
              <button
                onClick={handleLockAll}
                disabled={lockingAll}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                {lockingAll && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {lockingAll ? 'Locking...' : `Lock All (${approvedCount})`}
              </button>
            )}
            {isAdmin && payrolls.length > 0 && (
              <button
                onClick={handleResetPayroll}
                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 ml-auto"
              >
                Reset Payroll
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
            {canProcessPayroll && (
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
                    {(canProcessPayroll || canApprovePayroll) && (
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
                        {formatCurrency(Number(payroll.baseSalary))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(Number(payroll.travellingAllowance) + Number(payroll.otherAllowances))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Travel: {formatCurrency(Number(payroll.travellingAllowance))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-red-600">
                          -{formatCurrency(Number(payroll.totalDeductions))}
                        </div>
                        {Number(payroll.travellingDeduction) > 0 && (
                          <div className="text-xs text-gray-500">Travel: {formatCurrency(Number(payroll.travellingDeduction))}</div>
                        )}
                        {(payroll.adjustments || []).filter(a => a.type === 'DEDUCTION').map((a, i) => (
                          <div key={i} className="text-xs text-gray-500">{a.label}: {formatCurrency(Number(a.amount))}</div>
                        ))}
                        {(payroll.adjustments || []).filter(a => a.type === 'ADDITION').length > 0 && (
                          <div className="text-xs text-green-600">
                            +{formatCurrency((payroll.adjustments || []).filter(a => a.type === 'ADDITION').reduce((s, a) => s + Number(a.amount), 0))} additions
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-700">
                        {formatCurrency(Number(payroll.netSalary))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={getStatusBadge(payroll.status)}>{payroll.status}</span>
                      </td>
                      {(canProcessPayroll || canApprovePayroll) && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canProcessPayroll && payroll.status !== 'LOCKED' && (
                              <button
                                onClick={() => openEditModal(payroll)}
                                className="text-primary-600 hover:text-primary-900 text-sm"
                              >
                                Edit
                              </button>
                            )}
                            {canApprovePayroll && payroll.status === 'DRAFT' && (
                              <button
                                onClick={() => handleApprove(payroll.id)}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Approve
                              </button>
                            )}
                            {canProcessPayroll && payroll.status === 'APPROVED' && (
                              <button
                                onClick={() => handleLock(payroll.id)}
                                className="text-gray-600 hover:text-gray-900 text-sm"
                              >
                                Lock
                              </button>
                            )}
                            {canProcessPayroll && payroll.status !== 'LOCKED' && (
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Edit Payroll — {selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}
              </h2>
              <form onSubmit={handleSaveEdit}>

                {/* Base amounts */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                    <input type="number" step="0.01" value={editData.baseSalary}
                      onChange={(e) => setEditData({ ...editData, baseSalary: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Travelling Allowance</label>
                    <input type="number" step="0.01" value={editData.travellingAllowance}
                      onChange={(e) => setEditData({ ...editData, travellingAllowance: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances</label>
                    <input type="number" step="0.01" value={editData.otherAllowances}
                      onChange={(e) => setEditData({ ...editData, otherAllowances: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2" />
                  </div>
                </div>

                {/* Compensation lines (read-only snapshot) */}
                {selectedPayroll.compensations && selectedPayroll.compensations.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs font-semibold text-amber-700 mb-2">Compensations (snapshot from processing)</p>
                    {selectedPayroll.compensations.map((c) => (
                      <div key={c.id} className="flex justify-between text-sm text-amber-800">
                        <span>{c.label}</span>
                        <span>{formatCurrency(Number(c.amount))}</span>
                      </div>
                    ))}
                    <p className="text-xs text-amber-600 mt-1">To change compensation amounts, edit them on the employee's profile and reprocess payroll.</p>
                  </div>
                )}

                {/* Attendance summary */}
                <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600 grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="flex justify-between"><span>Working Days:</span><span>{selectedPayroll.workingDays}</span></div>
                  <div className="flex justify-between"><span>Present Days:</span><span className="text-green-600">{selectedPayroll.presentDays}</span></div>
                  <div className="flex justify-between"><span>Leave Days:</span><span className="text-blue-600">{selectedPayroll.leaveDays}</span></div>
                  <div className="flex justify-between"><span>Absence Days:</span><span className="text-red-600">{selectedPayroll.absenceDays}</span></div>
                </div>

                {/* Statutory deductions (read-only — recalculated server-side on save) */}
                {selectedPayroll.adjustments && selectedPayroll.adjustments.some(a => STATUTORY_LABELS.includes(a.label)) && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Statutory Deductions (auto-calculated)</p>
                    {selectedPayroll.adjustments.filter(a => STATUTORY_LABELS.includes(a.label)).map((a, i) => (
                      <div key={i} className="flex justify-between text-sm text-blue-800">
                        <span>{a.label}</span>
                        <span>{formatCurrency(Number(a.amount))}</span>
                      </div>
                    ))}
                    <p className="text-xs text-blue-600 mt-1">Recalculated automatically from Base Salary on each save.</p>
                  </div>
                )}

                {/* Adjustments */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">Additional Adjustments</h3>
                    <button type="button" onClick={addAdjustmentRow}
                      className="text-sm px-3 py-1 bg-primary-50 text-primary-700 border border-primary-300 rounded-md hover:bg-primary-100">
                      + Add Line
                    </button>
                  </div>

                  {adjustments.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No additional adjustments. Click "Add Line" to add extra deductions or bonus additions.</p>
                  )}

                  <div className="space-y-2">
                    {adjustments.map((adj, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Label (e.g. NPF)"
                          value={adj.label}
                          onChange={(e) => updateAdjustmentRow(idx, 'label', e.target.value)}
                          className="flex-1 rounded-md border-gray-300 border p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <select
                          value={adj.type}
                          onChange={(e) => updateAdjustmentRow(idx, 'type', e.target.value)}
                          className="rounded-md border-gray-300 border p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          <option value="DEDUCTION">Deduction</option>
                          <option value="ADDITION">Addition</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Amount"
                          value={adj.amount}
                          onChange={(e) => updateAdjustmentRow(idx, 'amount', e.target.value)}
                          className="w-28 rounded-md border-gray-300 border p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <button type="button" onClick={() => removeAdjustmentRow(idx)}
                          className="text-red-500 hover:text-red-700 text-lg font-bold px-1"
                          title="Remove">×</button>
                      </div>
                    ))}
                  </div>

                  {/* Live preview of totals */}
                  {adjustments.length > 0 && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-0.5">
                      {adjustments.filter(a => a.type === 'DEDUCTION' && a.amount).map((a, i) => (
                        <div key={i} className="flex justify-between text-red-600">
                          <span>− {a.label || 'Deduction'}</span>
                          <span>Rs {parseFloat(a.amount || '0').toFixed(2)}</span>
                        </div>
                      ))}
                      {adjustments.filter(a => a.type === 'ADDITION' && a.amount).map((a, i) => (
                        <div key={i} className="flex justify-between text-green-600">
                          <span>+ {a.label || 'Addition'}</span>
                          <span>Rs {parseFloat(a.amount || '0').toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea value={editData.remarks}
                    onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    placeholder="Optional remarks..." />
                </div>

                {/* Live Totals Preview */}
                {(() => {
                  const liveBase = parseFloat(editData.baseSalary) || 0;
                  const liveTA = parseFloat(editData.travellingAllowance) || 0;
                  const liveOA = parseFloat(editData.otherAllowances) || 0;
                  const liveComps = (selectedPayroll.compensations || []).reduce((s, c) => s + Number(c.amount), 0);
                  const liveAdditions = adjustments.filter(a => a.type === 'ADDITION').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                  const liveTotalEarnings = liveBase + liveTA + liveOA + liveComps + liveAdditions;
                  const liveCSG = liveBase <= 50000 ? liveBase * 0.015 : liveBase * 0.03;
                  const liveNSF = liveBase >= 21435 ? 21435 * 0.01 : liveBase * 0.01;
                  const liveTravelDed = Number(selectedPayroll.travellingDeduction || 0);
                  const liveUserDeds = adjustments.filter(a => a.type === 'DEDUCTION').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                  const liveTotalDeductions = liveTravelDed + liveCSG + liveNSF + liveUserDeds;
                  const liveNet = liveTotalEarnings - liveTotalDeductions;
                  return (
                    <div className="mb-4 p-3 bg-gray-900 text-white rounded-md text-sm">
                      <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Live Preview</p>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">Total Earnings</span>
                        <span className="font-semibold text-green-400">{formatCurrency(liveTotalEarnings)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">Total Deductions</span>
                        <span className="font-semibold text-red-400">{formatCurrency(liveTotalDeductions)}</span>
                      </div>
                      <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between">
                        <span className="font-semibold">Net Salary</span>
                        <span className="font-bold text-lg text-white">{formatCurrency(liveNet)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">CSG/NSF estimated from new base salary. Exact values calculated on save.</p>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
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

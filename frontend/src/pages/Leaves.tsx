import React, { useEffect, useState } from 'react';
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
  isUrgent: boolean;
  isHalfDay: boolean;
  rejectionReason?: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
  };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  localLeaveBalance: number;
  sickLeaveBalance: number;
}

const Leaves: React.FC = () => {
  const { user, isEmployer } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showAddForEmpModal, setShowAddForEmpModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [addForEmpData, setAddForEmpData] = useState({
    employeeId: '',
    leaveType: 'LOCAL' as 'LOCAL' | 'SICK',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'MORNING' as 'MORNING' | 'AFTERNOON',
  });

  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    leaveType: 'LOCAL',
    startDate: getTomorrow(),
    endDate: getTomorrow(),
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'MORNING' as 'MORNING' | 'AFTERNOON',
  });

  const getHolidaysInRange = (start: string, end: string) => {
    if (!start || !end) return [];
    return holidays.filter(h => {
      const d = h.date.split('T')[0];
      return d >= start && d <= end;
    });
  };

  useEffect(() => {
    fetchLeaves();
    api.getHolidays().then((res: any) => {
      if (res.success) setHolidays(res.data || []);
    }).catch(() => {});
    if (isEmployer) fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployees({ status: 'ACTIVE' });
      if ((res as any).success) setEmployees((res as any).data || []);
    } catch {}
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const response = await api.getLeaves(params);
      if ((response as any).success) {
        setLeaves((response as any).data || []);
      }
    } catch {
      setError('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this leave request?')) return;
    setActionLoading(id);

    const leaveBeingApproved = leaves.find(l => l.id === id);
    console.log('[handleApprove] Approving leave:', {
      id,
      leaveType: leaveBeingApproved?.leaveType,
      isHalfDay: leaveBeingApproved?.isHalfDay,
      startDate: leaveBeingApproved?.startDate,
      endDate: leaveBeingApproved?.endDate,
      totalDays: leaveBeingApproved?.totalDays,
      employeeId: leaveBeingApproved?.employee?.id,
      employeeName: `${leaveBeingApproved?.employee?.firstName} ${leaveBeingApproved?.employee?.lastName}`,
    });

    try {
      const res = await api.approveLeave(id);
      console.log('[handleApprove] API response:', res);
      if ((res as any).success) {
        console.log('[handleApprove] Leave approved. Updated leave data:', (res as any).data);
        showMsg('success', 'Leave approved successfully.');
        fetchLeaves();
      } else {
        console.warn('[handleApprove] API returned success=false:', res);
      }
    } catch (e: any) {
      console.error('[handleApprove] Error approving leave:', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
      });
      showMsg('error', e.response?.data?.error || 'Failed to approve leave.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectionReason.trim()) return;
    setActionLoading(showRejectModal);
    try {
      const res = await api.rejectLeave(showRejectModal, rejectionReason.trim());
      if ((res as any).success) {
        showMsg('success', 'Leave rejected.');
        setShowRejectModal(null);
        setRejectionReason('');
        fetchLeaves();
      }
    } catch (e: any) {
      showMsg('error', e.response?.data?.error || 'Failed to reject leave.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this leave request?')) return;
    setActionLoading(id);
    try {
      const res = await api.cancelLeave(id);
      if ((res as any).success) {
        showMsg('success', 'Leave cancelled.');
        fetchLeaves();
      }
    } catch (e: any) {
      showMsg('error', e.response?.data?.error || 'Failed to cancel leave.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddForEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForEmpData.employeeId) { setError('Please select an employee.'); return; }
    setSubmitting(true);
    setError('');

    console.log('[handleAddForEmpSubmit] Adding urgent leave:', {
      employeeId: addForEmpData.employeeId,
      leaveType: addForEmpData.leaveType,
      isHalfDay: addForEmpData.isHalfDay,
      startDate: addForEmpData.startDate,
      endDate: addForEmpData.endDate,
    });

    try {
      const res = await api.addUrgentLeave(addForEmpData);
      console.log('[handleAddForEmpSubmit] API response:', res);
      if ((res as any).success) {
        console.log('[handleAddForEmpSubmit] Urgent leave added. Data:', (res as any).data);
        showMsg('success', 'Leave added and balance adjusted.');
        setShowAddForEmpModal(false);
        setAddForEmpData({ employeeId: '', leaveType: 'LOCAL', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDayPeriod: 'MORNING' });
        fetchLeaves();
        fetchEmployees();
      }
    } catch (e: any) {
      console.error('[handleAddForEmpSubmit] Error:', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
      });
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to add leave.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.applyLeave(formData);
      if ((res as any).success) {
        showMsg('success', 'Leave application submitted!');
        setShowApplyModal(false);
        setFormData({ leaveType: 'LOCAL', startDate: getTomorrow(), endDate: getTomorrow(), reason: '', isHalfDay: false, halfDayPeriod: 'MORNING' });
        fetchLeaves();
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit leave.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-600',
    };
    return `px-2 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEmployer ? 'Leave Management' : 'My Leaves'}
          </h1>
          {isEmployer ? (
            <button
              onClick={() => { setShowAddForEmpModal(true); setError(''); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              + Add Leave for Employee
            </button>
          ) : (
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              + Apply for Leave
            </button>
          )}
        </div>

        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>}

        {/* Leave balance for employees */}
        {!isEmployer && user?.employee && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs font-medium text-blue-600 mb-1">Annual Leave</p>
              <p className="text-3xl font-bold text-blue-700">{user.employee.localLeaveBalance}</p>
              <p className="text-xs text-blue-500">days available</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-xs font-medium text-orange-600 mb-1">Sick Leave</p>
              <p className="text-3xl font-bold text-orange-700">{user.employee.sickLeaveBalance}</p>
              <p className="text-xs text-orange-500">days available</p>
            </div>
          </div>
        )}

        {/* Leaves table */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {isEmployer ? 'All Leave Requests' : 'My Leave History'}
            </h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {isEmployer && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Filter by employee name..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full sm:w-72 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          )}

          {(() => {
            const filtered = isEmployer && employeeSearch
              ? leaves.filter((l) => {
                  const name = `${l.employee?.firstName ?? ''} ${l.employee?.lastName ?? ''}`.toLowerCase();
                  return name.includes(employeeSearch.toLowerCase());
                })
              : leaves;
            return filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No leaves found.</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {isEmployer && <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>}
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      {isEmployer && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{leave.employee?.firstName} {leave.employee?.lastName}</div>
                          <div className="text-xs text-gray-500">{leave.employee?.department}</div>
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${leave.leaveType === 'LOCAL' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {leave.leaveType === 'LOCAL' ? 'Annual' : 'Sick'}
                        </span>
                        {leave.isUrgent && <span className="ml-1 px-1 py-0.5 bg-red-100 text-red-600 text-xs rounded">Urgent</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{leave.totalDays}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={getStatusBadge(leave.status)}>{leave.status}</span>
                        {leave.status === 'REJECTED' && leave.rejectionReason && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={leave.rejectionReason}>{leave.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {/* Employer: approve/reject pending */}
                          {isEmployer && leave.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(leave.id)}
                                disabled={actionLoading === leave.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionLoading === leave.id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => { setShowRejectModal(leave.id); setRejectionReason(''); }}
                                disabled={actionLoading === leave.id}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {/* Employer: cancel approved */}
                          {isEmployer && leave.status === 'APPROVED' && (
                            <button
                              onClick={() => handleCancel(leave.id)}
                              disabled={actionLoading === leave.id}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                          {/* Employee: cancel pending */}
                          {!isEmployer && leave.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(leave.id)}
                              disabled={actionLoading === leave.id}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                          {!isEmployer && leave.status !== 'PENDING' && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          })()}
        </div>

        {/* Apply Leave Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Apply for Leave</h2>
                  <button onClick={() => { setShowApplyModal(false); setError(''); }} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}

                <form onSubmit={handleApplySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select
                      value={formData.leaveType}
                      onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="LOCAL">Annual Leave ({user?.employee?.localLeaveBalance || 0} days left)</option>
                      <option value="SICK">Sick Leave ({user?.employee?.sickLeaveBalance || 0} days left)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isHalfDay"
                      checked={formData.isHalfDay}
                      onChange={(e) => setFormData(prev => ({ ...prev, isHalfDay: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isHalfDay" className="text-sm text-gray-700">Half day</label>
                  </div>

                  {formData.isHalfDay && (
                    <select
                      value={formData.halfDayPeriod}
                      onChange={(e) => setFormData(prev => ({ ...prev, halfDayPeriod: e.target.value as 'MORNING' | 'AFTERNOON' }))}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    >
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        required
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      />
                    </div>
                  </div>

                  {(() => {
                    const conflicts = getHolidaysInRange(formData.startDate, formData.endDate);
                    return conflicts.length > 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700 font-medium">Public holiday conflict</p>
                        <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                          {conflicts.map(h => <li key={h.date}>{h.name} ({h.date.split('T')[0]})</li>)}
                        </ul>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      required
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      placeholder="Please provide a reason for the leave..."
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowApplyModal(false); setError(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || getHolidaysInRange(formData.startDate, formData.endDate).length > 0}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Leave for Employee Modal */}
        {showAddForEmpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Add Leave for Employee</h2>
                  <button onClick={() => { setShowAddForEmpModal(false); setError(''); }} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}

                <form onSubmit={handleAddForEmpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      value={addForEmpData.employeeId}
                      onChange={(e) => setAddForEmpData(prev => ({ ...prev, employeeId: e.target.value }))}
                      required
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">Select employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId}) — Annual: {emp.localLeaveBalance}d, Sick: {emp.sickLeaveBalance}d
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select
                      value={addForEmpData.leaveType}
                      onChange={(e) => setAddForEmpData(prev => ({ ...prev, leaveType: e.target.value as 'LOCAL' | 'SICK' }))}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    >
                      <option value="LOCAL">Annual Leave</option>
                      <option value="SICK">Sick Leave</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="addEmpHalfDay"
                      checked={addForEmpData.isHalfDay}
                      onChange={(e) => setAddForEmpData(prev => ({
                        ...prev,
                        isHalfDay: e.target.checked,
                        endDate: e.target.checked ? prev.startDate : prev.endDate,
                      }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="addEmpHalfDay" className="text-sm text-gray-700">Half day</label>
                  </div>

                  {addForEmpData.isHalfDay && (
                    <select
                      value={addForEmpData.halfDayPeriod}
                      onChange={(e) => setAddForEmpData(prev => ({ ...prev, halfDayPeriod: e.target.value as 'MORNING' | 'AFTERNOON' }))}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    >
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                    </select>
                  )}

                  <div className={`grid gap-3 ${addForEmpData.isHalfDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {addForEmpData.isHalfDay ? 'Date' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={addForEmpData.startDate}
                        onChange={(e) => setAddForEmpData(prev => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate: addForEmpData.isHalfDay ? e.target.value : prev.endDate,
                        }))}
                        required
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      />
                    </div>
                    {!addForEmpData.isHalfDay && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={addForEmpData.endDate}
                          onChange={(e) => setAddForEmpData(prev => ({ ...prev, endDate: e.target.value }))}
                          required
                          className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      value={addForEmpData.reason}
                      onChange={(e) => setAddForEmpData(prev => ({ ...prev, reason: e.target.value }))}
                      required
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      placeholder="Reason for leave..."
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAddForEmpModal(false); setError(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50">
                      {submitting ? 'Adding...' : 'Add Leave'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Reject Leave Request</h3>
              <p className="text-sm text-gray-600 mb-3">Please provide a reason for rejection:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md p-2 text-sm mb-4"
                placeholder="Reason for rejection..."
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowRejectModal(null); setRejectionReason(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || actionLoading !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Leave'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Leaves;

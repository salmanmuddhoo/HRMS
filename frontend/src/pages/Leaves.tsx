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
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

const Leaves: React.FC = () => {
  const { user, isEmployer } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    leaveType: 'LOCAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLeaves = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const response = await api.getLeaves(params);
      if ((response as any).success) {
        setLeaves((response as any).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveLeave(id);
      fetchLeaves();
    } catch (error) {
      console.error('Failed to approve leave:', error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      try {
        await api.rejectLeave(id, reason);
        fetchLeaves();
      } catch (error) {
        console.error('Failed to reject leave:', error);
      }
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.applyLeave({
        ...formData,
        totalDays: calculateDays(),
      });

      if ((response as any).success) {
        setSuccess('Leave application submitted successfully!');
        setShowModal(false);
        setFormData({ leaveType: 'LOCAL', startDate: '', endDate: '', reason: '' });
        fetchLeaves();
        // Refresh user data to update leave balance
        window.location.reload();
      } else {
        setError((response as any).error || 'Failed to submit leave application');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const leaveBalance = formData.leaveType === 'LOCAL'
    ? user?.employee?.localLeaveBalance
    : user?.employee?.sickLeaveBalance;

  // Separate leaves into upcoming (approved future) and history
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingLeaves = leaves.filter(leave => {
    const startDate = new Date(leave.startDate);
    return leave.status === 'APPROVED' && startDate >= today;
  });

  const pendingLeaves = leaves.filter(leave => leave.status === 'PENDING');
  const pastLeaves = leaves.filter(leave => {
    const endDate = new Date(leave.endDate);
    return leave.status !== 'PENDING' && (leave.status === 'REJECTED' || endDate < today);
  });

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
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          {!isEmployer && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Apply for Leave
            </button>
          )}
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Leave Balance Card - Only for employees */}
        {!isEmployer && user?.employee && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">My Leave Balance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 font-medium">Local Leave</p>
                <p className="text-3xl font-bold text-blue-700">{user.employee.localLeaveBalance}</p>
                <p className="text-xs text-blue-500">days available</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-sm text-orange-600 font-medium">Sick Leave</p>
                <p className="text-3xl font-bold text-orange-700">{user.employee.sickLeaveBalance}</p>
                <p className="text-xs text-orange-500">days available</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-700">{pendingLeaves.length}</p>
                <p className="text-xs text-yellow-500">requests</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Upcoming</p>
                <p className="text-3xl font-bold text-green-700">{upcomingLeaves.length}</p>
                <p className="text-xs text-green-500">approved leaves</p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Leaves Section */}
        {upcomingLeaves.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Upcoming Approved Leaves
            </h2>
            <div className="space-y-3">
              {upcomingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {leave.leaveType === 'LOCAL' ? 'Local Leave' : 'Sick Leave'}
                        {isEmployer && leave.employee && (
                          <span className="ml-2 text-gray-500">- {leave.employee.firstName} {leave.employee.lastName}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {leave.totalDays > 1 && (
                          <> to {new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-700">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</p>
                    <span className={getStatusBadge(leave.status)}>{leave.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Leaves Section */}
        {pendingLeaves.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {leave.leaveType === 'LOCAL' ? 'Local Leave' : 'Sick Leave'}
                        {leave.isUrgent && <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Urgent</span>}
                        {isEmployer && leave.employee && (
                          <span className="ml-2 text-gray-500">- {leave.employee.firstName} {leave.employee.lastName}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {leave.totalDays > 1 && (
                          <> to {new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{leave.reason}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-lg font-semibold text-yellow-700">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</p>
                      <span className={getStatusBadge(leave.status)}>{leave.status}</span>
                    </div>
                    {isEmployer ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleApprove(leave.id)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(leave.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          if (window.confirm('Cancel this leave request?')) {
                            await api.cancelLeave(leave.id);
                            fetchLeaves();
                          }
                        }}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave History Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Leave History</h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {pastLeaves.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No leave history found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {isEmployer && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      {isEmployer && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {leave.leaveType === 'LOCAL' ? 'Local' : 'Sick'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {leave.totalDays}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={getStatusBadge(leave.status)}>{leave.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Apply Leave Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Apply for Leave</h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setError('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitLeave}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                      <select
                        name="leaveType"
                        value={formData.leaveType}
                        onChange={handleFormChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                      >
                        <option value="LOCAL">Local Leave ({user?.employee?.localLeaveBalance || 0} days available)</option>
                        <option value="SICK">Sick Leave ({user?.employee?.sickLeaveBalance || 0} days available)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleFormChange}
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleFormChange}
                          required
                          min={formData.startDate || new Date().toISOString().split('T')[0]}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                        />
                      </div>
                    </div>

                    {calculateDays() > 0 && (
                      <div className={`p-3 rounded-md ${leaveBalance !== undefined && calculateDays() > leaveBalance ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <p className={`text-sm ${leaveBalance !== undefined && calculateDays() > leaveBalance ? 'text-red-700' : 'text-blue-700'}`}>
                          Total Days: <strong>{calculateDays()}</strong>
                          {leaveBalance !== undefined && calculateDays() > leaveBalance && (
                            <span className="block mt-1">
                              Exceeds available balance of {leaveBalance} days
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        name="reason"
                        rows={3}
                        value={formData.reason}
                        onChange={handleFormChange}
                        required
                        placeholder="Please provide a reason for your leave request..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setError('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || (leaveBalance !== undefined && calculateDays() > leaveBalance)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Leaves;

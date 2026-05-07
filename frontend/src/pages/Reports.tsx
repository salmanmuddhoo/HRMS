import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
}

interface LeaveRecord {
  id: string;
  employee: Employee;
  leaveType: 'LOCAL' | 'SICK';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
}

interface LeaveReportData {
  leaves: LeaveRecord[];
  statistics: {
    totalLeaves: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    totalDays: number;
    leavesByType: { LOCAL: number; SICK: number };
    leavesByDepartment: Record<string, { count: number; totalDays: number }>;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  isPresent: boolean;
  isLeave: boolean;
  leaveType?: 'LOCAL' | 'SICK';
  isAbsence: boolean;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
}

interface EmployeeAttendance {
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    jobTitle: string;
  };
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  absenceDays: number;
  localLeaveDays: number;
  sickLeaveDays: number;
  records: AttendanceRecord[];
}

interface AttendanceReportData {
  month: number;
  year: number;
  employeeAttendance: EmployeeAttendance[];
}

interface PayrollRecord {
  id: string;
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
  adjustments?: { label: string; type: string; amount: number }[];
  transfers?: { accountType: string; label: string; amount: number }[];
}

interface PayrollReportData {
  payrolls: PayrollRecord[];
  statistics: {
    totalEmployees: number;
    totalBaseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    totalGrossSalary: number;
    totalNetSalary: number;
    totalEmployeeCSG: number;
    totalEmployeeNSF: number;
    totalEmployerCSG: number;
    totalEmployerNSF: number;
    totalTrainingLevy: number;
    transfersByAccount: Record<string, { label: string; total: number }>;
    payrollsByDepartment: Record<string, { count: number; totalNetSalary: number; totalDeductions: number }>;
  };
}

interface LeaveBalanceEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  localLeaveBalance: number;
  sickLeaveBalance: number;
  sickLeaveBank: number;
}

interface LeaveBalancesReportData {
  employees: LeaveBalanceEmployee[];
  statistics: {
    totalEmployees: number;
    totalLocalLeaveBalance: number;
    totalSickLeaveBalance: number;
    totalSickLeaveBank: number;
  };
  asOf: string;
}

type ReportTab = 'leave' | 'attendance' | 'payroll' | 'leaveBalances';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('leave');
  const [loading, setLoading] = useState(false);

  // Leave Report State
  const [leaveData, setLeaveData] = useState<LeaveReportData | null>(null);
  const [leaveFilters, setLeaveFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    leaveType: '',
    status: '',
  });

  // Attendance Report State
  const [attendanceData, setAttendanceData] = useState<AttendanceReportData | null>(null);
  const [attendanceFilters, setAttendanceFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    department: '',
  });

  // Payroll Report State
  const [payrollData, setPayrollData] = useState<PayrollReportData | null>(null);
  const [payrollFilters, setPayrollFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    department: '',
  });
  const [selectedTransferAccount, setSelectedTransferAccount] = useState<string>('');
  const [selectedStatutoryItem, setSelectedStatutoryItem] = useState<string>('');

  // Leave Balances Report State
  const [leaveBalancesData, setLeaveBalancesData] = useState<LeaveBalancesReportData | null>(null);
  const [leaveBalancesFilters, setLeaveBalancesFilters] = useState({ department: '' });

  const departments = ['HR', 'IT', 'Finance', 'Operations', 'Sales', 'Marketing'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
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

  const fetchLeaveReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (leaveFilters.startDate) params.startDate = leaveFilters.startDate;
      if (leaveFilters.endDate) params.endDate = leaveFilters.endDate;
      if (leaveFilters.department) params.department = leaveFilters.department;
      if (leaveFilters.leaveType) params.leaveType = leaveFilters.leaveType;
      if (leaveFilters.status) params.status = leaveFilters.status;

      const response = await api.getLeaveReport(params);
      if ((response as any).success) {
        setLeaveData((response as any).data);
      }
    } catch (error) {
      console.error('Failed to fetch leave report:', error);
    } finally {
      setLoading(false);
    }
  }, [leaveFilters]);

  const fetchAttendanceReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        month: attendanceFilters.month,
        year: attendanceFilters.year,
      };
      if (attendanceFilters.department) params.department = attendanceFilters.department;

      const response = await api.getAttendanceReport(params);
      if ((response as any).success) {
        setAttendanceData((response as any).data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
    } finally {
      setLoading(false);
    }
  }, [attendanceFilters]);

  const fetchLeaveBalancesReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (leaveBalancesFilters.department) params.department = leaveBalancesFilters.department;
      const response = await api.getLeaveBalancesReport(params);
      if ((response as any).success) setLeaveBalancesData((response as any).data);
    } catch (error) {
      console.error('Failed to fetch leave balances report:', error);
    } finally {
      setLoading(false);
    }
  }, [leaveBalancesFilters]);

  const fetchPayrollReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (payrollFilters.month) params.month = payrollFilters.month;
      if (payrollFilters.year) params.year = payrollFilters.year;
      if (payrollFilters.department) params.department = payrollFilters.department;

      const response = await api.getPayrollReport(params);
      if ((response as any).success) {
        setPayrollData((response as any).data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll report:', error);
    } finally {
      setLoading(false);
    }
  }, [payrollFilters]);

  useEffect(() => {
    if (activeTab === 'leave') {
      fetchLeaveReport();
    } else if (activeTab === 'attendance') {
      fetchAttendanceReport();
    } else if (activeTab === 'payroll') {
      fetchPayrollReport();
    } else if (activeTab === 'leaveBalances') {
      fetchLeaveBalancesReport();
    }
  }, [activeTab, fetchLeaveReport, fetchAttendanceReport, fetchPayrollReport, fetchLeaveBalancesReport]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800';
      case 'LOCKED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeBadgeClass = (type: string) => {
    return type === 'LOCAL' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';
  };

  const renderLeaveReport = () => (
    <div>
      {/* Leave Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={leaveFilters.startDate}
              onChange={(e) => setLeaveFilters({ ...leaveFilters, startDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={leaveFilters.endDate}
              onChange={(e) => setLeaveFilters({ ...leaveFilters, endDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select
              value={leaveFilters.department}
              onChange={(e) => setLeaveFilters({ ...leaveFilters, department: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Leave Type</label>
            <select
              value={leaveFilters.leaveType}
              onChange={(e) => setLeaveFilters({ ...leaveFilters, leaveType: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="LOCAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={leaveFilters.status}
              onChange={(e) => setLeaveFilters({ ...leaveFilters, status: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {leaveData && (
        <>
          {/* Leave Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{leaveData.statistics.totalLeaves}</div>
              <div className="text-sm text-gray-500">Total Leaves</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{leaveData.statistics.approvedLeaves}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">{leaveData.statistics.pendingLeaves}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{leaveData.statistics.rejectedLeaves}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{leaveData.statistics.totalDays}</div>
              <div className="text-sm text-gray-500">Total Days</div>
            </div>
          </div>

          {/* Leave by Type & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Leave by Type</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Annual Leave</span>
                  <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {leaveData.statistics.leavesByType.LOCAL}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sick Leave</span>
                  <span className="text-sm font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                    {leaveData.statistics.leavesByType.SICK}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Leave by Department</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(leaveData.statistics.leavesByDepartment).map(([dept, data]) => (
                  <div key={dept} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{dept}</span>
                    <span className="text-sm text-gray-800">
                      {data.count} leaves ({data.totalDays} days)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leave Records Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveData.leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {leave.employee.firstName} {leave.employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{leave.employee.department}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getLeaveTypeBadgeClass(leave.leaveType)}`}>
                          {leave.leaveType === 'LOCAL' ? 'Annual' : 'Sick'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                        {leave.totalDays}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {leave.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaveData.leaves.length === 0 && (
                <div className="text-center py-8 text-gray-500">No leave records found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderAttendanceReport = () => (
    <div>
      {/* Attendance Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={attendanceFilters.month}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, month: parseInt(e.target.value) })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={attendanceFilters.year}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, year: parseInt(e.target.value) })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select
              value={attendanceFilters.department}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, department: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {attendanceData && (
        <>
          {/* Attendance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{attendanceData.employeeAttendance.length}</div>
              <div className="text-sm text-gray-500">Employees</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {attendanceData.employeeAttendance.reduce((sum, e) => sum + e.presentDays, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Present Days</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {attendanceData.employeeAttendance.reduce((sum, e) => sum + e.leaveDays, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Leave Days</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {attendanceData.employeeAttendance.reduce((sum, e) => sum + e.absenceDays, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Absences</div>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                {months.find(m => m.value === attendanceData.month)?.label} {attendanceData.year} Attendance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Annual Leave</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sick Leave</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absences</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.employeeAttendance.map((emp) => {
                    const attendanceRate = emp.totalDays > 0
                      ? ((emp.presentDays / emp.totalDays) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={emp.employee.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {emp.employee.firstName} {emp.employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {emp.employee.employeeId} &bull; {emp.employee.department}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            {emp.presentDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            {emp.localLeaveDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                            {emp.sickLeaveDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                            {emp.absenceDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  parseFloat(attendanceRate) >= 90 ? 'bg-green-500' :
                                  parseFloat(attendanceRate) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${attendanceRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{attendanceRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {attendanceData.employeeAttendance.length === 0 && (
                <div className="text-center py-8 text-gray-500">No attendance records found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPayrollReport = () => (
    <div>
      {/* Payroll Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={payrollFilters.month}
              onChange={(e) => setPayrollFilters({ ...payrollFilters, month: parseInt(e.target.value) })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={payrollFilters.year}
              onChange={(e) => setPayrollFilters({ ...payrollFilters, year: parseInt(e.target.value) })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select
              value={payrollFilters.department}
              onChange={(e) => setPayrollFilters({ ...payrollFilters, department: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {payrollData && (
        <>
          {/* Payroll Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{payrollData.statistics.totalEmployees}</div>
              <div className="text-sm text-gray-500">Employees</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-lg font-bold text-gray-900">{formatCurrency(payrollData.statistics.totalBaseSalary)}</div>
              <div className="text-sm text-gray-500">Base Salary</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-lg font-bold text-blue-600">{formatCurrency(payrollData.statistics.totalAllowances)}</div>
              <div className="text-sm text-gray-500">Allowances</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-lg font-bold text-red-600">{formatCurrency(payrollData.statistics.totalDeductions)}</div>
              <div className="text-sm text-gray-500">Deductions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-lg font-bold text-gray-700">{formatCurrency(payrollData.statistics.totalGrossSalary)}</div>
              <div className="text-sm text-gray-500">Gross Salary</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-lg font-bold text-green-600">{formatCurrency(payrollData.statistics.totalNetSalary)}</div>
              <div className="text-sm text-gray-500">Net Salary</div>
            </div>
          </div>

          {/* Statutory & Employer Contributions Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Employee CSG / NSF */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Statutory Deductions</h3>
              <p className="text-xs text-gray-500 mb-3">Deducted from employee salaries and remitted by the employer to the authorities.</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-600">Total CSG (employee)</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(payrollData.statistics.totalEmployeeCSG)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-600">Total NSF (employee)</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(payrollData.statistics.totalEmployeeNSF)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-semibold text-gray-800">Total to remit</span>
                  <span className="text-sm font-bold text-red-700">{formatCurrency(payrollData.statistics.totalEmployeeCSG + payrollData.statistics.totalEmployeeNSF)}</span>
                </div>
              </div>
            </div>

            {/* Employer CSG / NSF / Training Levy */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-orange-800 mb-3">Employer Contributions</h3>
              <p className="text-xs text-orange-600 mb-3">Additional employer-side contributions not deducted from employees.</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                  <span className="text-sm text-orange-700">Total CSG (employer 3%/6%)</span>
                  <span className="text-sm font-semibold text-orange-700">{formatCurrency(payrollData.statistics.totalEmployerCSG)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                  <span className="text-sm text-orange-700">Total NSF (employer 2.5%)</span>
                  <span className="text-sm font-semibold text-orange-700">{formatCurrency(payrollData.statistics.totalEmployerNSF)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                  <span className="text-sm text-orange-700">Training Levy (1.5%)</span>
                  <span className="text-sm font-semibold text-orange-700">{formatCurrency(payrollData.statistics.totalTrainingLevy)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-semibold text-orange-900">Total employer contribution</span>
                  <span className="text-sm font-bold text-orange-900">{formatCurrency(payrollData.statistics.totalEmployerCSG + payrollData.statistics.totalEmployerNSF + payrollData.statistics.totalTrainingLevy)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transfers by Account */}
          {Object.keys(payrollData.statistics.transfersByAccount).length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Salary Transfers by Account</h3>
              <p className="text-xs text-gray-500 mb-3">Monthly salary transfer amounts elected by employees, deducted from net pay.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['SHARES', 'MSA', 'HSA', 'SHARIAH'].map(key => {
                  const entry = payrollData.statistics.transfersByAccount[key];
                  const labels: Record<string, string> = {
                    SHARES: 'Shares A/C',
                    MSA: 'MSA',
                    HSA: 'HSA',
                    SHARIAH: 'Shariah Compliant Financing',
                  };
                  return (
                    <div key={key} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-700 mb-1">{labels[key]}</div>
                      <div className="text-lg font-bold text-blue-900">
                        {entry ? formatCurrency(entry.total) : formatCurrency(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-end">
                <span className="text-sm text-gray-500 mr-3">Total transfers:</span>
                <span className="text-sm font-bold text-blue-800">
                  {formatCurrency(Object.values(payrollData.statistics.transfersByAccount).reduce((s, v) => s + v.total, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Transfer Employee Breakdown */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Transfer Details by Account</h3>
            <p className="text-xs text-gray-500 mb-3">Select an account type to see which employees made transfers to it this period.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'SHARES', label: 'Shares A/C' },
                { key: 'MSA', label: 'MSA' },
                { key: 'HSA', label: 'HSA' },
                { key: 'SHARIAH', label: 'Shariah Compliant Financing' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedTransferAccount(prev => prev === key ? '' : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedTransferAccount === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedTransferAccount ? (() => {
              const accountLabels: Record<string, string> = {
                SHARES: 'Shares A/C',
                MSA: 'MSA',
                HSA: 'HSA',
                SHARIAH: 'Shariah Compliant Financing',
              };
              const filtered = payrollData.payrolls.filter(p =>
                p.transfers?.some(t => t.accountType === selectedTransferAccount)
              );
              if (filtered.length === 0) {
                return (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    No employees made transfers to {accountLabels[selectedTransferAccount]} for this period.
                  </div>
                );
              }
              const total = filtered.reduce((sum, p) => {
                const t = p.transfers?.find(t => t.accountType === selectedTransferAccount);
                return sum + (t ? Number(t.amount) : 0);
              }, 0);
              return (
                <div>
                  <div className="text-xs text-gray-500 mb-2">
                    {filtered.length} employee{filtered.length !== 1 ? 's' : ''} · Total: <span className="font-semibold text-blue-700">{formatCurrency(total)}</span>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered.map(p => {
                        const t = p.transfers?.find(t => t.accountType === selectedTransferAccount);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{p.employee.firstName} {p.employee.lastName}</div>
                              <div className="text-xs text-gray-500">{p.employee.employeeId}</div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">{p.employee.department}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                              {months.find(m => m.value === p.month)?.label} {p.year}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right font-semibold text-blue-700">
                              {t ? formatCurrency(Number(t.amount)) : formatCurrency(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })() : (
              <div className="text-sm text-gray-400 text-center py-4">Select an account above to view employee details.</div>
            )}
          </div>

          {/* Statutory Contribution Breakdown */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Statutory Contribution Details by Employee</h3>
            <p className="text-xs text-gray-500 mb-3">Select a contribution type to see the per-employee breakdown for this period.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'EMP_CSG', label: 'Employee CSG', color: 'red' },
                { key: 'EMP_NSF', label: 'Employee NSF', color: 'red' },
                { key: 'EMPR_CSG', label: 'Employer CSG', color: 'orange' },
                { key: 'EMPR_NSF', label: 'Employer NSF', color: 'orange' },
                { key: 'TRAINING', label: 'Training Levy', color: 'orange' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setSelectedStatutoryItem(prev => prev === key ? '' : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedStatutoryItem === key
                      ? (color === 'red' ? 'bg-red-600 text-white border-red-600' : 'bg-orange-500 text-white border-orange-500')
                      : (color === 'red' ? 'bg-white text-red-700 border-red-300 hover:bg-red-50' : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50')
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedStatutoryItem ? (() => {
              const itemLabels: Record<string, string> = {
                EMP_CSG: 'Employee CSG',
                EMP_NSF: 'Employee NSF',
                EMPR_CSG: 'Employer CSG',
                EMPR_NSF: 'Employer NSF',
                TRAINING: 'Training Levy',
              };
              const getAmount = (p: (typeof payrollData.payrolls)[0]): number => {
                const base = Number(p.baseSalary);
                switch (selectedStatutoryItem) {
                  case 'EMP_CSG': {
                    const adj = p.adjustments?.find(a => a.label === 'CSG');
                    return adj ? Number(adj.amount) : 0;
                  }
                  case 'EMP_NSF': {
                    const adj = p.adjustments?.find(a => a.label === 'NSF');
                    return adj ? Number(adj.amount) : 0;
                  }
                  case 'EMPR_CSG':
                    return base <= 50000 ? base * 0.03 : base * 0.06;
                  case 'EMPR_NSF':
                    return Math.min(base, 28570) * 0.025;
                  case 'TRAINING':
                    return base * 0.015;
                  default:
                    return 0;
                }
              };
              const rows = payrollData.payrolls.map(p => ({ p, amount: getAmount(p) })).filter(r => r.amount > 0);
              const total = rows.reduce((s, r) => s + r.amount, 0);
              const isEmployer = selectedStatutoryItem.startsWith('EMPR') || selectedStatutoryItem === 'TRAINING';
              if (rows.length === 0) {
                return <div className="text-sm text-gray-500 text-center py-4">No data available for {itemLabels[selectedStatutoryItem]} in this period.</div>;
              }
              return (
                <div>
                  <div className={`text-xs mb-2 ${isEmployer ? 'text-orange-700' : 'text-red-700'}`}>
                    {rows.length} employee{rows.length !== 1 ? 's' : ''} · Total: <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map(({ p, amount }) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{p.employee.firstName} {p.employee.lastName}</div>
                            <div className="text-xs text-gray-500">{p.employee.employeeId}</div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-600">{p.employee.department}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatCurrency(Number(p.baseSalary))}</td>
                          <td className={`px-4 py-2 whitespace-nowrap text-right font-semibold ${isEmployer ? 'text-orange-700' : 'text-red-600'}`}>
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })() : (
              <div className="text-sm text-gray-400 text-center py-4">Select a contribution type above to view employee details.</div>
            )}
          </div>

          {/* Payroll Records Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollData.payrolls.map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payroll.employee.firstName} {payroll.employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{payroll.employee.department}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {months.find(m => m.value === payroll.month)?.label} {payroll.year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(payroll.baseSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-blue-600">
                        {formatCurrency(Number(payroll.travellingAllowance) + Number(payroll.otherAllowances))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-red-600">
                        {formatCurrency(payroll.totalDeductions)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-700">
                        {formatCurrency(payroll.netSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payrollData.payrolls.length === 0 && (
                <div className="text-center py-8 text-gray-500">No payroll records found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLeaveBalancesReport = () => (
    <div>
      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select
              value={leaveBalancesFilters.department}
              onChange={(e) => setLeaveBalancesFilters({ department: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {leaveBalancesData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{leaveBalancesData.statistics.totalEmployees}</div>
              <div className="text-sm text-gray-500">Active Employees</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{leaveBalancesData.statistics.totalLocalLeaveBalance.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Total Annual Leave Days</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{leaveBalancesData.statistics.totalSickLeaveBalance.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Total Sick Leave Days</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{leaveBalancesData.statistics.totalSickLeaveBank.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Total Sick Leave Bank</div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Leave Balances as of {new Date(leaveBalancesData.asOf).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <span className="text-xs text-gray-500">{leaveBalancesData.employees.length} employees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-blue-600 uppercase">Annual Leave Balance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase">Sick Leave Balance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-purple-600 uppercase">Sick Leave Bank</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveBalancesData.employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-gray-500">{emp.employeeId} &bull; {emp.jobTitle}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{emp.department}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm font-semibold">
                          {Number(emp.localLeaveBalance).toFixed(1)} days
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm font-semibold">
                          {Number(emp.sickLeaveBalance).toFixed(1)} days
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {Number(emp.sickLeaveBank) > 0 ? (
                          <span className="px-3 py-1 bg-purple-50 text-purple-800 rounded-full text-sm font-semibold">
                            {Number(emp.sickLeaveBank).toFixed(1)} days
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaveBalancesData.employees.length === 0 && (
                <div className="text-center py-8 text-gray-500">No employees found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View and analyze leave, attendance, and payroll data</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('leave')}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'leave'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leave Report
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'attendance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Attendance Report
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'payroll'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payroll Report
            </button>
            <button
              onClick={() => setActiveTab('leaveBalances')}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'leaveBalances'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leave Balances
            </button>
          </nav>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'leave' && renderLeaveReport()}
            {activeTab === 'attendance' && renderAttendanceReport()}
            {activeTab === 'payroll' && renderPayrollReport()}
            {activeTab === 'leaveBalances' && renderLeaveBalancesReport()}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;

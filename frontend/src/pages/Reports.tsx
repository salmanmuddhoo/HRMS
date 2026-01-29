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
    payrollsByDepartment: Record<string, { count: number; totalNetSalary: number; totalDeductions: number }>;
  };
}

type ReportTab = 'leave' | 'attendance' | 'payroll';

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
    status: '',
  });

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

  const fetchPayrollReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (payrollFilters.month) params.month = payrollFilters.month;
      if (payrollFilters.year) params.year = payrollFilters.year;
      if (payrollFilters.department) params.department = payrollFilters.department;
      if (payrollFilters.status) params.status = payrollFilters.status;

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
    }
  }, [activeTab, fetchLeaveReport, fetchAttendanceReport, fetchPayrollReport]);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={payrollFilters.status}
              onChange={(e) => setPayrollFilters({ ...payrollFilters, status: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="LOCKED">Locked</option>
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

          {/* Department Breakdown */}
          {Object.keys(payrollData.statistics.payrollsByDepartment).length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Payroll by Department</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(payrollData.statistics.payrollsByDepartment).map(([dept, data]) => (
                  <div key={dept} className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">{dept}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {data.count} employees
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-xs text-gray-500">Net Salary</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(data.totalNetSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Deductions</span>
                      <span className="text-sm font-medium text-red-600">{formatCurrency(data.totalDeductions)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
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
                        {formatCurrency(payroll.travellingAllowance + payroll.otherAllowances)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-red-600">
                        {formatCurrency(payroll.totalDeductions)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-700">
                        {formatCurrency(payroll.netSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(payroll.status)}`}>
                          {payroll.status}
                        </span>
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
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;

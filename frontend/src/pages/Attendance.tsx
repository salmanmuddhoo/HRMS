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
  localLeaveBalance: number;
  sickLeaveBalance: number;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  isPresent: boolean;
  isLeave: boolean;
  isAbsence: boolean;
  leaveType?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
  remarks?: string;
}

interface AttendanceMap {
  [employeeId: string]: {
    [date: string]: AttendanceRecord;
  };
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

const Attendance: React.FC = () => {
  const { isEmployer } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  // Add Leave modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveData, setLeaveData] = useState({
    employeeId: '',
    leaveType: 'LOCAL' as 'LOCAL' | 'SICK',
    date: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'MORNING' as 'MORNING' | 'AFTERNOON',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get week dates
  const getWeekDates = useCallback(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const weekDates = getWeekDates();

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.getEmployees({ status: 'ACTIVE' });
      if ((response as any).success) {
        setEmployees((response as any).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = formatDateKey(currentWeekStart);
      const endDate = formatDateKey(weekDates[6]);

      const response = await api.getAttendance({ startDate, endDate });
      if ((response as any).success) {
        const records: AttendanceRecord[] = (response as any).data || [];
        const map: AttendanceMap = {};

        records.forEach((record) => {
          if (!map[record.employeeId]) {
            map[record.employeeId] = {};
          }
          const dateKey = record.date.split('T')[0];
          map[record.employeeId][dateKey] = record;
        });

        setAttendanceMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart, weekDates]);

  const fetchHolidays = useCallback(async () => {
    try {
      const year = currentWeekStart.getFullYear();
      const response = await api.getHolidays({ year });
      if ((response as any).success) {
        setHolidays((response as any).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    fetchEmployees();
    fetchHolidays();
  }, [fetchEmployees, fetchHolidays]);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendance();
    }
  }, [currentWeekStart, employees.length, fetchAttendance]);

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Check leave balance
    const employee = employees.find((emp) => emp.id === leaveData.employeeId);
    const requiredDays = leaveData.isHalfDay ? 0.5 : 1;
    if (employee) {
      const balance =
        leaveData.leaveType === 'LOCAL'
          ? employee.localLeaveBalance
          : employee.sickLeaveBalance;
      if (balance < requiredDays) {
        setError(
          `Insufficient ${leaveData.leaveType === 'LOCAL' ? 'Annual' : 'Sick'} leave balance`
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const response = await api.addUrgentLeave({
        employeeId: leaveData.employeeId,
        leaveType: leaveData.leaveType,
        startDate: leaveData.date,
        endDate: leaveData.date,
        reason: leaveData.reason || 'Marked by management',
        isHalfDay: leaveData.isHalfDay,
        halfDayPeriod: leaveData.isHalfDay ? leaveData.halfDayPeriod : null,
      });
      if ((response as any).success) {
        setSuccess('Leave added successfully');
        setShowLeaveModal(false);
        setLeaveData({
          employeeId: '',
          leaveType: 'LOCAL',
          date: '',
          reason: '',
          isHalfDay: false,
          halfDayPeriod: 'MORNING',
        });
        fetchAttendance();
        fetchEmployees();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCellClick = (employeeId: string, date: Date) => {
    if (!isEmployer) return;
    const dateKey = formatDateKey(date);
    const existing = attendanceMap[employeeId]?.[dateKey];

    // Don't allow modifying existing full-day leave records
    if (existing?.isLeave && !existing?.isHalfDay) return;

    setLeaveData({
      employeeId,
      leaveType: 'LOCAL',
      date: dateKey,
      reason: '',
      isHalfDay: false,
      halfDayPeriod: 'MORNING',
    });
    setShowLeaveModal(true);
  };

  const getSelectedEmployeeBalance = () => {
    const employee = employees.find((emp) => emp.id === leaveData.employeeId);
    if (!employee) return null;
    return {
      local: employee.localLeaveBalance,
      sick: employee.sickLeaveBalance,
    };
  };

  const isHoliday = (date: Date) => {
    const dateKey = formatDateKey(date);
    return holidays.find((h) => h.date.split('T')[0] === dateKey);
  };

  const getStatusCell = (employeeId: string, date: Date, isTodayColumn: boolean) => {
    const dateKey = formatDateKey(date);
    const record = attendanceMap[employeeId]?.[dateKey];
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const holiday = isHoliday(date);

    // Colors: Annual Leave = Blue, Sick Leave = Light Red, Present = Green
    const annualLeaveColor = '#bfdbfe'; // blue-200
    const sickLeaveColor = '#fecaca'; // red-200
    const presentColor = isTodayColumn ? '#86efac' : '#bbf7d0'; // green-300 for today, green-200 otherwise

    let bgColor = 'bg-gray-50';
    let content: React.ReactNode = '-';
    let textColor = 'text-gray-400';
    let cursor = isEmployer && !isWeekend && !holiday ? 'cursor-pointer hover:bg-gray-100' : '';
    let customStyle: React.CSSProperties = {};

    // Today column highlight - more prominent background for current date
    if (isTodayColumn) {
      bgColor = 'bg-primary-100';
    }

    if (isWeekend) {
      bgColor = 'bg-gray-200';
      content = '-';
      cursor = '';
    } else if (holiday) {
      // Public holiday - greyed out
      bgColor = 'bg-gray-300';
      content = (
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium">Holiday</span>
        </div>
      );
      textColor = 'text-gray-600';
      cursor = '';
    } else if (record) {
      if (record.isLeave) {
        const isHalfDayLeave = record.isHalfDay;
        const period = record.halfDayPeriod;
        const isSick = record.leaveType === 'SICK';
        const leaveColor = isSick ? sickLeaveColor : annualLeaveColor;
        const leaveTextColor = isSick ? 'text-red-700' : 'text-blue-700';

        if (isHalfDayLeave) {
          // Diagonal split
          // AM Leave (morning off): Top-left = Leave, Bottom-right = Present
          // PM Leave (afternoon off): Top-left = Present, Bottom-right = Leave
          if (period === 'MORNING') {
            // Morning off: Top-left leave, bottom-right present
            customStyle = {
              background: `linear-gradient(135deg, ${leaveColor} 50%, ${presentColor} 50%)`,
            };
          } else {
            // Afternoon off: Top-left present, bottom-right leave
            customStyle = {
              background: `linear-gradient(135deg, ${presentColor} 50%, ${leaveColor} 50%)`,
            };
          }
          bgColor = '';
          content = (
            <div className="flex flex-col items-center justify-center h-full w-full relative">
              {period === 'MORNING' ? (
                <>
                  <span className={`text-[10px] font-bold ${leaveTextColor} absolute top-1 left-1`}>
                    {isSick ? 'SL' : 'AL'}
                  </span>
                  <span className="text-[10px] font-bold text-green-700 absolute bottom-1 right-1">P</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-green-700 absolute top-1 left-1">P</span>
                  <span className={`text-[10px] font-bold ${leaveTextColor} absolute bottom-1 right-1`}>
                    {isSick ? 'SL' : 'AL'}
                  </span>
                </>
              )}
            </div>
          );
          cursor = isEmployer ? 'cursor-pointer hover:opacity-80' : '';
        } else {
          // Full day leave
          if (isSick) {
            bgColor = 'bg-red-100';
            textColor = 'text-red-700';
          } else {
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-700';
          }
          content = (
            <div className="flex flex-col items-center">
              <span className="font-semibold">{isSick ? 'Sick' : 'Annual'}</span>
              <span className="text-xs">Leave</span>
            </div>
          );
          cursor = '';
        }
      } else if (record.isAbsence) {
        bgColor = 'bg-red-200';
        content = (
          <div className="flex flex-col items-center">
            <span className="font-semibold">Absent</span>
          </div>
        );
        textColor = 'text-red-800';
      } else if (record.isPresent) {
        bgColor = isTodayColumn ? '' : 'bg-green-200';
        if (isTodayColumn) {
          customStyle = { backgroundColor: '#86efac' }; // green-300 for today
        }
        content = 'P';
        textColor = 'text-green-700';
      }
    } else if (isPast && !isWeekend && !holiday) {
      bgColor = isTodayColumn ? '' : 'bg-green-100';
      if (isTodayColumn) {
        customStyle = { backgroundColor: '#bbf7d0' }; // green-200 for today
      }
      content = 'P';
      textColor = 'text-green-700';
    }

    return (
      <td
        key={dateKey}
        onClick={() => !isWeekend && !holiday && !(record?.isLeave && !record?.isHalfDay) && handleCellClick(employeeId, date)}
        style={customStyle}
        className={`px-2 py-2 text-center text-sm font-medium ${bgColor} ${textColor} ${cursor} border-r border-gray-200 h-14 relative`}
        title={holiday ? holiday.name : (record?.isHalfDay ? `${record.halfDayPeriod === 'MORNING' ? 'Morning' : 'Afternoon'} ${record.leaveType === 'SICK' ? 'Sick' : 'Annual'} Leave` : (record?.remarks || (isWeekend ? 'Weekend' : '')))}
      >
        {content}
      </td>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const selectedBalance = getSelectedEmployeeBalance();

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          {isEmployer && (
            <button
              onClick={() => {
                setLeaveData({
                  employeeId: '',
                  leaveType: 'LOCAL',
                  date: '',
                  reason: '',
                  isHalfDay: false,
                  halfDayPeriod: 'MORNING',
                });
                setShowLeaveModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Add Leave
            </button>
          )}
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

        {/* Week Navigation */}
        <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-gray-900">{formatWeekRange()}</span>
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 text-sm"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
          >
            Next
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-10 h-8 bg-green-200 text-green-700 flex items-center justify-center rounded font-medium">P</span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-8 bg-blue-100 text-blue-700 flex items-center justify-center rounded font-medium text-xs">AL</span>
            <span>AL Annual Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-8 bg-red-100 text-red-700 flex items-center justify-center rounded font-medium text-xs">SL</span>
            <span>SL Sick Leave</span>
          </div>
        </div>

        {/* Attendance Table */}
        {employees.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            No employees found.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                      Employee
                    </th>
                    {weekDates.map((date) => {
                      const isToday = formatDateKey(new Date()) === formatDateKey(date);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const holiday = isHoliday(date);
                      return (
                        <th
                          key={formatDateKey(date)}
                          className={`px-2 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[90px] ${
                            isWeekend ? 'bg-gray-200 text-gray-500' :
                            holiday ? 'bg-gray-300 text-gray-600' :
                            isToday ? 'bg-primary-200 text-primary-800 font-extrabold shadow-md' : 'text-gray-500'
                          }`}
                        >
                          <div>{formatDateDisplay(date)}</div>
                          {holiday && <div className="text-[9px] font-normal mt-0.5 truncate max-w-[80px]">{holiday.name}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.employeeId} &bull; {employee.department}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          AL: {employee.localLeaveBalance} | SL: {employee.sickLeaveBalance}
                        </div>
                      </td>
                      {weekDates.map((date) => {
                        const isToday = formatDateKey(new Date()) === formatDateKey(date);
                        return getStatusCell(employee.id, date, isToday);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Leave Modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Leave</h2>
              <form onSubmit={handleAddLeave}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee *
                  </label>
                  <select
                    value={leaveData.employeeId}
                    onChange={(e) =>
                      setLeaveData({ ...leaveData, employeeId: e.target.value })
                    }
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show leave balance for selected employee */}
                {selectedBalance && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Leave Balance:</div>
                    <div className="flex gap-4">
                      <div className={`text-sm ${leaveData.leaveType === 'LOCAL' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        Annual: {selectedBalance.local} days
                      </div>
                      <div className={`text-sm ${leaveData.leaveType === 'SICK' ? 'font-bold text-orange-600' : 'text-gray-600'}`}>
                        Sick: {selectedBalance.sick} days
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leaveType"
                        value="LOCAL"
                        checked={leaveData.leaveType === 'LOCAL'}
                        onChange={(e) =>
                          setLeaveData({ ...leaveData, leaveType: e.target.value as 'LOCAL' | 'SICK' })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Annual Leave</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leaveType"
                        value="SICK"
                        checked={leaveData.leaveType === 'SICK'}
                        onChange={(e) =>
                          setLeaveData({ ...leaveData, leaveType: e.target.value as 'LOCAL' | 'SICK' })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Sick Leave</span>
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={leaveData.date}
                    onChange={(e) =>
                      setLeaveData({ ...leaveData, date: e.target.value })
                    }
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>

                {/* Half Day Option */}
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={leaveData.isHalfDay}
                      onChange={(e) =>
                        setLeaveData({ ...leaveData, isHalfDay: e.target.checked })
                      }
                      className="mr-2 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Half Day Leave</span>
                    <span className="ml-2 text-xs text-gray-500">(0.5 days)</span>
                  </label>
                </div>

                {/* Half Day Period Selection */}
                {leaveData.isHalfDay && (
                  <div className="mb-4 ml-6 p-3 bg-gray-50 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Period *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="halfDayPeriod"
                          value="MORNING"
                          checked={leaveData.halfDayPeriod === 'MORNING'}
                          onChange={(e) =>
                            setLeaveData({ ...leaveData, halfDayPeriod: e.target.value as 'MORNING' | 'AFTERNOON' })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Morning (AM)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="halfDayPeriod"
                          value="AFTERNOON"
                          checked={leaveData.halfDayPeriod === 'AFTERNOON'}
                          onChange={(e) =>
                            setLeaveData({ ...leaveData, halfDayPeriod: e.target.value as 'MORNING' | 'AFTERNOON' })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Afternoon (PM)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={leaveData.reason}
                    onChange={(e) =>
                      setLeaveData({ ...leaveData, reason: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                    placeholder="Optional reason..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeaveModal(false);
                      setLeaveData({
                        employeeId: '',
                        leaveType: 'LOCAL',
                        date: '',
                        reason: '',
                        isHalfDay: false,
                        halfDayPeriod: 'MORNING',
                      });
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : `Add ${leaveData.isHalfDay ? 'Half Day' : 'Full Day'} Leave`}
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

export default Attendance;

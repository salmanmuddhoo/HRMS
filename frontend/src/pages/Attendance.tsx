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

    const annualLeaveColor = '#bfdbfe';
    const sickLeaveColor = '#fecaca';
    const presentColor = isTodayColumn ? '#86efac' : '#bbf7d0';

    let bgColor = 'bg-gray-50';
    let content: React.ReactNode = '-';
    let textColor = 'text-gray-400';
    let customStyle: React.CSSProperties = {};

    if (isTodayColumn) {
      bgColor = 'bg-primary-100';
    }

    if (isWeekend) {
      bgColor = 'bg-gray-200';
      content = '-';
    } else if (holiday) {
      bgColor = 'bg-gray-300';
      content = (
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium">Holiday</span>
        </div>
      );
      textColor = 'text-gray-600';
    } else if (record) {
      if (record.isLeave) {
        const isHalfDayLeave = record.isHalfDay;
        const period = record.halfDayPeriod;
        const isSick = record.leaveType === 'SICK';
        const leaveColor = isSick ? sickLeaveColor : annualLeaveColor;
        const leaveTextColor = isSick ? 'text-red-700' : 'text-blue-700';

        if (isHalfDayLeave) {
          if (period === 'MORNING') {
            customStyle = {
              background: `linear-gradient(135deg, ${leaveColor} 50%, ${presentColor} 50%)`,
            };
          } else {
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
        } else {
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
          customStyle = { backgroundColor: '#86efac' };
        }
        content = 'P';
        textColor = 'text-green-700';
      }
    } else if (isPast && !isWeekend && !holiday) {
      bgColor = isTodayColumn ? '' : 'bg-green-100';
      if (isTodayColumn) {
        customStyle = { backgroundColor: '#bbf7d0' };
      }
      content = 'P';
      textColor = 'text-green-700';
    }

    return (
      <td
        key={dateKey}
        style={customStyle}
        className={`px-2 py-2 text-center text-sm font-medium ${bgColor} ${textColor} border-r border-gray-200 h-14 relative`}
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

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        </div>

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
            <span>Annual Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-8 bg-red-100 text-red-700 flex items-center justify-center rounded font-medium text-xs">SL</span>
            <span>Sick Leave</span>
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
      </div>
    </Layout>
  );
};

export default Attendance;

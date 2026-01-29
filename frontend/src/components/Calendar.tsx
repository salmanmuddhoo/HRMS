import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface CalendarProps {
  employeeId?: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
}

type ViewMode = 'week' | 'month';

const Calendar: React.FC<CalendarProps> = ({ employeeId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentDate, employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();

      // Fetch holidays
      const holidaysResponse = await api.getHolidays({ year });
      if ((holidaysResponse as any).success) {
        setHolidays((holidaysResponse as any).data || []);
      }

      // Fetch leaves for employee
      if (employeeId) {
        const leavesResponse = await api.getLeaves({
          employeeId,
          status: 'APPROVED'
        });
        if ((leavesResponse as any).success) {
          setLeaves((leavesResponse as any).data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isHoliday = (date: Date) => {
    const dateKey = formatDateKey(date);
    return holidays.find(h => h.date.split('T')[0] === dateKey);
  };

  const isLeave = (date: Date) => {
    const dateKey = formatDateKey(date);
    return leaves.find(leave => {
      const startDate = new Date(leave.startDate).toISOString().split('T')[0];
      const endDate = new Date(leave.endDate).toISOString().split('T')[0];
      return dateKey >= startDate && dateKey <= endDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayContent = (date: Date) => {
    const holiday = isHoliday(date);
    const leave = isLeave(date);
    const today = isToday(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let bgColor = 'bg-white hover:bg-gray-50';
    let textColor = 'text-gray-900';
    let badges: JSX.Element[] = [];

    if (today) {
      bgColor = 'bg-primary-100 border-2 border-primary-500';
      textColor = 'text-primary-900 font-bold';
    } else if (isWeekend) {
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-500';
    }

    if (holiday) {
      badges.push(
        <div key="holiday" className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded truncate">
          {holiday.name}
        </div>
      );
    }

    if (leave) {
      const leaveColor = leave.leaveType === 'SICK' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
      badges.push(
        <div key="leave" className={`text-[10px] ${leaveColor} px-1 py-0.5 rounded truncate`}>
          {leave.isHalfDay ? `${leave.halfDayPeriod === 'MORNING' ? 'AM' : 'PM'} ${leave.leaveType}` : leave.leaveType}
        </div>
      );
    }

    return { bgColor, textColor, badges };
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {dayNames.map((name, i) => (
          <div key={i} className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-2">
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name.charAt(0)}</span>
          </div>
        ))}
        {weekDays.map((date, i) => {
          const { bgColor, textColor, badges } = getDayContent(date);
          return (
            <div
              key={i}
              className={`${bgColor} ${textColor} min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 rounded-lg border border-gray-200 transition-colors`}
            >
              <div className="text-base sm:text-lg font-semibold mb-1">{date.getDate()}</div>
              <div className="space-y-1">
                {badges.map((badge, idx) => (
                  <div key={idx}>{badge}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {dayNames.map((name, i) => (
          <div key={i} className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-2">
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{name.charAt(0)}</span>
          </div>
        ))}
        {monthDays.map((date, i) => {
          if (!date) {
            return <div key={i} className="min-h-[60px] sm:min-h-[100px]"></div>;
          }
          const { bgColor, textColor, badges } = getDayContent(date);
          return (
            <div
              key={i}
              className={`${bgColor} ${textColor} min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 rounded-lg border border-gray-200 transition-colors`}
            >
              <div className="text-sm sm:text-base font-semibold mb-1">{date.getDate()}</div>
              <div className="space-y-1">
                {badges.map((badge, idx) => (
                  <div key={idx}>{badge}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getTitle = () => {
    if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{getTitle()}</h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-primary-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-primary-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={navigatePrevious}
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary-100 border-2 border-primary-500 rounded"></div>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-100 rounded"></div>
          <span className="text-gray-600">Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 rounded"></div>
          <span className="text-gray-600">Annual Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 rounded"></div>
          <span className="text-gray-600">Sick Leave</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </div>
  );
};

export default Calendar;

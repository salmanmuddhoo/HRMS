export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYER' | 'EMPLOYEE';
  employee?: Employee;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  jobTitle: string;
  joiningDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  baseSalary: number;
  travellingAllowance: number;
  otherAllowances: number;
  localLeaveBalance: number;
  sickLeaveBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    jobTitle: string;
  };
  leaveType: 'LOCAL' | 'SICK';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isUrgent: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  isPresent: boolean;
  isLeave: boolean;
  leaveType?: 'LOCAL' | 'SICK';
  isAbsence: boolean;
  remarks?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    jobTitle: string;
  };
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
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  payrollId: string;
  employeeId: string;
  pdfPath?: string;
  generatedAt: string;
  downloadedAt?: string;
  payroll: {
    month: number;
    year: number;
    netSalary: number;
    status: string;
  };
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  onLeaveToday: number;
  pendingLeaves: number;
  currentMonthPayroll: {
    month: number;
    year: number;
    totalAmount: number;
    employeeCount: number;
  };
  departments: Array<{
    department: string;
    _count: number;
  }>;
  recentLeaves: Leave[];
  upcomingHolidays: PublicHoliday[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

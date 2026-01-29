import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.api.request(config);
    return response.data;
  }

  // Auth
  async login<T = any>(email: string, password: string): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
  }

  async getMe<T = any>(): Promise<T> {
    return this.request<T>({ method: 'GET', url: '/auth/me' });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request({
      method: 'POST',
      url: '/auth/change-password',
      data: { currentPassword, newPassword },
    });
  }

  // Employees
  async getEmployees(params?: any) {
    return this.request({ method: 'GET', url: '/employees', params });
  }

  async getEmployee(id: string) {
    return this.request({ method: 'GET', url: `/employees/${id}` });
  }

  async createEmployee(data: any) {
    return this.request({ method: 'POST', url: '/employees', data });
  }

  async updateEmployee(id: string, data: any) {
    return this.request({ method: 'PUT', url: `/employees/${id}`, data });
  }

  async deactivateEmployee(id: string) {
    return this.request({ method: 'DELETE', url: `/employees/${id}` });
  }

  async getEmployeeStats() {
    return this.request({ method: 'GET', url: '/employees/stats' });
  }

  async resetEmployeePassword(id: string, newPassword: string) {
    return this.request({
      method: 'POST',
      url: `/employees/${id}/reset-password`,
      data: { newPassword },
    });
  }

  // Leaves
  async getLeaves(params?: any) {
    return this.request({ method: 'GET', url: '/leaves', params });
  }

  async getLeave(id: string) {
    return this.request({ method: 'GET', url: `/leaves/${id}` });
  }

  async applyLeave(data: any) {
    return this.request({ method: 'POST', url: '/leaves/apply', data });
  }

  async addUrgentLeave(data: any) {
    return this.request({ method: 'POST', url: '/leaves/urgent', data });
  }

  async approveLeave(id: string) {
    return this.request({ method: 'PUT', url: `/leaves/${id}/approve` });
  }

  async rejectLeave(id: string, rejectionReason: string) {
    return this.request({
      method: 'PUT',
      url: `/leaves/${id}/reject`,
      data: { rejectionReason },
    });
  }

  async cancelLeave(id: string) {
    return this.request({ method: 'DELETE', url: `/leaves/${id}` });
  }

  // Attendance
  async getAttendance(params?: any) {
    return this.request({ method: 'GET', url: '/attendance', params });
  }

  async getAttendanceSummary(employeeId: string, month: number, year: number) {
    return this.request({
      method: 'GET',
      url: `/attendance/summary/${employeeId}`,
      params: { month, year },
    });
  }

  async markAbsence(data: any) {
    return this.request({ method: 'POST', url: '/attendance/absence', data });
  }

  // Payroll
  async getPayrolls(params?: any) {
    return this.request({ method: 'GET', url: '/payroll', params });
  }

  async getPayroll(id: string) {
    return this.request({ method: 'GET', url: `/payroll/${id}` });
  }

  async processPayroll(month: number, year: number) {
    return this.request({
      method: 'POST',
      url: '/payroll/process',
      data: { month, year },
    });
  }

  async approvePayroll(id: string) {
    return this.request({ method: 'PUT', url: `/payroll/${id}/approve` });
  }

  async lockPayroll(id: string) {
    return this.request({ method: 'PUT', url: `/payroll/${id}/lock` });
  }

  async updatePayroll(id: string, data: any) {
    return this.request({ method: 'PUT', url: `/payroll/${id}`, data });
  }

  async deletePayroll(id: string) {
    return this.request({ method: 'DELETE', url: `/payroll/${id}` });
  }

  // Payslips
  async generatePayslip(payrollId: string) {
    return this.request({
      method: 'POST',
      url: `/payslips/generate/${payrollId}`,
    });
  }

  async downloadPayslip(payrollId: string) {
    const token = localStorage.getItem('token');
    window.open(
      `${API_URL}/payslips/download/${payrollId}?token=${token}`,
      '_blank'
    );
  }

  async getEmployeePayslips(employeeId: string) {
    return this.request({
      method: 'GET',
      url: `/payslips/employee/${employeeId}`,
    });
  }

  // Public Holidays
  async getHolidays(params?: any) {
    return this.request({ method: 'GET', url: '/holidays', params });
  }

  async getHoliday(id: string) {
    return this.request({ method: 'GET', url: `/holidays/${id}` });
  }

  async createHoliday(data: any) {
    return this.request({ method: 'POST', url: '/holidays', data });
  }

  async updateHoliday(id: string, data: any) {
    return this.request({ method: 'PUT', url: `/holidays/${id}`, data });
  }

  async deleteHoliday(id: string) {
    return this.request({ method: 'DELETE', url: `/holidays/${id}` });
  }

  async getUpcomingHolidays(limit?: number) {
    return this.request({
      method: 'GET',
      url: '/holidays/upcoming',
      params: { limit },
    });
  }

  async uploadHolidays(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request({
      method: 'POST',
      url: '/holidays/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Reports
  async getDashboardStats<T = any>(): Promise<T> {
    return this.request<T>({ method: 'GET', url: '/reports/dashboard' });
  }

  async getLeaveReport(params?: any) {
    return this.request({ method: 'GET', url: '/reports/leave', params });
  }

  async getAttendanceReport(params: any) {
    return this.request({ method: 'GET', url: '/reports/attendance', params });
  }

  async getPayrollReport(params?: any) {
    return this.request({ method: 'GET', url: '/reports/payroll', params });
  }

  // System Config
  async getConfig() {
    return this.request({ method: 'GET', url: '/config' });
  }

  async getLeaveDefaults() {
    return this.request({ method: 'GET', url: '/config/leave-defaults' });
  }

  async updateConfig(configs: Array<{ key: string; value: string; description?: string }>) {
    return this.request({ method: 'POST', url: '/config/batch', data: configs });
  }
}

export default new ApiService();

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
  travellingDeduction: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'DRAFT' | 'APPROVED' | 'LOCKED';
  payslip?: {
    id: string;
    generatedAt: string;
    downloadedAt?: string;
  };
}

const Payslips: React.FC = () => {
  const { user, isEmployer } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getPayrolls({ year: selectedYear });
      if ((response as any).success) {
        // Filter to only show approved/locked payrolls for payslip generation
        const data = ((response as any).data || []).filter(
          (p: PayrollRecord) => p.status === 'APPROVED' || p.status === 'LOCKED'
        );
        setPayrolls(data);
      }
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleGeneratePayslip = async (payrollId: string) => {
    setGenerating(payrollId);
    setError('');
    setSuccess('');

    try {
      const response = await api.generatePayslip(payrollId);
      if ((response as any).success) {
        setSuccess('Payslip generated successfully');
        fetchPayrolls();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate payslip');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadPayslip = (payrollId: string) => {
    api.downloadPayslip(payrollId);
  };

  const handleGenerateAll = async () => {
    const payrollsWithoutPayslip = payrolls.filter(p => !p.payslip);
    if (payrollsWithoutPayslip.length === 0) {
      setError('All payslips have already been generated');
      return;
    }

    if (!window.confirm(`Generate payslips for ${payrollsWithoutPayslip.length} payroll records?`)) return;

    setError('');
    setSuccess('');

    try {
      for (const payroll of payrollsWithoutPayslip) {
        await api.generatePayslip(payroll.id);
      }
      setSuccess(`${payrollsWithoutPayslip.length} payslips generated`);
      fetchPayrolls();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate payslips');
      fetchPayrolls();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Group payrolls by month for better display
  const groupedByMonth = payrolls.reduce((acc, payroll) => {
    const key = `${payroll.year}-${payroll.month}`;
    if (!acc[key]) {
      acc[key] = {
        month: payroll.month,
        year: payroll.year,
        payrolls: [],
      };
    }
    acc[key].payrolls.push(payroll);
    return acc;
  }, {} as Record<string, { month: number; year: number; payrolls: PayrollRecord[] }>);

  const sortedMonths = Object.values(groupedByMonth).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
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

        {/* Year Selection */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow flex items-end gap-4">
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
          {isEmployer && payrolls.some(p => !p.payslip) && (
            <button
              onClick={handleGenerateAll}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Generate All Payslips
            </button>
          )}
        </div>

        {/* Payslips List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            <p>No approved payroll records for {selectedYear}.</p>
            <p className="mt-2 text-sm">Payslips can only be generated for approved or locked payrolls.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map(({ month, year, payrolls: monthPayrolls }) => (
              <div key={`${year}-${month}`} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {getMonthName(month)} {year}
                  </h2>
                  <p className="text-sm text-gray-500">{monthPayrolls.length} payroll records</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payslip</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthPayrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payroll.employee.firstName} {payroll.employee.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payroll.employee.employeeId} &bull; {payroll.employee.department}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="text-sm font-semibold text-green-700">
                              {formatCurrency(payroll.netSalary)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Gross: {formatCurrency(payroll.grossSalary)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payroll.status === 'LOCKED' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {payroll.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {payroll.payslip ? (
                              <div>
                                <span className="text-xs text-green-600 font-medium">Generated</span>
                                <div className="text-xs text-gray-400">
                                  {formatDate(payroll.payslip.generatedAt)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-yellow-600">Not generated</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!payroll.payslip && isEmployer && (
                                <button
                                  onClick={() => handleGeneratePayslip(payroll.id)}
                                  disabled={generating === payroll.id}
                                  className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 disabled:opacity-50"
                                >
                                  {generating === payroll.id ? 'Generating...' : 'Generate'}
                                </button>
                              )}
                              {payroll.payslip && (
                                <button
                                  onClick={() => handleDownloadPayslip(payroll.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Employee Self-Service Info */}
        {!isEmployer && user?.employee && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">Your Payslips</h3>
            <p className="mt-1 text-sm text-blue-600">
              You can view and download your payslips from this page. Payslips are available once your payroll has been approved and generated.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Payslips;

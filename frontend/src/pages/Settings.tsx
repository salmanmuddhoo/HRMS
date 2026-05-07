import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

interface LeaveYearStatus {
  fyStartMonth: number;
  fyStartDay: number;
  lastReset: string | null;
  currentFyStart: string;
  resetDue: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [leaveYearStatus, setLeaveYearStatus] = useState<LeaveYearStatus | null>(null);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const [config, setConfig] = useState({
    DEFAULT_LOCAL_LEAVE: '15',
    DEFAULT_SICK_LEAVE: '10',
    WORKING_DAYS_PER_MONTH: '22',
    PAYROLL_CYCLE_START_DAY: '1',
    FINANCIAL_YEAR_START_MONTH: '1',
    FINANCIAL_YEAR_START_DAY: '1',
    COMPANY_NAME: '',
    COMPANY_ADDRESS: '',
    COMPANY_PHONE: '',
    COMPANY_EMAIL: '',
  });

  useEffect(() => {
    fetchConfig();
    fetchLeaveYearStatus();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.getConfig();
      if ((response as any).success) {
        setConfig(prev => ({ ...prev, ...(response as any).data }));
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveYearStatus = async () => {
    try {
      const response = await api.getLeaveYearStatus();
      if ((response as any).success) setLeaveYearStatus((response as any).data);
    } catch (error) {
      console.error('Failed to fetch leave year status:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const configs = Object.entries(config).map(([key, value]) => ({
        key,
        value,
        description: getDescription(key),
      }));

      const response = await api.updateConfig(configs);
      if ((response as any).success) {
        setSuccess('Settings saved successfully!');
        fetchLeaveYearStatus();
      } else {
        setError('Failed to save settings');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLeaveYear = async () => {
    if (!window.confirm(
      'This will reset leave balances for all active employees:\n\n' +
      '• Annual leave: unused days carried forward + new entitlement added\n' +
      '• Sick leave: unused days moved to sick leave bank, balance reset to entitlement\n\n' +
      'This cannot be undone. Proceed?'
    )) return;

    setResetting(true);
    setResetError('');
    setResetSuccess('');

    try {
      const response = await api.resetLeaveYear();
      if ((response as any).success) {
        setResetSuccess(`Leave year reset successfully. ${(response as any).data.employeesUpdated} employees updated.`);
        fetchLeaveYearStatus();
      } else {
        setResetError('Failed to reset leave year');
      }
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed to reset leave year');
    } finally {
      setResetting(false);
    }
  };

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      DEFAULT_LOCAL_LEAVE: 'Default annual local leave days for new employees',
      DEFAULT_SICK_LEAVE: 'Default annual sick leave days for new employees',
      WORKING_DAYS_PER_MONTH: 'Number of working days per month for payroll calculation',
      PAYROLL_CYCLE_START_DAY: 'Day of month the payroll cycle starts (1 = standard calendar month)',
      FINANCIAL_YEAR_START_MONTH: 'Month the financial year starts (1 = January)',
      FINANCIAL_YEAR_START_DAY: 'Day of month the financial year starts',
      COMPANY_NAME: 'Company name for payslips',
      COMPANY_ADDRESS: 'Company address for payslips',
      COMPANY_PHONE: 'Company phone number',
      COMPANY_EMAIL: 'Company email address',
    };
    return descriptions[key] || '';
  };

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

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
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Leave Settings */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Settings</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure default leave allocation for all employees. New employees joining mid-year will have their leaves prorated based on joining date.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Annual Leave (days)
                </label>
                <input
                  type="number"
                  name="DEFAULT_LOCAL_LEAVE"
                  value={config.DEFAULT_LOCAL_LEAVE}
                  onChange={handleChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
                <p className="mt-1 text-sm text-gray-500">Annual leave days per year</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Sick Leave (days)
                </label>
                <input
                  type="number"
                  name="DEFAULT_SICK_LEAVE"
                  value={config.DEFAULT_SICK_LEAVE}
                  onChange={handleChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
                <p className="mt-1 text-sm text-gray-500">Sick leave days per year</p>
              </div>
            </div>
          </div>

          {/* Financial Year */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Year</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set the date the financial year starts. Leave balances are reset on this date each year.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Month</label>
                <select
                  name="FINANCIAL_YEAR_START_MONTH"
                  value={config.FINANCIAL_YEAR_START_MONTH}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Start Day</label>
                <select
                  name="FINANCIAL_YEAR_START_DAY"
                  value={config.FINANCIAL_YEAR_START_DAY}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  {dayOptions.map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payroll Settings */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payroll Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Working Days Per Month
                </label>
                <input
                  type="number"
                  name="WORKING_DAYS_PER_MONTH"
                  value={config.WORKING_DAYS_PER_MONTH}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
                <p className="mt-1 text-sm text-gray-500">Used for calculating per-day salary deductions</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payroll Cycle Start Day
                </label>
                <input
                  type="number"
                  name="PAYROLL_CYCLE_START_DAY"
                  value={config.PAYROLL_CYCLE_START_DAY}
                  onChange={handleChange}
                  min="1"
                  max="28"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Day of month the attendance cycle begins. Set to 1 for a standard calendar month.
                </p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Company Information</h2>
            <p className="text-sm text-gray-500 mb-4">
              This information will appear on employee payslips.
            </p>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  name="COMPANY_NAME"
                  value={config.COMPANY_NAME}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Company Address</label>
                <input
                  type="text"
                  name="COMPANY_ADDRESS"
                  value={config.COMPANY_ADDRESS}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Phone</label>
                  <input
                    type="tel"
                    name="COMPANY_PHONE"
                    value={config.COMPANY_PHONE}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Email</label>
                  <input
                    type="email"
                    name="COMPANY_EMAIL"
                    value={config.COMPANY_EMAIL}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-8">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Leave Year Reset */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Leave Year Reset</h2>
          <p className="text-sm text-gray-500 mb-4">
            Run this at the start of each financial year to refresh employee leave balances.
          </p>

          {leaveYearStatus && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-500">Financial Year Start</p>
                <p className="font-medium text-gray-900">
                  {MONTHS[leaveYearStatus.fyStartMonth - 1]} {leaveYearStatus.fyStartDay}
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-500">Current FY Started</p>
                <p className="font-medium text-gray-900">{leaveYearStatus.currentFyStart}</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-500">Last Reset</p>
                <p className="font-medium text-gray-900">{leaveYearStatus.lastReset || 'Never'}</p>
              </div>
            </div>
          )}

          {leaveYearStatus?.resetDue && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
              A new financial year has started and leave balances have not been reset yet.
            </div>
          )}

          <div className="bg-gray-50 rounded-md p-4 mb-4 text-sm text-gray-700">
            <p className="font-medium mb-2">What this does:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Annual leave</strong> — unused days are carried forward and added to the new year's entitlement
                (e.g. {config.DEFAULT_LOCAL_LEAVE} days + 5 unused = {Number(config.DEFAULT_LOCAL_LEAVE) + 5} days)
              </li>
              <li>
                <strong>Sick leave</strong> — unused days are moved to the sick leave bank; balance resets to {config.DEFAULT_SICK_LEAVE} days
              </li>
            </ul>
          </div>

          {resetSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {resetSuccess}
            </div>
          )}

          {resetError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {resetError}
            </div>
          )}

          <button
            type="button"
            onClick={handleResetLeaveYear}
            disabled={resetting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Leave Year'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;

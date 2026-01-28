import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [config, setConfig] = useState({
    DEFAULT_LOCAL_LEAVE: '15',
    DEFAULT_SICK_LEAVE: '10',
    WORKING_DAYS_PER_MONTH: '22',
    COMPANY_NAME: '',
    COMPANY_ADDRESS: '',
    COMPANY_PHONE: '',
    COMPANY_EMAIL: '',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.getConfig();
      if ((response as any).success) {
        setConfig(prev => ({
          ...prev,
          ...(response as any).data,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } else {
        setError('Failed to save settings');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      DEFAULT_LOCAL_LEAVE: 'Default annual local leave days for new employees',
      DEFAULT_SICK_LEAVE: 'Default annual sick leave days for new employees',
      WORKING_DAYS_PER_MONTH: 'Number of working days per month for payroll calculation',
      COMPANY_NAME: 'Company name for payslips',
      COMPANY_ADDRESS: 'Company address for payslips',
      COMPANY_PHONE: 'Company phone number',
      COMPANY_EMAIL: 'Company email address',
    };
    return descriptions[key] || '';
  };

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
                  Default Annual Local Leave (days)
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
                  Default Annual Sick Leave (days)
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

          {/* Payroll Settings */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payroll Settings</h2>

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
                className="mt-1 block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
              />
              <p className="mt-1 text-sm text-gray-500">Used for calculating per-day salary deductions</p>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;

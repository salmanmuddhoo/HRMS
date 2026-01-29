import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

const Holidays: React.FC = () => {
  const { isEmployer } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getHolidays({ year: selectedYear });
      if ((response as any).success) {
        setHolidays((response as any).data || []);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleOpenModal = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0],
        description: holiday.description || '',
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        description: '',
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
    setFormData({ name: '', date: '', description: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingHoliday) {
        const response = await api.updateHoliday(editingHoliday.id, formData);
        if ((response as any).success) {
          setSuccess('Holiday updated successfully');
          fetchHolidays();
          handleCloseModal();
        }
      } else {
        const response = await api.createHoliday(formData);
        if ((response as any).success) {
          setSuccess('Holiday created successfully');
          fetchHolidays();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const response = await api.deleteHoliday(id);
      if ((response as any).success) {
        setSuccess('Holiday deleted successfully');
        fetchHolidays();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await api.uploadHolidays(selectedFile);
      if ((response as any).success) {
        setSuccess((response as any).message);
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchHolidays();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to upload holidays');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateStr);
    holidayDate.setHours(0, 0, 0, 0);
    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (dateStr: string) => {
    const daysUntil = getDaysUntil(dateStr);
    if (daysUntil < 0) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Passed</span>;
    } else if (daysUntil === 0) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Today</span>;
    } else if (daysUntil <= 7) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">In {daysUntil} days</span>;
    } else if (daysUntil <= 30) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">In {daysUntil} days</span>;
    }
    return null;
  };

  // Group holidays by month
  const groupedByMonth = holidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).getMonth();
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(holiday);
    return acc;
  }, {} as Record<number, Holiday[]>);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get upcoming holidays for quick view
  const upcomingHolidays = holidays
    .filter(h => getDaysUntil(h.date) >= 0)
    .slice(0, 3);

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Public Holidays</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and view public holidays for the year</p>
          </div>
          {isEmployer && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Excel
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Holiday
              </button>
            </div>
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

        {/* Year Selection & Upcoming Holidays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="mt-3 text-sm text-gray-500">
              {holidays.length} holidays in {selectedYear}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Upcoming Holidays</h3>
            {upcomingHolidays.length > 0 ? (
              <div className="space-y-2">
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(holiday.date)}</div>
                    </div>
                    {getStatusBadge(holiday.date)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming holidays this year</p>
            )}
          </div>
        </div>

        {/* Holidays List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No holidays found for {selectedYear}.</p>
            {isEmployer && (
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Add the first holiday
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByMonth)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([monthIndex, monthHolidays]) => (
                <div key={monthIndex} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {monthNames[parseInt(monthIndex)]}
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {monthHolidays.map((holiday) => (
                      <div key={holiday.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex flex-col items-center justify-center">
                              <span className="text-lg font-bold text-primary-700">
                                {new Date(holiday.date).getDate()}
                              </span>
                              <span className="text-xs text-primary-600">
                                {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-base font-medium text-gray-900">{holiday.name}</h3>
                              <p className="text-sm text-gray-500">{formatDate(holiday.date)}</p>
                              {holiday.description && (
                                <p className="mt-1 text-sm text-gray-600">{holiday.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(holiday.date)}
                            {isEmployer && (
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={() => handleOpenModal(holiday)}
                                  className="p-1 text-gray-400 hover:text-primary-600"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(holiday.id)}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                  title="Delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Add/Edit Holiday Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                </h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Holiday Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                      placeholder="e.g., New Year's Day"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                      rows={3}
                      placeholder="Add any additional details..."
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingHoliday ? 'Update' : 'Add Holiday')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Excel Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Upload Holidays from Excel</h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">File Format</h3>
                  <p className="text-sm text-blue-600 mb-2">
                    Your Excel file should have two columns:
                  </p>
                  <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                    <li><strong>Column A:</strong> Holiday Name</li>
                    <li><strong>Column B:</strong> Date (e.g., 2024-01-01 or 01/01/2024)</li>
                  </ul>
                  <p className="text-xs text-blue-500 mt-2">
                    Supported formats: .xlsx, .xls, .csv
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Holidays;

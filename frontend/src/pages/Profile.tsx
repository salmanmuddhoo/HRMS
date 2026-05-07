import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwData.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      const res = await api.changePassword(pwData.currentPassword, pwData.newPassword);
      if ((res as any).success) {
        setPwSuccess('Password changed successfully!');
        setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setChangingPassword(false);
        setTimeout(() => setPwSuccess(''), 3000);
      }
    } catch (e: any) {
      setPwError(e.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleNotifToggle = async (val: boolean) => {
    setEmailNotifications(val);
    setNotifLoading(true);
    try {
      await api.updateEmailNotifications(val);
      setNotifMsg(val ? 'Email notifications enabled.' : 'Email notifications disabled.');
      setTimeout(() => setNotifMsg(''), 3000);
    } catch {
      setNotifMsg('Failed to update preference.');
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Profile info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">
              {user?.employee
                ? `${user.employee.firstName[0]}${user.employee.lastName[0]}`
                : user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
              </h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800">{user?.role}</span>
            </div>
          </div>

          {user?.employee && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{user.employee.department}</p>
              </div>
              <div>
                <p className="text-gray-500">Job Title</p>
                <p className="font-medium text-gray-900">{user.employee.jobTitle}</p>
              </div>
              <div>
                <p className="text-gray-500">Annual Leave Balance</p>
                <p className="font-medium text-gray-900">{user.employee.localLeaveBalance} days</p>
              </div>
              <div>
                <p className="text-gray-500">Sick Leave Balance</p>
                <p className="font-medium text-gray-900">{user.employee.sickLeaveBalance} days</p>
              </div>
              <div>
                <p className="text-gray-500">Sick Leave Bank</p>
                <p className="font-medium text-gray-900">{user.employee.sickLeaveBank ?? 0} days</p>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Change Password
              </button>
            )}
          </div>

          {pwSuccess && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{pwSuccess}</div>}

          {changingPassword && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {pwError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{pwError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={pwData.currentPassword}
                  onChange={(e) => setPwData((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={pwData.newPassword}
                  onChange={(e) => setPwData((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={pwData.confirmPassword}
                  onChange={(e) => setPwData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setChangingPassword(false); setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPwError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {pwLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Email Notification Preference - only for employers/admins */}
        {(user?.role === 'ADMIN' || user?.role === 'EMPLOYER' || user?.role === 'DIRECTOR') && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">Email Notifications</h2>
            <p className="text-sm text-gray-500 mb-4">Receive email alerts when employees submit leave requests.</p>
            {notifMsg && <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">{notifMsg}</div>}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => !notifLoading && handleNotifToggle(!emailNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-primary-600' : 'bg-gray-300'} ${notifLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-700">
                {emailNotifications ? 'Notifications enabled' : 'Notifications disabled'}
              </span>
            </label>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leaves from './pages/Leaves';
import LeaveApply from './pages/LeaveApply';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Payslips from './pages/Payslips';
import Reports from './pages/Reports';
import Holidays from './pages/Holidays';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <PrivateRoute>
                <Leaves />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaves/apply"
            element={
              <PrivateRoute>
                <LeaveApply />
              </PrivateRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <PrivateRoute>
                <Employees />
              </PrivateRoute>
            }
          />
          <Route
            path="/employees/add"
            element={
              <PrivateRoute>
                <EmployeeForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/employees/:id/edit"
            element={
              <PrivateRoute>
                <EmployeeForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <Attendance />
              </PrivateRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <PrivateRoute>
                <Payroll />
              </PrivateRoute>
            }
          />
          <Route
            path="/payslips"
            element={
              <PrivateRoute>
                <Payslips />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
          <Route
            path="/holidays"
            element={
              <PrivateRoute>
                <Holidays />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

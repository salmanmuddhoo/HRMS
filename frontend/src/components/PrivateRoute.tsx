import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactElement;
  requireEmployer?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireEmployer = false,
}) => {
  const { isAuthenticated, isEmployer, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireEmployer && !isEmployer) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;

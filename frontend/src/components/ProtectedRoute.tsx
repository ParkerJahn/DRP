import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireProActive?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireProActive = false 
}) => {
  const { user, loading, role, proStatus } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !role) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Check if PRO needs to be active
  if (requireProActive && role === 'PRO' && proStatus !== 'active') {
    return <Navigate to="/billing/subscribe" replace />;
  }

  // User is authorized, render the protected content
  return <>{children}</>;
};

// Convenience components for common protection patterns
export const ProRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="PRO" requireProActive={true}>
    {children}
  </ProtectedRoute>
);

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="STAFF">
    {children}
  </ProtectedRoute>
);

export const AthleteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="ATHLETE">
    {children}
  </ProtectedRoute>
);

export const ProOrStaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="STAFF">
    {children}
  </ProtectedRoute>
); 
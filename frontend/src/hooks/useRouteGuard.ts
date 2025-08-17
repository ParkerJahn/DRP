import { useAuth } from './useAuth';
import { canAccessRoute, getRedirectPath, ROUTES } from '../config/routes';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Hook for route access control and navigation
 * Implements the PRD requirements for preventing authenticated users from accessing auth pages
 * and ensuring proper role-based access control
 */
export const useRouteGuard = () => {
  const { user, loading, role, proStatus } = useAuth();
  const navigate = useNavigate();

  // Check if user can access a specific route
  const canAccess = (route: string): boolean => {
    if (loading) return false;
    return canAccessRoute(route, role, proStatus, !!user);
  };

  // Redirect user to appropriate location based on their state
  const redirectToAppropriateLocation = () => {
    if (loading) return;
    
    const redirectPath = getRedirectPath(!!user, role, proStatus);
    navigate(redirectPath, { replace: true });
  };

  // Check if current route is accessible and redirect if not
  const guardRoute = (route: string) => {
    if (loading) return;
    
    if (!canAccess(route)) {
      redirectToAppropriateLocation();
    }
  };

  // Check if user is trying to access auth pages when already authenticated
  const preventAuthPageAccess = () => {
    if (loading) return;
    
    if (user && (window.location.pathname === ROUTES.AUTH || window.location.pathname === ROUTES.REGISTER)) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };

  // Check if user is trying to access app pages when not authenticated
  const preventAppPageAccess = () => {
    if (loading) return;
    
    if (!user && window.location.pathname.startsWith(ROUTES.APP)) {
      navigate(ROUTES.AUTH, { replace: true });
    }
  };

  // Check if PRO user is trying to access app without active status
  const preventInactiveProAccess = () => {
    if (loading) return;
    
    if (user && role === 'PRO' && proStatus !== 'active' && window.location.pathname.startsWith(ROUTES.APP)) {
      navigate(ROUTES.BILLING_SUBSCRIBE, { replace: true });
    }
  };

  // Auto-redirect based on user state
  useEffect(() => {
    if (loading) return;
    
    // Prevent authenticated users from accessing auth pages
    preventAuthPageAccess();
    
    // Prevent unauthenticated users from accessing app pages
    preventAppPageAccess();
    
    // Prevent inactive PRO users from accessing app pages
    preventInactiveProAccess();
  }, [user, loading, role, proStatus, navigate]);

  return {
    canAccess,
    guardRoute,
    redirectToAppropriateLocation,
    isAuthenticated: !!user,
    isLoading: loading,
    userRole: role,
    proStatus,
  };
};

/**
 * Hook for protecting specific routes
 * Usage: useProtectedRoute('/app/dashboard')
 */
export const useProtectedRoute = (route: string) => {
  const { canAccess, guardRoute, isLoading } = useRouteGuard();
  
  useEffect(() => {
    guardRoute(route);
  }, [route]);
  
  return {
    canAccess: canAccess(route),
    isLoading,
  };
}; 
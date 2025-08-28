import type { UserRole } from '../types';

// Route configuration based on PRD requirements
export interface RouteConfig {
  path: string;
  component: string;
  title: string;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  requireProActive?: boolean;
  isPublic?: boolean;
}

export const ROUTES = {
  // Public routes (no authentication required)
  LANDING: '/',
  PRICING: '/pricing',
  ABOUT: '/about',
  FEATURES: '/features',
  CONTACT: '/contact',
  
  // Auth routes (only accessible when NOT authenticated)
  AUTH: '/auth',
  REGISTER: '/register',
  
  // Billing routes (accessible when authenticated but PRO not active)
  BILLING_SUBSCRIBE: '/billing/subscribe',
  
  // Join invite route (special case - accessible by both auth and unauth users)
  JOIN_INVITE: '/join',
  
  // App routes (require authentication and proper role)
  APP: '/app',
  DASHBOARD: '/app/dashboard',
  PROFILE: '/app/profile',
  TEAM: '/app/team',
  MESSAGES: '/app/messages',
  CALENDAR: '/app/calendar',
  PROGRAMS: '/app/programs',
  PAYMENTS: '/app/payments',
} as const;

// Route configuration with guards
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  [ROUTES.LANDING]: {
    path: ROUTES.LANDING,
    component: 'Landing',
    title: 'Home',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.PRICING]: {
    path: ROUTES.PRICING,
    component: 'Pricing',
    title: 'Pricing',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.ABOUT]: {
    path: ROUTES.ABOUT,
    component: 'About',
    title: 'About',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.FEATURES]: {
    path: ROUTES.FEATURES,
    component: 'Features',
    title: 'Features',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.CONTACT]: {
    path: ROUTES.CONTACT,
    component: 'Contact',
    title: 'Contact',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.AUTH]: {
    path: ROUTES.AUTH,
    component: 'Auth',
    title: 'Sign In',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.REGISTER]: {
    path: ROUTES.REGISTER,
    component: 'Auth',
    title: 'Register',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.BILLING_SUBSCRIBE]: {
    path: ROUTES.BILLING_SUBSCRIBE,
    component: 'BillingSubscribe',
    title: 'Subscribe',
    requiresAuth: true,
    allowedRoles: ['PRO'],
    requireProActive: false, // This route is specifically for inactive PROs
  },
  
  [ROUTES.JOIN_INVITE]: {
    path: ROUTES.JOIN_INVITE,
    component: 'JoinInvite',
    title: 'Join Team',
    requiresAuth: false, // Special case - can be accessed by both auth and unauth users
    isPublic: true,
  },
  
  [ROUTES.DASHBOARD]: {
    path: ROUTES.DASHBOARD,
    component: 'Dashboard',
    title: 'Dashboard',
    requiresAuth: true,
    allowedRoles: ['PRO', 'STAFF', 'ATHLETE'],
  },
  
  [ROUTES.PROFILE]: {
    path: ROUTES.PROFILE,
    component: 'Profile',
    title: 'Profile',
    requiresAuth: true,
    allowedRoles: ['PRO', 'STAFF', 'ATHLETE'],
  },
  
  [ROUTES.TEAM]: {
    path: ROUTES.TEAM,
    component: 'TeamManagement',
    title: 'Your Team',
    requiresAuth: true,
    allowedRoles: ['PRO', 'ATHLETE'],
    requireProActive: false, // Athletes don't need PRO status
  },
  
  [ROUTES.MESSAGES]: {
    path: ROUTES.MESSAGES,
    component: 'Messages',
    title: 'Messages',
    requiresAuth: true,
    allowedRoles: ['PRO', 'STAFF', 'ATHLETE'],
  },
  
  [ROUTES.CALENDAR]: {
    path: ROUTES.CALENDAR,
    component: 'Calendar',
    title: 'Calendar',
    requiresAuth: true,
    allowedRoles: ['PRO', 'STAFF', 'ATHLETE'],
  },
  
  [ROUTES.PROGRAMS]: {
    path: ROUTES.PROGRAMS,
    component: 'Programs',
    title: 'SWEATsheet',
    requiresAuth: true,
    allowedRoles: ['PRO', 'STAFF', 'ATHLETE'],
  },
  
  [ROUTES.PAYMENTS]: {
    path: ROUTES.PAYMENTS,
    component: 'Payments',
    title: 'Payments',
    requiresAuth: true,
    allowedRoles: ['PRO', 'ATHLETE'],
  },
};

// Helper functions for route access control
export const canAccessRoute = (
  route: string,
  userRole: UserRole | null,
  proStatus: string | null,
  isAuthenticated: boolean
): boolean => {
  const config = ROUTE_CONFIG[route];
  if (!config) return false;
  
  // Public routes are always accessible
  if (config.isPublic) return true;
  
  // Auth routes should only be accessible when NOT authenticated
  if (config.requiresAuth === false && isAuthenticated) return false;
  
  // Protected routes require authentication
  if (config.requiresAuth && !isAuthenticated) return false;
  
  // Check role requirements
  if (config.allowedRoles && userRole && !config.allowedRoles.includes(userRole)) {
    return false;
  }
  
  // Check PRO status requirements
  if (config.requireProActive && userRole === 'PRO' && proStatus !== 'active') {
    return false;
  }
  
  return true;
};

// Get menu items for a specific role
export const getMenuItems = (role: UserRole | null) => {
  const menuItems: Array<{ path: string; title: string; icon: string }> = [
    { path: ROUTES.DASHBOARD, title: 'Dashboard', icon: 'dashboard' },
    { path: ROUTES.PROFILE, title: 'Profile', icon: 'profile' },
    { path: ROUTES.MESSAGES, title: 'Messages', icon: 'messages' },
    { path: ROUTES.CALENDAR, title: 'Calendar', icon: 'calendar' },
    { path: ROUTES.PROGRAMS, title: 'SWEATsheet', icon: 'programs' },
  ];
  
  // Add role-specific menu items
  if (role === 'PRO') {
    menuItems.splice(2, 0, { path: ROUTES.TEAM, title: 'Your Team', icon: 'team' });
    menuItems.push({ path: ROUTES.PAYMENTS, title: 'Payments', icon: 'payments' });
  } else if (role === 'ATHLETE') {
    menuItems.splice(3, 0, { path: ROUTES.TEAM, title: 'Your Team', icon: 'team' });
    menuItems.splice(4, 0, { path: ROUTES.PAYMENTS, title: 'Payments', icon: 'payments' });
  }
  
  return menuItems;
};

// Get redirect path based on user state
export const getRedirectPath = (
  isAuthenticated: boolean,
  userRole: UserRole | null,
  proStatus: string | null
): string => {
  if (!isAuthenticated) {
    return ROUTES.AUTH;
  }
  
  if (userRole === 'PRO' && proStatus !== 'active') {
    return ROUTES.BILLING_SUBSCRIBE;
  }
  
  return ROUTES.DASHBOARD;
}; 
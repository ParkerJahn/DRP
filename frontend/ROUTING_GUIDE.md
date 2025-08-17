# Routing & Route Guards Implementation Guide

This document explains how the routing system implements the PRD requirements for security, cost control, and proper user access management.

## Overview

The routing system has been designed to implement the exact requirements from your PRD:

1. **Unauthenticated users** can only access sign-up/register pages
2. **Authenticated users** cannot access sign-up/register pages (prevents unnecessary data usage)
3. **Maintain security** and **low Firebase costs**

## Route Categories

### 1. Public Routes (Accessible to Everyone)
- `/` - Landing page
- `/pricing` - Pricing information
- `/about` - About page
- `/contact` - Contact form

### 2. Auth Routes (Only for Unauthenticated Users)
- `/auth` - Sign in page
- `/register` - Registration page

**Key Security Feature**: If an authenticated user tries to access these routes, they are automatically redirected to `/app/dashboard`. This prevents unnecessary Firebase calls and data usage.

### 3. Billing Routes (Special Access)
- `/billing/subscribe` - Only accessible to authenticated PRO users with inactive status

### 4. App Routes (Require Authentication + Role)
- `/app/dashboard` - Dashboard (all roles)
- `/app/profile` - Profile management (all roles)
- `/app/team` - Team management (PRO only)
- `/app/messages` - Messaging (all roles)
- `/app/calendar` - Calendar (all roles)
- `/app/programs` - SWEATsheet (all roles)
- `/app/payments` - Payments (PRO + Athlete only)

### 5. Special Routes
- `/join` - Join invite (accessible by both authenticated and unauthenticated users)

## Route Guards Implementation

### AuthPageGuard
```typescript
function AuthPageGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  // If user is already authenticated, redirect to dashboard to prevent unnecessary data usage
  if (user) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  
  // User is not authenticated, allow access to auth pages
  return <>{children}</>;
}
```

**Purpose**: Prevents authenticated users from accessing auth pages, reducing unnecessary Firebase calls and improving security.

### AppPageGuard
```typescript
function AppPageGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role, proStatus } = useAuth();
  
  // If no user, redirect to auth
  if (!user) {
    return <Navigate to={ROUTES.AUTH} replace />;
  }
  
  // If user is PRO but not active, show billing page
  if (role === 'PRO' && proStatus !== 'active') {
    return <BillingSubscribe onBackToDashboard={() => window.location.reload()} />;
  }
  
  // User is authenticated and authorized, show app content
  return <>{children}</>;
}
```

**Purpose**: Ensures only authenticated users can access app pages and handles PRO billing status.

### PublicPageGuard
```typescript
function PublicPageGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  // Public pages are always accessible
  return <>{children}</>;
}
```

**Purpose**: Allows public access to marketing pages without authentication requirements.

## Route Configuration

The routing system uses a centralized configuration in `src/config/routes.ts`:

```typescript
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  [ROUTES.AUTH]: {
    path: ROUTES.AUTH,
    component: 'Auth',
    title: 'Sign In',
    requiresAuth: false,
    isPublic: true,
  },
  
  [ROUTES.TEAM]: {
    path: ROUTES.TEAM,
    component: 'TeamManagement',
    title: 'Your Team',
    requiresAuth: true,
    allowedRoles: ['PRO'],
    requireProActive: true,
  },
  // ... more routes
};
```

## Security Features

### 1. Authentication Prevention
- Authenticated users cannot access `/auth` or `/register`
- Automatic redirect to dashboard prevents unnecessary Firebase calls
- Reduces data usage and improves security

### 2. Role-Based Access Control
- Each route specifies which roles can access it
- PRO users have access to team management
- Staff users can access calendar and programs
- Athletes have limited access based on their role

### 3. PRO Status Validation
- Inactive PRO users are redirected to billing
- Prevents access to app features until payment is complete
- Ensures proper billing flow

## Cost Control Benefits

### 1. Reduced Firebase Calls
- Authenticated users don't trigger auth page Firebase calls
- Automatic redirects prevent unnecessary data fetching
- Efficient route guards minimize redundant operations

### 2. Optimized Data Flow
- Users are immediately redirected to appropriate locations
- No unnecessary component mounting/unmounting
- Clean separation between public and protected routes

### 3. Smart Loading States
- Loading indicators prevent premature route access
- Debounced authentication checks reduce API calls
- Efficient state management

## Usage Examples

### Basic Route Protection
```typescript
import { useProtectedRoute } from '../hooks/useRouteGuard';

function MyComponent() {
  const { canAccess, isLoading } = useProtectedRoute('/app/team');
  
  if (isLoading) return <LoadingSpinner />;
  if (!canAccess) return <AccessDenied />;
  
  return <TeamManagement />;
}
```

### Route Guard Hook
```typescript
import { useRouteGuard } from '../hooks/useRouteGuard';

function MyComponent() {
  const { canAccess, guardRoute, userRole } = useRouteGuard();
  
  useEffect(() => {
    guardRoute('/app/dashboard');
  }, []);
  
  return <div>Welcome, {userRole}!</div>;
}
```

## Testing Route Guards

### Test Cases to Verify

1. **Unauthenticated User**:
   - Can access `/`, `/auth`, `/register`
   - Cannot access `/app/*` routes
   - Redirected to `/auth` when trying to access protected routes

2. **Authenticated User**:
   - Cannot access `/auth` or `/register`
   - Automatically redirected to `/app/dashboard`
   - Can access role-appropriate app routes

3. **PRO User (Inactive)**:
   - Cannot access app routes
   - Redirected to `/billing/subscribe`
   - Cannot access team management

4. **Role-Based Access**:
   - Only PRO users can access `/app/team`
   - Staff users can access calendar and programs
   - Athletes have limited access based on role

## Implementation Notes

### Firebase Cost Optimization
- Route guards prevent unnecessary Firebase calls
- Authenticated users are immediately redirected away from auth pages
- Efficient loading states reduce redundant operations

### Security Best Practices
- All route access is validated through guards
- Role-based permissions are enforced at the route level
- Automatic redirects prevent unauthorized access attempts

### User Experience
- Smooth transitions between routes
- Clear feedback for unauthorized access
- Consistent loading states throughout the app

## Future Enhancements

1. **Route Analytics**: Track route access patterns for optimization
2. **Advanced Permissions**: Granular permission system for complex roles
3. **Route Caching**: Cache route permissions for better performance
4. **Audit Logging**: Log route access attempts for security monitoring

## Troubleshooting

### Common Issues

1. **Infinite Redirects**: Check route guard logic and dependencies
2. **Route Not Found**: Verify route configuration in `routes.ts`
3. **Permission Denied**: Check user role and PRO status
4. **Loading States**: Ensure proper loading state management

### Debug Mode
Enable debug logging in route guards to troubleshoot access issues:

```typescript
// Add to route guards for debugging
console.log('Route guard check:', { route, user, role, proStatus });
```

This routing system ensures your app maintains security, controls Firebase costs, and provides a smooth user experience while implementing all PRD requirements. 
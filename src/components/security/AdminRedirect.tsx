import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * AdminRedirect Component
 * 
 * Automatically redirects admin routes to the Zero Trust protected subdomain
 * This ensures admins always access through the secure gateway
 */
export function AdminRedirect() {
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect on production and for admin routes
    const isProduction = window.location.hostname === 'whyteclub.com';
    const isAdminRoute = location.pathname.startsWith('/admin');
    
    if (isProduction && isAdminRoute) {
      // Preserve the path after /admin
      const adminPath = location.pathname.replace('/admin', '');
      const queryString = location.search;
      
      // Redirect to Zero Trust protected domain
      const redirectUrl = `https://admin.whyteclub.com${adminPath}${queryString}`;
      
      console.log('[AdminRedirect] Redirecting to Zero Trust domain:', redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [location]);
  
  return null;
}

/**
 * Hook to check if we're on the admin subdomain
 */
export function useIsAdminDomain() {
  const hostname = window.location.hostname;
  return hostname === 'admin.whyteclub.com' || hostname === 'admin.localhost';
}

/**
 * Hook to get the appropriate URL based on context
 */
export function useContextualUrl() {
  const isAdminDomain = useIsAdminDomain();
  
  return {
    adminUrl: isAdminDomain 
      ? window.location.origin 
      : import.meta.env.VITE_ADMIN_URL || 'https://admin.whyteclub.com',
    publicUrl: import.meta.env.VITE_PUBLIC_URL || 'https://whyteclub.com',
    isAdminDomain
  };
}
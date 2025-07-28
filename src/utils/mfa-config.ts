// MFA Configuration based on environment
export const MFA_CONFIG = {
  // Development mode bypasses
  isDevelopment: import.meta.env.DEV,
  
  // Session duration
  sessionDuration: import.meta.env.DEV ? '24 hours' : '8 hours',
  
  // Whether to bypass MFA verification in development
  bypassVerification: import.meta.env.DEV,
  
  // Whether to auto-create sessions after setup
  autoCreateSession: import.meta.env.DEV,
  
  // Whether to validate sessions against database
  validateSessions: !import.meta.env.DEV,
};

export const shouldBypassMFA = () => {
  return MFA_CONFIG.isDevelopment && sessionStorage.getItem('mfa_dev_bypass') === 'true';
};

export const shouldValidateSession = () => {
  return MFA_CONFIG.validateSessions;
};
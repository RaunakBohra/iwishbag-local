import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type definitions for authentication
export type DatabaseUser = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

export type DatabaseClient = SupabaseClient<unknown>;

export interface AuthResult {
  user: DatabaseUser;
  supabaseClient: DatabaseClient;
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authenticate user from Authorization header
 */
export async function authenticateUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new AuthError('No authorization header provided', 401);
  }

  const supabaseClient: DatabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  return { user, supabaseClient };
}

/**
 * Require admin role for the authenticated user
 */
export async function requireAdmin(supabaseClient: DatabaseClient, userId: string): Promise<void> {
  const { data: userRole, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !userRole) {
    throw new AuthError('Admin access required', 403);
  }
}

/**
 * Require specific role for the authenticated user
 */
export async function requireRole(
  supabaseClient: DatabaseClient, 
  userId: string, 
  requiredRole: 'admin' | 'moderator' | 'user'
): Promise<void> {
  const { data: userRole, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !userRole) {
    throw new AuthError('Authentication required', 401);
  }

  // Role hierarchy: admin > moderator > user
  const roleHierarchy = { admin: 3, moderator: 2, user: 1 };
  const userRoleLevel = roleHierarchy[userRole.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    throw new AuthError(`${requiredRole} access required`, 403);
  }
}

/**
 * Create standardized error response
 */
export function createAuthErrorResponse(error: AuthError, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({
    success: false,
    error: error.message,
    code: error.status
  }), {
    status: error.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Validate request method
 */
export function validateMethod(req: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(req.method)) {
    throw new AuthError(`Method ${req.method} not allowed`, 405);
  }
}
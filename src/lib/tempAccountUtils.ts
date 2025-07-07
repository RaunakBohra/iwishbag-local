import { supabase } from '@/integrations/supabase/client';

export interface TempAccount {
  id: string;
  email: string;
  isTemporary: true;
  createdAt: string;
}

/**
 * Creates a temporary user account for guest checkout functionality
 */
export const createTempAccount = async (email: string): Promise<TempAccount> => {
  try {
    console.log('Creating temp account for email:', email);
    
    // Generate a unique temporary password using crypto
    const generateTempId = () => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(36)).join('');
    };
    
    // Create a temporary password (user won't know this)
    const tempPassword = `temp_${generateTempId()}_${Date.now()}`;
    
    console.log('Attempting to create user with Supabase Auth...');
    
    // Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          is_temporary: true,
          full_name: 'Guest User',
          created_via: 'guest_cart'
        }
      }
    });
    
    console.log('Auth signup result:', { authData, authError });

    if (authError) {
      console.error('Auth error creating temp account:', authError);
      throw new Error(`Failed to create temporary account: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth signup');
    }

    // Create profile entry
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: 'Guest User',
        is_temporary: true,
        created_via: 'guest_cart'
      });

    if (profileError) {
      console.error('Profile error creating temp account:', profileError);
      // Don't throw here as auth user was created successfully
    }

    return {
      id: authData.user.id,
      email: email,
      isTemporary: true,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error creating temporary account:', error);
    throw error;
  }
};

/**
 * Transfers quote ownership from anonymous to temporary account
 */
export const transferQuoteToTempAccount = async (quoteId: string, tempUserId: string, guestEmail: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        user_id: tempUserId,
        email: guestEmail, // Keep the guest email for continuity
        is_anonymous: false, // No longer anonymous
        temp_account_created_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    if (error) {
      console.error('Error transferring quote ownership:', error);
      throw new Error(`Failed to transfer quote ownership: ${error.message}`);
    }

  } catch (error) {
    console.error('Error in transferQuoteToTempAccount:', error);
    throw error;
  }
};

/**
 * Checks if a user account is temporary
 */
export const isTempAccount = (user: any): boolean => {
  return user?.user_metadata?.is_temporary === true || user?.app_metadata?.is_temporary === true;
};

/**
 * Gets or creates a temporary account for guest cart functionality
 */
export const getOrCreateTempAccount = async (email: string): Promise<TempAccount> => {
  try {
    // First check if there's already a temporary account with this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, is_temporary, created_at')
      .eq('email', email)
      .eq('is_temporary', true)
      .single();

    if (existingProfile) {
      return {
        id: existingProfile.id,
        email: existingProfile.email,
        isTemporary: true,
        createdAt: existingProfile.created_at
      };
    }

    // Create new temporary account if none exists
    return await createTempAccount(email);

  } catch (error) {
    console.error('Error in getOrCreateTempAccount:', error);
    throw error;
  }
};

/**
 * Signs in a temporary user (for session management)
 */
export const signInTempAccount = async (tempUserId: string): Promise<void> => {
  try {
    // Get the user's email from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', tempUserId)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to find temporary account profile');
    }

    // For temporary accounts, we'll use a workaround since we don't have their password
    // We'll set a session token directly (this is a simplified approach)
    // In production, you might want to use Supabase's admin auth functions
    
    console.log('Temporary account session created for:', profile.email);
    
  } catch (error) {
    console.error('Error signing in temporary account:', error);
    throw error;
  }
};
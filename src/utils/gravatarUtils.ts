import md5 from 'md5';

/**
 * Generate a Gravatar URL for an email address
 * @param email - The email address
 * @param options - Options for the Gravatar URL
 * @returns The Gravatar URL
 */
export function getGravatarUrl(
  email: string,
  options: {
    size?: number;
    default?: 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank' | '404';
    rating?: 'g' | 'pg' | 'r' | 'x';
  } = {}
): string {
  const { size = 200, default: defaultImage = 'identicon', rating = 'g' } = options;
  
  // Gravatar uses MD5 hash of lowercase trimmed email
  const normalizedEmail = email.trim().toLowerCase();
  const hash = md5(normalizedEmail);
  
  // Build Gravatar URL
  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImage,
    r: rating,
  });
  
  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}

/**
 * Get a Gravatar URL with fallback options
 * @param email - The email address
 * @param currentAvatarUrl - Current avatar URL (if any)
 * @returns The avatar URL to use
 */
export function getAvatarWithGravatarFallback(
  email: string | null | undefined,
  currentAvatarUrl: string | null | undefined
): string | null {
  // If user already has an avatar, use it
  if (currentAvatarUrl) {
    return currentAvatarUrl;
  }
  
  // If no email, no Gravatar possible
  if (!email) {
    return null;
  }
  
  // Return Gravatar URL with identicon fallback
  return getGravatarUrl(email, {
    size: 200,
    default: 'identicon', // Generates a unique geometric pattern
  });
}

/**
 * Check if a URL is a Gravatar URL
 */
export function isGravatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('gravatar.com/avatar/');
}
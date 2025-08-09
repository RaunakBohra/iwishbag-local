/**
 * Selective Preloading Configuration
 * 
 * CRITICAL FIX: Prevents heavy chunks from being preloaded
 * Only preloads essential chunks for initial page render
 */

// Chunks that should NOT be preloaded (load on-demand only)
export const HEAVY_CHUNKS_NO_PRELOAD = [
  'excel-vendor',
  'pdf-vendor', 
  'charts-vendor',
  'admin-core',
  'admin-components',
  'admin-tools',
  'image-processing-vendor',
  'animations-vendor',
  'email-processing-vendor',
  'monitoring-vendor'
];

// Only these chunks should be preloaded for fast initial render
export const ESSENTIAL_CHUNKS_PRELOAD = [
  'react-core-vendor',
  'ui-core',
  'state-vendor',
  'utils-vendor',
  'security-vendor',
  'supabase-vendor',
  'forms-vendor',
  'communication-vendor',
  'index'
];

/**
 * Check if a chunk should be preloaded
 */
export function shouldPreloadChunk(chunkName: string): boolean {
  // Don't preload heavy chunks
  if (HEAVY_CHUNKS_NO_PRELOAD.some(heavy => chunkName.includes(heavy))) {
    return false;
  }
  
  // Preload essential chunks
  if (ESSENTIAL_CHUNKS_PRELOAD.some(essential => chunkName.includes(essential))) {
    return true;
  }
  
  // Default: preload small chunks under 100KB
  return true;
}
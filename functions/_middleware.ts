// Cloudflare Pages Functions middleware
// This enables edge functions for your Pages deployment

export const onRequest = async (context: any) => {
  // Add CORS headers for API routes
  const response = await context.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'content-type, authorization');
  
  return response;
};
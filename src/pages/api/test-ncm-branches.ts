import NCMService from '@/services/NCMService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ncmService = NCMService.getInstance();
    const branches = await ncmService.getBranches();
    
    res.status(200).json({
      success: true,
      count: branches.length,
      branches: branches
    });
  } catch (error: any) {
    console.error('NCM branches test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch NCM branches'
    });
  }
}
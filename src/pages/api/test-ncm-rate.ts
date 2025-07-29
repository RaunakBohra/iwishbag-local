import NCMService from '@/services/NCMService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from = 'TINKUNE', to = 'POKHARA' } = req.query;

  try {
    const ncmService = NCMService.getInstance();
    const rate = await ncmService.getDeliveryRate({
      creation: from as string,
      destination: to as string,
      type: 'Pickup'
    });
    
    res.status(200).json({
      success: true,
      from,
      to,
      rate: rate,
      formatted: {
        deliveryCharge: `NPR ${rate.deliveryCharge}`,
        route: `${from} → ${to}`
      }
    });
  } catch (error: any) {
    console.error('NCM rate test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch NCM rate'
    });
  }
}
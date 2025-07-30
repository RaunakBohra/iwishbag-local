// Stub for PackageForwardingService - functionality was removed/consolidated

export interface ReceivedPackage {
  id: string;
  tracking_number: string;
  sender: string;
  description: string;
  weight?: number;
  dimensions?: string;
  received_date: string;
  status: string;
  customer_id?: string;
  photos?: string[];
  consolidation_group_id?: string;
  storage_fee?: number;
  estimated_value?: number;
  notes?: string;
}

export interface ConsolidationGroup {
  id: string;
  customer_id: string;
  packages: ReceivedPackage[];
  status: 'pending' | 'ready' | 'shipped';
  created_at: string;
  total_weight?: number;
  estimated_shipping_cost?: number;
}

class PackageForwardingService {
  async getCustomerPackages(customerId: string): Promise<ReceivedPackage[]> {
    return [];
  }

  async logReceivedPackage(packageData: Partial<ReceivedPackage>): Promise<ReceivedPackage> {
    throw new Error('Package forwarding service not implemented');
  }

  async updatePackageStatus(packageId: string, status: string): Promise<void> {
    throw new Error('Package forwarding service not implemented');
  }

  async createConsolidationGroup(customerId: string, packageIds: string[]): Promise<ConsolidationGroup> {
    throw new Error('Package forwarding service not implemented');
  }
}

export const packageForwardingService = new PackageForwardingService();
import NCMService, { NCMBranch } from './NCMService';

interface AddressInput {
  city?: string;
  state?: string;
  district?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
}

interface BranchMapping {
  branch: NCMBranch;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
}

class NCMBranchMappingService {
  private static instance: NCMBranchMappingService;
  private cache = new Map<string, { data: NCMBranch[]; timestamp: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes like other services
  private readonly KATHMANDU_PICKUP_BRANCH = 'TINKUNE'; // Default pickup for international

  static getInstance(): NCMBranchMappingService {
    if (!NCMBranchMappingService.instance) {
      NCMBranchMappingService.instance = new NCMBranchMappingService();
    }
    return NCMBranchMappingService.instance;
  }

  /**
   * Get all NCM branches with caching
   */
  async getBranches(): Promise<NCMBranch[]> {
    console.log('🏢 [NCM] Getting branches with cache');
    
    const cacheKey = 'ncm_branches';
    const cached = this.getFromCache(cacheKey);
    
    if (cached && Array.isArray(cached)) {
      console.log('📦 [NCM] Using cached branches');
      return cached;
    } else if (cached) {
      console.warn('⚠️ [NCM] Cached data is not an array, fetching fresh data');
    }

    try {
      const ncmService = NCMService.getInstance();
      const branches = await ncmService.getBranches();
      
      // Cache the branches (only if it's a valid array)
      if (Array.isArray(branches) && branches.length > 0) {
        this.setCache(cacheKey, branches);
      }
      
      console.log(`✅ [NCM] Fetched ${branches.length} branches`);
      return branches;
    } catch (error) {
      console.error('❌ [NCM] Failed to fetch branches:', error);
      return this.getFallbackBranches();
    }
  }

  /**
   * Find pickup branch for international shipments (always Kathmandu)
   */
  async getPickupBranch(): Promise<NCMBranch | null> {
    console.log('🚚 [NCM] Getting pickup branch for international shipment');
    
    const branches = await this.getBranches();
    const pickupBranch = branches.find(b => 
      b.name === this.KATHMANDU_PICKUP_BRANCH ||
      b.name.toUpperCase().includes('KATHMANDU') ||
      b.district.toLowerCase() === 'kathmandu'
    );

    if (!pickupBranch) {
      console.warn('⚠️ [NCM] No Kathmandu pickup branch found, using first available');
      return branches[0] || null;
    }

    console.log(`✅ [NCM] Using pickup branch: ${pickupBranch.name}`);
    return pickupBranch;
  }

  /**
   * Find destination branch based on delivery address
   */
  async findDestinationBranch(address: AddressInput): Promise<BranchMapping | null> {
    console.log('🎯 [NCM] Finding destination branch for:', address);
    
    const branches = await this.getBranches();
    if (branches.length === 0) return null;

    // Try exact matches first
    const exactMatch = this.findExactMatch(address, branches);
    if (exactMatch) return exactMatch;

    // Try partial matches
    const partialMatch = this.findPartialMatch(address, branches);
    if (partialMatch) return partialMatch;

    // Fallback to nearest major city
    const fallbackMatch = this.findFallbackMatch(address, branches);
    return fallbackMatch;
  }

  /**
   * Get both pickup and destination branches
   */
  async getBranchPair(destinationAddress: AddressInput): Promise<{
    pickup: NCMBranch | null;
    destination: NCMBranch | null;
    mapping: BranchMapping | null;
  }> {
    const [pickup, destinationMapping] = await Promise.all([
      this.getPickupBranch(),
      this.findDestinationBranch(destinationAddress)
    ]);

    return {
      pickup,
      destination: destinationMapping?.branch || null,
      mapping: destinationMapping
    };
  }

  /**
   * Validate Nepal phone number and format for NCM
   */
  formatNepalPhone(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digits and country code
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove +977 or 977 prefix
    if (cleaned.startsWith('977') && cleaned.length === 13) {
      cleaned = cleaned.substring(3);
    }
    
    // Nepal mobile numbers start with 98 or 97 and have 10 digits total
    if (cleaned.length === 10 && (cleaned.startsWith('98') || cleaned.startsWith('97'))) {
      return cleaned;
    }
    
    console.warn('⚠️ [NCM] Invalid Nepal phone number:', phone);
    return null;
  }

  /**
   * Check if address is serviceable by NCM
   */
  async isServiceable(address: AddressInput): Promise<boolean> {
    const mapping = await this.findDestinationBranch(address);
    return mapping !== null && mapping.confidence !== 'low';
  }

  // Private helper methods
  private findExactMatch(address: AddressInput, branches: NCMBranch[]): BranchMapping | null {
    if (!Array.isArray(branches) || branches.length === 0) {
      console.warn('⚠️ [NCM] Branches is not a valid array:', branches);
      return null;
    }

    const searchTerms = [
      address.city?.toLowerCase(),
      address.district?.toLowerCase(),
      address.state?.toLowerCase()
    ].filter(Boolean);

    for (const branch of branches) {
      // Exact district match
      if (address.district && branch.district.toLowerCase() === address.district.toLowerCase()) {
        return {
          branch,
          confidence: 'high',
          matchReason: `Exact district match: ${branch.district}`
        };
      }

      // Exact city match in covered areas
      if (address.city && branch.coveredAreas) {
        const cityMatch = branch.coveredAreas.find(area => 
          area.toLowerCase() === address.city!.toLowerCase()
        );
        if (cityMatch) {
          return {
            branch,
            confidence: 'high',
            matchReason: `City in covered areas: ${cityMatch}`
          };
        }
      }
    }

    return null;
  }

  private findPartialMatch(address: AddressInput, branches: NCMBranch[]): BranchMapping | null {
    if (!Array.isArray(branches) || branches.length === 0) {
      console.warn('⚠️ [NCM] Branches is not a valid array for partial match:', branches);
      return null;
    }

    const searchText = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.district
    ].filter(Boolean).join(' ').toLowerCase();

    for (const branch of branches) {
      // Check if any covered area is mentioned in address
      if (branch.coveredAreas) {
        const areaMatch = branch.coveredAreas.find(area =>
          searchText.includes(area.toLowerCase()) || area.toLowerCase().includes(address.city?.toLowerCase() || '')
        );
        if (areaMatch) {
          return {
            branch,
            confidence: 'medium',
            matchReason: `Partial match in covered areas: ${areaMatch}`
          };
        }
      }

      // Check district similarity
      if (address.district && branch.district.toLowerCase().includes(address.district.toLowerCase())) {
        return {
          branch,
          confidence: 'medium',
          matchReason: `District similarity: ${branch.district}`
        };
      }
    }

    return null;
  }

  private findFallbackMatch(address: AddressInput, branches: NCMBranch[]): BranchMapping | null {
    if (!Array.isArray(branches) || branches.length === 0) {
      console.warn('⚠️ [NCM] Branches is not a valid array for fallback match:', branches);
      return null;
    }

    // Major city fallbacks
    const majorCities = ['kathmandu', 'pokhara', 'chitwan', 'butwal', 'biratnagar'];
    
    for (const city of majorCities) {
      const branch = branches.find(b => 
        b.district.toLowerCase().includes(city) ||
        b.name.toLowerCase().includes(city)
      );
      if (branch) {
        return {
          branch,
          confidence: 'low',
          matchReason: `Fallback to major city: ${branch.district}`
        };
      }
    }

    // Ultimate fallback - Kathmandu
    const kathmanduBranch = branches.find(b => 
      b.district.toLowerCase().includes('kathmandu')
    );
    
    if (kathmanduBranch) {
      return {
        branch: kathmanduBranch,
        confidence: 'low',
        matchReason: 'Ultimate fallback to Kathmandu'
      };
    }

    return null;
  }

  private getFallbackBranches(): NCMBranch[] {
    console.log('🔄 [NCM] Using fallback branches');
    return [
      {
        name: 'TINKUNE',
        phone: '015199684',
        coveredAreas: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
        district: 'Kathmandu',
        region: 'Central'
      },
      {
        name: 'POKHARA',
        phone: '061234567',
        coveredAreas: ['Pokhara', 'Kaski'],
        district: 'Kaski',
        region: 'Western'
      },
      {
        name: 'BIRATNAGAR',
        phone: '021234567',
        coveredAreas: ['Biratnagar', 'Morang'],
        district: 'Morang',
        region: 'Eastern'
      }
    ];
  }

  private getFromCache(key: string): NCMBranch[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: NCMBranch[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const ncmBranchMappingService = NCMBranchMappingService.getInstance();
export { NCMBranchMappingService };
export type { AddressInput, BranchMapping };
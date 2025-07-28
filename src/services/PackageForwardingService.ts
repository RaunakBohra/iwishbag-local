/**
 * Package Forwarding Service - Core Business Logic
 * 
 * Transforms iwishBag into a comprehensive package forwarding platform.
 * Handles virtual addresses, package receiving, consolidation, and shipping.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CustomerAddress {
  id: string;
  user_id: string;
  suite_number: string;
  full_address: string;
  address_type: 'standard' | 'premium';
  assigned_date: string;
  status: 'active' | 'suspended' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface ReceivedPackage {
  id: string;
  customer_address_id: string;
  tracking_number?: string;
  carrier?: string;
  sender_name?: string;
  sender_store?: string;
  sender_address?: any;
  received_date: string;
  weight_kg: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  dimensional_weight_kg?: number;
  declared_value_usd?: number;
  package_description?: string;
  contents_list?: any[];
  photos: string[];
  condition_notes?: string;
  status: 'received' | 'processing' | 'ready_to_ship' | 'consolidated' | 'shipped' | 'delivered' | 'issue';
  storage_location?: string;
  storage_start_date: string;
  storage_fee_exempt_until: string;
  consolidation_group_id?: string;
  received_by_staff_id?: string;
  last_scanned_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationGroup {
  id: string;
  user_id: string;
  group_name?: string;
  package_count: number;
  original_package_ids: string[];
  consolidated_weight_kg?: number;
  consolidated_dimensions?: any;
  consolidated_photos: string[];
  consolidation_fee_usd: number;
  storage_fees_usd: number;
  service_fee_usd: number;
  status: 'pending' | 'processing' | 'consolidated' | 'shipped' | 'delivered';
  quote_id?: string;
  consolidated_by_staff_id?: string;
  consolidation_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationOption {
  type: 'individual' | 'consolidated' | 'smart_grouped';
  packages: ReceivedPackage[];
  totalWeight: number;
  totalDimensions: any;
  estimatedShippingCost: number;
  consolidationFee: number;
  storageFees: number;
  totalCost: number;
  savings?: number;
  description?: string;
}

export interface PackageReceivingData {
  suiteNumber: string;
  trackingNumber?: string;
  carrier: string;
  senderName?: string;
  senderStore?: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  declaredValue?: number;
  description?: string;
  photos: string[];
  receivedByStaffId: string;
  storageLocation?: string;
}

export interface ServiceFeeBreakdown {
  receiving_fees: number;
  photo_fees: number;
  storage_fees: number;
  consolidation_fees: number;
  premium_service_fees: number;
  insurance_fees: number;
  volume_discount: number;
  total: number;
}

// ============================================================================
// PACKAGE FORWARDING SERVICE
// ============================================================================

class PackageForwardingService {
  private static instance: PackageForwardingService;
  private readonly WAREHOUSE_ADDRESS_BASE = `iwishBag Forwarding
1234 Warehouse Street
New York, NY 10001
United States`;

  private constructor() {
    logger.info('📦 PackageForwardingService initialized');
  }

  static getInstance(): PackageForwardingService {
    if (!PackageForwardingService.instance) {
      PackageForwardingService.instance = new PackageForwardingService();
    }
    return PackageForwardingService.instance;
  }

  // ============================================================================
  // VIRTUAL ADDRESS MANAGEMENT
  // ============================================================================

  /**
   * Assign or retrieve virtual address for customer
   */
  async assignVirtualAddress(userId: string): Promise<CustomerAddress> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'PackageForwardingService.assignVirtualAddress',
          op: 'address_assignment',
        })
      : null;

    try {
      // Check if user already has an active address
      const { data: existing, error: existingError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (existing && !existingError) {
        logger.info(`📮 Returning existing address for user ${userId}: ${existing.suite_number}`);
        transaction?.setStatus('ok');
        return existing;
      }

      // Generate new suite number using database function
      const { data: suiteData, error: suiteError } = await supabase
        .rpc('generate_suite_number');

      if (suiteError) {
        throw new Error(`Failed to generate suite number: ${suiteError.message}`);
      }

      const suiteNumber = suiteData as string;
      const fullAddress = this.buildWarehouseAddress(suiteNumber);

      // Create new address record
      const { data: newAddress, error: insertError } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: userId,
          suite_number: suiteNumber,
          full_address: fullAddress,
          address_type: 'standard',
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create address: ${insertError.message}`);
      }

      logger.info(`📮 New virtual address assigned: ${suiteNumber} for user ${userId}`);

      // Send welcome email (implement notification service)
      await this.sendAddressWelcomeNotification(userId, newAddress);

      transaction?.setStatus('ok');
      return newAddress;

    } catch (error) {
      logger.error('❌ Failed to assign virtual address:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Get customer's virtual address details
   */
  async getCustomerAddress(userId: string): Promise<CustomerAddress | null> {
    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error('❌ Failed to get customer address:', error);
      throw error;
    }
  }

  // ============================================================================
  // PACKAGE RECEIVING WORKFLOW
  // ============================================================================

  /**
   * Log received package at warehouse
   */
  async logReceivedPackage(packageData: PackageReceivingData): Promise<ReceivedPackage> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'PackageForwardingService.logReceivedPackage',
          op: 'package_receiving',
        })
      : null;

    try {
      // Get customer address by suite number
      const { data: customerAddress, error: addressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('suite_number', packageData.suiteNumber)
        .eq('status', 'active')
        .single();

      if (addressError || !customerAddress) {
        throw new Error(`Invalid suite number: ${packageData.suiteNumber}`);
      }

      // Calculate dimensional weight (standard: L×W×H/5000)
      const dimensionalWeight = this.calculateDimensionalWeight(packageData.dimensions);

      // Get optimal storage location
      const storageLocation = packageData.storageLocation || 
        await this.getOptimalStorageLocation(packageData.suiteNumber);

      // Create package record
      const { data: newPackage, error: packageError } = await supabase
        .from('received_packages')
        .insert({
          customer_address_id: customerAddress.id,
          tracking_number: packageData.trackingNumber,
          carrier: packageData.carrier,
          sender_name: packageData.senderName,
          sender_store: packageData.senderStore,
          weight_kg: packageData.weight,
          dimensions: {
            ...packageData.dimensions,
            unit: 'cm'
          },
          dimensional_weight_kg: dimensionalWeight,
          declared_value_usd: packageData.declaredValue,
          package_description: packageData.description,
          photos: packageData.photos,
          storage_location: storageLocation,
          received_by_staff_id: packageData.receivedByStaffId,
          status: 'received'
        })
        .select()
        .single();

      if (packageError) {
        throw new Error(`Failed to create package record: ${packageError.message}`);
      }

      // Update warehouse location capacity
      await this.updateLocationCapacity(storageLocation, 1);

      // Log package event
      await this.logPackageEvent(newPackage.id, 'received', 'Package received at warehouse', {
        tracking_number: packageData.trackingNumber,
        carrier: packageData.carrier,
        weight: packageData.weight,
        storage_location: storageLocation,
        sender_store: packageData.senderStore
      }, packageData.receivedByStaffId);

      // Send customer notification
      await this.sendPackageReceivedNotification(customerAddress.user_id, newPackage);

      logger.info(`📦 Package received: ${newPackage.id} for customer ${customerAddress.suite_number}`);
      transaction?.setStatus('ok');
      return newPackage;

    } catch (error) {
      logger.error('❌ Failed to log received package:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Get packages for customer
   */
  async getCustomerPackages(userId: string, status?: string): Promise<ReceivedPackage[]> {
    try {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(user_id)
        `)
        .eq('customer_addresses.user_id', userId)
        .order('received_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get packages: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Failed to get customer packages:', error);
      throw error;
    }
  }

  // ============================================================================
  // CONSOLIDATION MANAGEMENT
  // ============================================================================

  /**
   * Calculate consolidation options for customer
   */
  async calculateConsolidationOptions(userId: string): Promise<ConsolidationOption[]> {
    try {
      // Get all available packages for customer
      const packages = await this.getCustomerPackages(userId, 'received');

      if (packages.length === 0) {
        return [];
      }

      const options: ConsolidationOption[] = [];

      // Option 1: Ship all packages individually
      for (const pkg of packages) {
        const shippingCost = await this.estimateIndividualShippingCost(pkg);
        const storageFees = this.calculatePackageStorageFees(pkg);
        
        options.push({
          type: 'individual',
          packages: [pkg],
          totalWeight: pkg.weight_kg,
          totalDimensions: pkg.dimensions,
          estimatedShippingCost: shippingCost,
          consolidationFee: 0,
          storageFees: storageFees,
          totalCost: shippingCost + storageFees + this.calculateServiceFees([pkg]),
          description: `Ship package individually from ${pkg.sender_store || pkg.sender_name}`
        });
      }

      // Option 2: Consolidate all packages (if more than 1)
      if (packages.length > 1) {
        const consolidatedWeight = packages.reduce((sum, pkg) => sum + pkg.weight_kg, 0);
        const consolidatedDimensions = this.calculateConsolidatedDimensions(packages);
        const consolidatedShippingCost = await this.estimateConsolidatedShippingCost(
          consolidatedWeight, 
          consolidatedDimensions
        );
        const consolidationFee = this.calculateConsolidationFee(packages.length);
        const totalStorageFees = packages.reduce((sum, pkg) => sum + this.calculatePackageStorageFees(pkg), 0);
        const serviceFees = this.calculateServiceFees(packages);

        const consolidatedTotalCost = consolidatedShippingCost + consolidationFee + totalStorageFees + serviceFees;
        const individualTotalCost = options.reduce((sum, opt) => sum + opt.totalCost, 0);

        options.push({
          type: 'consolidated',
          packages: packages,
          totalWeight: consolidatedWeight,
          totalDimensions: consolidatedDimensions,
          estimatedShippingCost: consolidatedShippingCost,
          consolidationFee: consolidationFee,
          storageFees: totalStorageFees,
          totalCost: consolidatedTotalCost,
          savings: Math.max(0, individualTotalCost - consolidatedTotalCost),
          description: `Consolidate all ${packages.length} packages into one shipment`
        });
      }

      // Option 3: Smart grouping (if more than 2 packages)
      if (packages.length > 2) {
        const smartGroups = await this.calculateSmartConsolidationGroups(packages);
        options.push(...smartGroups);
      }

      // Sort by total cost (best deal first)
      return options.sort((a, b) => a.totalCost - b.totalCost);

    } catch (error) {
      logger.error('❌ Failed to calculate consolidation options:', error);
      throw error;
    }
  }

  /**
   * Process consolidation request
   */
  async processConsolidation(
    userId: string, 
    packageIds: string[], 
    groupName?: string
  ): Promise<ConsolidationGroup> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'PackageForwardingService.processConsolidation',
          op: 'consolidation_processing',
        })
      : null;

    try {
      // Verify all packages belong to user and are available
      const { data: packages, error: packagesError } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(user_id)
        `)
        .in('id', packageIds)
        .eq('customer_addresses.user_id', userId)
        .eq('status', 'received');

      if (packagesError || !packages || packages.length !== packageIds.length) {
        throw new Error('Some packages are not available for consolidation');
      }

      // Calculate fees
      const consolidationFee = this.calculateConsolidationFee(packages.length);
      const storageFees = packages.reduce((sum, pkg) => sum + this.calculatePackageStorageFees(pkg), 0);
      const serviceFees = this.calculateServiceFees(packages);

      // Create consolidation group
      const { data: group, error: groupError } = await supabase
        .from('consolidation_groups')
        .insert({
          user_id: userId,
          group_name: groupName || `Consolidation ${new Date().toLocaleDateString()}`,
          package_count: packages.length,
          original_package_ids: packageIds,
          consolidation_fee_usd: consolidationFee,
          storage_fees_usd: storageFees,
          service_fee_usd: serviceFees,
          status: 'pending'
        })
        .select()
        .single();

      if (groupError) {
        throw new Error(`Failed to create consolidation group: ${groupError.message}`);
      }

      // Update packages to reference consolidation group
      const { error: updateError } = await supabase
        .from('received_packages')
        .update({ 
          consolidation_group_id: group.id,
          status: 'processing'
        })
        .in('id', packageIds);

      if (updateError) {
        throw new Error(`Failed to update packages: ${updateError.message}`);
      }

      // Log events for all packages
      for (const packageId of packageIds) {
        await this.logPackageEvent(
          packageId, 
          'consolidation_requested', 
          'Package added to consolidation group',
          { 
            consolidation_group_id: group.id,
            group_name: group.group_name 
          },
          userId
        );
      }

      // Create warehouse task for staff
      await this.createWarehouseTask({
        type: 'consolidation',
        priority: 'normal',
        consolidation_group_id: group.id,
        description: `Consolidate ${packages.length} packages for ${group.group_name}`,
        package_ids: packageIds,
        instructions: packages.map(p => 
          `Package ID: ${p.id}, Location: ${p.storage_location}, Description: ${p.package_description || 'N/A'}`
        ).join('\n')
      });

      // Send notification to customer
      await this.sendConsolidationRequestNotification(userId, group);

      logger.info(`📦 Consolidation requested: ${group.id} with ${packages.length} packages`);
      transaction?.setStatus('ok');
      return group;

    } catch (error) {
      logger.error('❌ Failed to process consolidation:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Get consolidation groups for user
   */
  async getConsolidationGroups(userId: string): Promise<ConsolidationGroup[]> {
    try {
      const { data, error } = await supabase
        .from('consolidation_groups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get consolidation groups: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Failed to get consolidation groups:', error);
      throw error;
    }
  }

  // ============================================================================
  // COST CALCULATION METHODS
  // ============================================================================

  /**
   * Calculate consolidation fee based on package count
   */
  private calculateConsolidationFee(packageCount: number): number {
    // $5 base fee + $2 per additional package
    return 5 + ((packageCount - 1) * 2);
  }

  /**
   * Calculate storage fees for a package
   */
  private calculatePackageStorageFees(pkg: ReceivedPackage): number {
    const now = new Date();
    const exemptUntil = new Date(pkg.storage_fee_exempt_until);
    
    if (now <= exemptUntil) {
      return 0; // Still in free period
    }
    
    const daysStored = Math.ceil((now.getTime() - exemptUntil.getTime()) / (1000 * 60 * 60 * 24));
    return daysStored * 1.0; // $1 per day
  }

  /**
   * Calculate service fees (receiving + photos)
   */
  private calculateServiceFees(packages: ReceivedPackage[]): number {
    return packages.length * 5.0; // $3 receiving + $2 photos per package
  }

  /**
   * Calculate dimensional weight
   */
  private calculateDimensionalWeight(dimensions: { length: number; width: number; height: number }): number {
    // Standard dimensional weight calculation: (L × W × H) / 5000
    return (dimensions.length * dimensions.width * dimensions.height) / 5000;
  }

  /**
   * Calculate consolidated dimensions for multiple packages
   */
  private calculateConsolidatedDimensions(packages: ReceivedPackage[]): any {
    // Simple volume addition with 10% consolidation efficiency
    const totalVolume = packages.reduce((sum, pkg) => {
      const vol = pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height;
      return sum + vol;
    }, 0) * 0.9; // 10% consolidation efficiency

    // Calculate optimal box dimensions (cube root approach)
    const cubeRoot = Math.cbrt(totalVolume);
    return {
      length: Math.ceil(cubeRoot * 1.2),
      width: Math.ceil(cubeRoot),
      height: Math.ceil(cubeRoot),
      unit: 'cm'
    };
  }

  // ============================================================================
  // SHIPPING COST ESTIMATION
  // ============================================================================

  /**
   * Estimate individual package shipping cost
   */
  private async estimateIndividualShippingCost(pkg: ReceivedPackage): Promise<number> {
    // This would integrate with existing shipping cost calculation
    // For now, simplified calculation based on weight
    const baseRate = 15; // $15 per kg base rate
    return Math.max(25, pkg.weight_kg * baseRate); // Minimum $25
  }

  /**
   * Estimate consolidated shipping cost
   */
  private async estimateConsolidatedShippingCost(weight: number, dimensions: any): Promise<number> {
    // Volume discount for consolidated packages
    const baseRate = 12; // $12 per kg (20% discount)
    const volumetricWeight = this.calculateDimensionalWeight(dimensions);
    const chargeableWeight = Math.max(weight, volumetricWeight);
    return Math.max(30, chargeableWeight * baseRate); // Minimum $30
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Build complete warehouse address with suite number
   */
  private buildWarehouseAddress(suiteNumber: string): string {
    return `iwishBag Forwarding - ${suiteNumber}
${this.WAREHOUSE_ADDRESS_BASE}
Suite: ${suiteNumber}`;
  }

  /**
   * Get optimal storage location for package
   */
  private async getOptimalStorageLocation(suiteNumber: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('get_optimal_storage_location', { suite_number: suiteNumber });

      if (error) {
        logger.warn('Failed to get optimal storage location, using fallback:', error);
        return 'TEMP001';
      }

      return data || 'TEMP001';
    } catch (error) {
      logger.warn('Storage location lookup failed, using fallback:', error);
      return 'TEMP001';
    }
  }

  /**
   * Update warehouse location capacity
   */
  private async updateLocationCapacity(locationCode: string, change: number): Promise<void> {
    try {
      await supabase.rpc('update_location_capacity', {
        location_code: locationCode,
        capacity_change: change
      });
    } catch (error) {
      logger.warn('Failed to update location capacity:', error);
    }
  }

  /**
   * Log package event for audit trail
   */
  private async logPackageEvent(
    packageId: string,
    eventType: string,
    description: string,
    eventData: any,
    staffId: string
  ): Promise<void> {
    try {
      await supabase
        .from('package_events')
        .insert({
          package_id: packageId,
          event_type: eventType,
          event_description: description,
          event_data: eventData,
          staff_id: staffId
        });
    } catch (error) {
      logger.warn('Failed to log package event:', error);
    }
  }

  /**
   * Create warehouse task for staff
   */
  private async createWarehouseTask(task: {
    type: 'receiving' | 'consolidation' | 'shipping' | 'audit';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    description: string;
    consolidation_group_id?: string;
    package_ids?: string[];
    assigned_to?: string;
    instructions?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('warehouse_tasks')
        .insert({
          task_type: task.type,
          priority: task.priority,
          description: task.description,
          consolidation_group_id: task.consolidation_group_id,
          package_ids: task.package_ids || [],
          assigned_to: task.assigned_to,
          instructions: task.instructions,
          status: 'pending'
        });
    } catch (error) {
      logger.warn('Failed to create warehouse task:', error);
    }
  }

  /**
   * Calculate smart consolidation groups
   */
  private async calculateSmartConsolidationGroups(packages: ReceivedPackage[]): Promise<ConsolidationOption[]> {
    // Group packages by weight/size optimization
    // This is a simplified version - could be enhanced with ML algorithms
    const options: ConsolidationOption[] = [];
    
    // Group by sender store (common optimization)
    const storeGroups = packages.reduce((groups, pkg) => {
      const store = pkg.sender_store || 'Unknown';
      if (!groups[store]) groups[store] = [];
      groups[store].push(pkg);
      return groups;
    }, {} as Record<string, ReceivedPackage[]>);

    for (const [store, storePackages] of Object.entries(storeGroups)) {
      if (storePackages.length > 1) {
        const totalWeight = storePackages.reduce((sum, pkg) => sum + pkg.weight_kg, 0);
        const consolidatedDimensions = this.calculateConsolidatedDimensions(storePackages);
        const shippingCost = await this.estimateConsolidatedShippingCost(totalWeight, consolidatedDimensions);
        const consolidationFee = this.calculateConsolidationFee(storePackages.length);
        const storageFees = storePackages.reduce((sum, pkg) => sum + this.calculatePackageStorageFees(pkg), 0);
        const serviceFees = this.calculateServiceFees(storePackages);

        options.push({
          type: 'smart_grouped',
          packages: storePackages,
          totalWeight: totalWeight,
          totalDimensions: consolidatedDimensions,
          estimatedShippingCost: shippingCost,
          consolidationFee: consolidationFee,
          storageFees: storageFees,
          totalCost: shippingCost + consolidationFee + storageFees + serviceFees,
          description: `Consolidate ${storePackages.length} packages from ${store}`
        });
      }
    }

    return options;
  }

  // ============================================================================
  // ADMIN QUERY METHODS
  // ============================================================================

  /**
   * Get recent packages across all customers (for admin dashboard)
   */
  async getRecentPackages(limit: number = 20): Promise<ReceivedPackage[]> {
    try {
      const { data, error } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            user_id,
            suite_number
          )
        `)
        .order('received_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent packages: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      logger.error('❌ Failed to get recent packages:', error);
      throw error;
    }
  }

  /**
   * Get pending consolidation groups (for admin dashboard)
   */
  async getPendingConsolidations(): Promise<ConsolidationGroup[]> {
    try {
      const { data, error } = await supabase
        .from('consolidation_groups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending consolidations: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      logger.error('❌ Failed to get pending consolidations:', error);
      throw error;
    }
  }

  // ============================================================================
  // NOTIFICATION METHODS (Placeholder implementations)
  // ============================================================================

  private async sendAddressWelcomeNotification(userId: string, address: CustomerAddress): Promise<void> {
    try {
      await supabase
        .from('package_notifications')
        .insert({
          user_id: userId,
          notification_type: 'package_received',
          title: 'Your US Warehouse Address is Ready!',
          message: `Your virtual address ${address.suite_number} is now active. Start shopping at US stores!`,
          data: {
            suite_number: address.suite_number,
            full_address: address.full_address
          }
        });
    } catch (error) {
      logger.warn('Failed to send welcome notification:', error);
    }
  }

  private async sendPackageReceivedNotification(userId: string, pkg: ReceivedPackage): Promise<void> {
    try {
      await supabase
        .from('package_notifications')
        .insert({
          user_id: userId,
          package_id: pkg.id,
          notification_type: 'package_received',
          title: 'Package Received!',
          message: `Your package from ${pkg.sender_store || pkg.sender_name} has arrived at our warehouse.`,
          data: {
            tracking_number: pkg.tracking_number,
            weight: pkg.weight_kg,
            photos_count: pkg.photos?.length || 0,
            sender_store: pkg.sender_store,
            storage_location: pkg.storage_location
          }
        });
    } catch (error) {
      logger.warn('Failed to send package received notification:', error);
    }
  }

  private async sendConsolidationRequestNotification(userId: string, group: ConsolidationGroup): Promise<void> {
    try {
      await supabase
        .from('package_notifications')
        .insert({
          user_id: userId,
          notification_type: 'consolidation_ready',
          title: 'Consolidation Request Received',
          message: `Your consolidation request for ${group.package_count} packages has been received and is being processed.`,
          data: {
            consolidation_group_id: group.id,
            group_name: group.group_name,
            package_count: group.package_count,
            consolidation_fee: group.consolidation_fee_usd
          }
        });
    } catch (error) {
      logger.warn('Failed to send consolidation notification:', error);
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk update package status
   */
  async bulkUpdatePackageStatus(
    packageIds: string[],
    status: ReceivedPackage['status'],
    notes?: string,
    adminId?: string
  ): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Update all packages at once
      const { error } = await supabase
        .from('received_packages')
        .update({
          status,
          condition_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .in('id', packageIds);

      if (error) {
        throw error;
      }

      processed = packageIds.length;
      logger.info(`Bulk status update completed: ${processed} packages updated to ${status}`);

      return { processed, errors };
    } catch (error) {
      const errorMsg = `Failed to bulk update package status: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      return { processed, errors };
    }
  }

  /**
   * Bulk add notes to packages
   */
  async bulkAddPackageNotes(
    packageIds: string[],
    notes: string,
    noteType: 'general' | 'processing' | 'quality' | 'customer' | 'warehouse' = 'general',
    adminId?: string
  ): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get existing packages to append notes
      const { data: packages, error: fetchError } = await supabase
        .from('received_packages')
        .select('id, condition_notes')
        .in('id', packageIds);

      if (fetchError) throw fetchError;

      // Update each package with appended notes
      for (const pkg of packages || []) {
        try {
          const timestamp = new Date().toLocaleString();
          const newNote = `[${timestamp}] ${noteType.toUpperCase()}: ${notes}`;
          const existingNotes = pkg.condition_notes || '';
          const updatedNotes = existingNotes 
            ? `${existingNotes}\n${newNote}`
            : newNote;

          const { error } = await supabase
            .from('received_packages')
            .update({
              condition_notes: updatedNotes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pkg.id);

          if (error) throw error;
          processed++;
        } catch (error) {
          const errorMsg = `Failed to add notes to package ${pkg.id}: ${error}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      logger.info(`Bulk notes addition completed: ${processed} packages updated`);

      return { processed, errors };
    } catch (error) {
      const errorMsg = `Failed to bulk add package notes: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      return { processed, errors };
    }
  }

  /**
   * Bulk assign storage locations
   */
  async bulkAssignStorageLocations(
    packageIds: string[],
    location: string,
    adminId?: string
  ): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      const { error } = await supabase
        .from('received_packages')
        .update({
          storage_location: location,
          updated_at: new Date().toISOString(),
        })
        .in('id', packageIds);

      if (error) throw error;

      processed = packageIds.length;
      logger.info(`Bulk storage location assignment completed: ${processed} packages assigned to ${location}`);

      return { processed, errors };
    } catch (error) {
      const errorMsg = `Failed to bulk assign storage locations: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      return { processed, errors };
    }
  }

  /**
   * Bulk delete packages (admin only)
   */
  async bulkDeletePackages(
    packageIds: string[],
    reason: string,
    adminId: string
  ): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // First, check if any packages are in consolidation or shipped status
      const { data: packages, error: fetchError } = await supabase
        .from('received_packages')
        .select('id, status, tracking_number')
        .in('id', packageIds);

      if (fetchError) throw fetchError;

      const protectedStatuses = ['consolidated', 'shipped', 'delivered'];
      const protectedPackages = packages?.filter(pkg => 
        protectedStatuses.includes(pkg.status)
      ) || [];

      if (protectedPackages.length > 0) {
        const protectedIds = protectedPackages.map(p => p.tracking_number || p.id);
        throw new Error(`Cannot delete packages in protected status: ${protectedIds.join(', ')}`);
      }

      // Delete package photos first (if they exist)
      const { error: photosError } = await supabase
        .from('package_photos')
        .delete()
        .in('package_id', packageIds);

      // Note: We don't throw on photo deletion errors as they might not exist

      // Delete storage fees
      const { error: feesError } = await supabase
        .from('storage_fees')
        .delete()
        .in('package_id', packageIds);

      // Delete the packages
      const { error: deleteError } = await supabase
        .from('received_packages')
        .delete()
        .in('id', packageIds);

      if (deleteError) throw deleteError;

      processed = packageIds.length;
      logger.warn(`Bulk package deletion completed: ${processed} packages deleted by admin ${adminId}. Reason: ${reason}`);

      return { processed, errors };
    } catch (error) {
      const errorMsg = `Failed to bulk delete packages: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      return { processed, errors };
    }
  }

  /**
   * Export packages data for selected packages
   */
  async exportPackagesData(packageIds: string[]): Promise<{
    data: any[];
    filename: string;
  }> {
    try {
      const { data: packages, error } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            suite_number,
            user_id,
            profiles(email, full_name)
          )
        `)
        .in('id', packageIds);

      if (error) throw error;

      const exportData = (packages || []).map(pkg => ({
        suite_number: pkg.customer_addresses.suite_number,
        customer_name: pkg.customer_addresses.profiles?.full_name || 'Unknown',
        customer_email: pkg.customer_addresses.profiles?.email || 'Unknown',
        tracking_number: pkg.tracking_number || 'N/A',
        carrier: pkg.carrier || 'Unknown',
        sender_name: pkg.sender_name || 'Unknown',
        sender_store: pkg.sender_store || 'Unknown',
        package_description: pkg.package_description || 'No description',
        weight_kg: pkg.weight_kg,
        dimensions: `${pkg.dimensions.length}×${pkg.dimensions.width}×${pkg.dimensions.height}cm`,
        declared_value_usd: pkg.declared_value_usd || 0,
        status: pkg.status,
        received_date: pkg.received_date.split('T')[0],
        storage_location: pkg.storage_location || 'Not assigned',
        condition_notes: pkg.condition_notes || 'None',
        created_at: pkg.created_at.split('T')[0],
      }));

      const filename = `packages-export-${new Date().toISOString().split('T')[0]}.csv`;

      return {
        data: exportData,
        filename,
      };
    } catch (error) {
      logger.error('Failed to export packages data', error);
      throw error;
    }
  }

  /**
   * Get packages with advanced filtering for bulk operations
   */
  async getPackagesForBulkOperations(filters?: {
    status?: string[];
    carrier?: string[];
    hasIssues?: boolean;
    hasPhotos?: boolean;
    storageDaysMin?: number;
    storageDaysMax?: number;
    packageIds?: string[];
  }): Promise<ReceivedPackage[]> {
    try {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            suite_number,
            user_id
          )
        `);

      if (filters?.packageIds && filters.packageIds.length > 0) {
        query = query.in('id', filters.packageIds);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.carrier && filters.carrier.length > 0) {
        query = query.in('carrier', filters.carrier);
      }

      if (filters?.hasIssues) {
        query = query.eq('status', 'issue');
      }

      if (filters?.hasPhotos !== undefined) {
        if (filters.hasPhotos) {
          query = query.not('photos', 'is', null).neq('photos', '[]');
        } else {
          query = query.or('photos.is.null,photos.eq.[]');
        }
      }

      const { data: packages, error } = await query;

      if (error) throw error;

      return packages || [];
    } catch (error) {
      logger.error('Failed to get packages for bulk operations', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const packageForwardingService = PackageForwardingService.getInstance();
export default packageForwardingService;
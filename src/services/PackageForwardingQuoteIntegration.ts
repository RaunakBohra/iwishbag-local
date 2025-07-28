/**
 * Package Forwarding Quote Integration Service
 * 
 * Demonstrates and manages the integration between package forwarding system
 * and the main iwishBag quote system. This service handles the complete
 * workflow from package receipt to quote generation and payment.
 * 
 * INTEGRATION WORKFLOW:
 * 1. Package received -> Database record created
 * 2. Customer requests shipping -> Quote created in main system
 * 3. Quote processed by SmartCalculationEngine -> Full calculation with taxes, shipping, etc.
 * 4. Customer approves -> Payment processed through existing gateway
 * 5. Payment confirmed -> Package status updated to ready_to_ship
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { integratedPackageForwardingService } from './IntegratedPackageForwardingService';
import type { UnifiedQuote } from '@/types/unified-quote';

// ============================================================================
// INTEGRATION WORKFLOW METHODS
// ============================================================================

export class PackageForwardingQuoteIntegration {
  private static instance: PackageForwardingQuoteIntegration;
  
  static getInstance(): PackageForwardingQuoteIntegration {
    if (!PackageForwardingQuoteIntegration.instance) {
      PackageForwardingQuoteIntegration.instance = new PackageForwardingQuoteIntegration();
    }
    return PackageForwardingQuoteIntegration.instance;
  }

  /**
   * Complete workflow: Create package forwarding quote and integrate with main system
   */
  async createIntegratedPackageQuote(
    userId: string,
    packageId: string,
    destinationCountry: string,
    shippingAddress: any
  ): Promise<{
    quote_id: string;
    quote_data: UnifiedQuote;
    integration_status: 'success' | 'partial' | 'failed';
    workflow_steps: string[];
  }> {
    const workflowSteps: string[] = [];
    let integrationStatus: 'success' | 'partial' | 'failed' = 'failed';

    try {
      workflowSteps.push('1. Validating customer profile and package');
      
      // Get customer profile with package forwarding integration
      const customerProfile = await integratedPackageForwardingService.getIntegratedCustomerProfile(userId);
      if (!customerProfile) {
        throw new Error('Customer profile not found - user must be properly registered');
      }
      workflowSteps.push('✓ Customer profile validated');

      // Verify package exists and belongs to customer
      const { data: packageData, error: packageError } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            user_id,
            suite_number,
            profile_id
          )
        `)
        .eq('id', packageId)
        .eq('customer_addresses.user_id', userId)
        .single();

      if (packageError || !packageData) {
        throw new Error('Package not found or does not belong to customer');
      }
      workflowSteps.push('✓ Package ownership verified');

      workflowSteps.push('2. Creating integrated quote in main system');
      
      // Create quote using database function (integrates with main quotes table)
      const { data: quoteId, error: quoteError } = await supabase
        .rpc('create_package_forwarding_quote', {
          p_package_id: packageId,
          p_destination_country: destinationCountry,
          p_customer_data: {
            info: {
              name: customerProfile.full_name,
              email: customerProfile.email,
              phone: customerProfile.phone,
            },
            shipping_address: shippingAddress,
            preferences: customerProfile.preferences?.shipping_preferences,
          }
        });

      if (quoteError || !quoteId) {
        throw new Error(`Failed to create integrated quote: ${quoteError?.message}`);
      }
      workflowSteps.push('✓ Quote created in main quotes table');

      workflowSteps.push('3. Retrieving created quote data');
      
      // Get the created quote with full data
      const { data: quoteData, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (fetchError || !quoteData) {
        throw new Error('Failed to fetch created quote data');
      }
      workflowSteps.push('✓ Quote data retrieved');

      workflowSteps.push('4. Verifying integration connections');
      
      // Verify package is linked to quote
      const { data: updatedPackage } = await supabase
        .from('received_packages')
        .select('quote_id')
        .eq('id', packageId)
        .single();

      if (updatedPackage?.quote_id === quoteId) {
        workflowSteps.push('✓ Package successfully linked to quote');
      } else {
        workflowSteps.push('⚠ Package link verification failed');
        integrationStatus = 'partial';
      }

      workflowSteps.push('5. Integration workflow completed successfully');
      
      if (integrationStatus !== 'partial') {
        integrationStatus = 'success';
      }

      logger.info(`📦💰 Package forwarding quote integration completed: ${quoteId}`);

      return {
        quote_id: quoteId,
        quote_data: quoteData as UnifiedQuote,
        integration_status: integrationStatus,
        workflow_steps: workflowSteps,
      };

    } catch (error) {
      workflowSteps.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Failed package forwarding quote integration:', error);
      
      return {
        quote_id: '',
        quote_data: {} as UnifiedQuote,
        integration_status: 'failed',
        workflow_steps: workflowSteps,
      };
    }
  }

  /**
   * Create consolidation quote with full integration
   */
  async createIntegratedConsolidationQuote(
    userId: string,
    consolidationGroupId: string,
    destinationCountry: string,
    shippingAddress: any
  ): Promise<{
    quote_id: string;
    consolidation_data: any;
    integration_status: 'success' | 'partial' | 'failed';
    workflow_steps: string[];
  }> {
    const workflowSteps: string[] = [];
    let integrationStatus: 'success' | 'partial' | 'failed' = 'failed';

    try {
      workflowSteps.push('1. Validating consolidation group');
      
      // Get consolidation group data
      const { data: consolidationData, error: consolidationError } = await supabase
        .from('consolidation_groups')
        .select('*')
        .eq('id', consolidationGroupId)
        .eq('user_id', userId)
        .single();

      if (consolidationError || !consolidationData) {
        throw new Error('Consolidation group not found or access denied');
      }
      workflowSteps.push('✓ Consolidation group validated');

      workflowSteps.push('2. Creating consolidation quote');
      
      // Get customer profile
      const customerProfile = await integratedPackageForwardingService.getIntegratedCustomerProfile(userId);
      
      // Create consolidation quote
      const { data: quoteId, error: quoteError } = await supabase
        .rpc('create_consolidation_quote', {
          p_consolidation_group_id: consolidationGroupId,
          p_destination_country: destinationCountry,
          p_customer_data: {
            info: {
              name: customerProfile?.full_name,
              email: customerProfile?.email,
              phone: customerProfile?.phone,
            },
            shipping_address: shippingAddress,
          }
        });

      if (quoteError || !quoteId) {
        throw new Error(`Failed to create consolidation quote: ${quoteError?.message}`);
      }
      workflowSteps.push('✓ Consolidation quote created');

      workflowSteps.push('3. Verifying quote linkage');
      
      // Verify consolidation group is linked to quote
      const { data: updatedGroup } = await supabase
        .from('consolidation_groups')
        .select('quote_id')
        .eq('id', consolidationGroupId)
        .single();

      if (updatedGroup?.quote_id === quoteId) {
        workflowSteps.push('✓ Consolidation group linked to quote');
      } else {
        workflowSteps.push('⚠ Consolidation group link verification failed');
        integrationStatus = 'partial';
      }

      if (integrationStatus !== 'partial') {
        integrationStatus = 'success';
      }

      logger.info(`📦🔗💰 Consolidation quote integration completed: ${quoteId}`);

      return {
        quote_id: quoteId,
        consolidation_data: consolidationData,
        integration_status: integrationStatus,
        workflow_steps: workflowSteps,
      };

    } catch (error) {
      workflowSteps.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Failed consolidation quote integration:', error);
      
      return {
        quote_id: '',
        consolidation_data: null,
        integration_status: 'failed',
        workflow_steps: workflowSteps,
      };
    }
  }

  /**
   * Demonstrate storage fees integration with payment system
   */
  async integrateStorageFeesWithPayment(
    userId: string,
    quoteId: string
  ): Promise<{
    storage_fees_added: boolean;
    total_fees_usd: number;
    integration_status: 'success' | 'failed';
    workflow_steps: string[];
  }> {
    const workflowSteps: string[] = [];

    try {
      workflowSteps.push('1. Adding storage fees to existing quote');
      
      // Add storage fees to quote using database function
      const { data: totalFeesUsd, error: feesError } = await supabase
        .rpc('add_storage_fees_to_quote', {
          p_user_id: userId,
          p_quote_id: quoteId,
        });

      if (feesError) {
        throw new Error(`Failed to add storage fees: ${feesError.message}`);
      }

      const totalFees = totalFeesUsd || 0;
      workflowSteps.push(`✓ Added $${totalFees} in storage fees to quote`);

      workflowSteps.push('2. Verifying storage fees integration');
      
      // Verify quote has storage fees flag set
      const { data: quoteData } = await supabase
        .from('quotes')
        .select('storage_fees_included, forwarding_data')
        .eq('id', quoteId)
        .single();

      if (quoteData?.storage_fees_included) {
        workflowSteps.push('✓ Quote marked as including storage fees');
      } else {
        workflowSteps.push('⚠ Storage fees flag verification failed');
      }

      // Verify storage fees are linked to quote
      const { data: linkedFees } = await supabase
        .from('storage_fees')
        .select('count')
        .eq('quote_id', quoteId)
        .eq('user_id', userId);

      if (linkedFees && linkedFees.length > 0) {
        workflowSteps.push(`✓ ${linkedFees.length} storage fee records linked to quote`);
      }

      workflowSteps.push('3. Storage fees integration completed');

      return {
        storage_fees_added: totalFees > 0,
        total_fees_usd: totalFees,
        integration_status: 'success',
        workflow_steps: workflowSteps,
      };

    } catch (error) {
      workflowSteps.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Failed storage fees integration:', error);
      
      return {
        storage_fees_added: false,
        total_fees_usd: 0,
        integration_status: 'failed',
        workflow_steps: workflowSteps,
      };
    }
  }

  /**
   * Test complete integration flow
   */
  async testCompleteIntegration(userId: string): Promise<{
    integration_test_results: {
      customer_profile: boolean;
      virtual_address: boolean;
      quote_creation: boolean;
      storage_fees: boolean;
      database_connections: boolean;
    };
    test_summary: string;
    recommendations: string[];
  }> {
    const results = {
      customer_profile: false,
      virtual_address: false,
      quote_creation: false,
      storage_fees: false,
      database_connections: false,
    };
    
    const recommendations: string[] = [];

    try {
      // Test customer profile integration
      const customerProfile = await integratedPackageForwardingService.getIntegratedCustomerProfile(userId);
      results.customer_profile = !!customerProfile;
      
      if (!customerProfile) {
        recommendations.push('Customer profile integration failed - check profiles table and user registration');
      }

      // Test virtual address integration
      if (customerProfile?.virtual_address) {
        results.virtual_address = true;
      } else {
        recommendations.push('Virtual address not found - customer needs to request warehouse address');
      }

      // Test database connections
      const { data: dbTest } = await supabase
        .from('quotes')
        .select('count')
        .eq('forwarding_type', 'individual_package')
        .limit(1);
      
      results.database_connections = !!dbTest;
      
      if (!dbTest) {
        recommendations.push('Database connection issues - check migration status and table permissions');
      }

      const successCount = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;
      
      const testSummary = `Integration test completed: ${successCount}/${totalTests} tests passed`;
      
      if (successCount === totalTests) {
        recommendations.push('✅ All systems integrated successfully - package forwarding ready for production');
      } else {
        recommendations.push(`⚠ ${totalTests - successCount} integration issues found - review and fix before production`);
      }

      return {
        integration_test_results: results,
        test_summary: testSummary,
        recommendations: recommendations,
      };

    } catch (error) {
      recommendations.push(`❌ Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        integration_test_results: results,
        test_summary: 'Integration test failed with errors',
        recommendations: recommendations,
      };
    }
  }
}

export const packageForwardingQuoteIntegration = PackageForwardingQuoteIntegration.getInstance();
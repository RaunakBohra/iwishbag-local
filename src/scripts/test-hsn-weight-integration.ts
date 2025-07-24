/**
 * Test script for HSN Weight Integration
 * 
 * This script tests the complete integration of HSN weight data
 * with the ML weight estimation system.
 */

import { supabase } from '@/integrations/supabase/client';
import { hsnWeightService } from '@/services/HSNWeightService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';

async function testHSNWeightIntegration() {
  console.log('🚀 Starting HSN Weight Integration Test...\n');

  // Test 1: HSN Weight Service
  console.log('📋 Test 1: HSN Weight Service');
  try {
    // Test with a known HSN code (example: 6109 - T-Shirts)
    const hsnCode = '6109';
    const hsnWeight = await hsnWeightService.getHSNWeight(hsnCode);
    
    if (hsnWeight) {
      console.log(`✅ HSN ${hsnCode} weight data:`, {
        average: hsnWeight.average,
        min: hsnWeight.min,
        max: hsnWeight.max,
        packaging: hsnWeight.packaging,
        confidence: hsnWeight.confidence
      });
    } else {
      console.log(`❌ No weight data found for HSN ${hsnCode}`);
    }
  } catch (error) {
    console.error('❌ HSN Weight Service test failed:', error);
  }

  console.log('\n📋 Test 2: ML Weight Estimation');
  try {
    const productName = 'Cotton T-Shirt Medium Size';
    const mlEstimation = await smartWeightEstimator.estimateWeight(productName);
    
    console.log(`✅ ML estimation for "${productName}":`, {
      weight: mlEstimation.estimated_weight,
      confidence: mlEstimation.confidence,
      reasoning: mlEstimation.reasoning[0]
    });
  } catch (error) {
    console.error('❌ ML Weight Estimation test failed:', error);
  }

  console.log('\n📋 Test 3: Weight Selection Recording');
  try {
    await smartWeightEstimator.recordWeightSelection(
      'Test Product',
      0.5,  // HSN weight
      0.45, // ML weight
      0.5,  // Selected weight (HSN)
      'hsn',
      undefined,
      'clothing',
      '6109'
    );
    console.log('✅ Weight selection recorded successfully');
  } catch (error) {
    console.error('❌ Weight selection recording failed:', error);
  }

  console.log('\n📋 Test 4: Quote Item Weight Source Tracking');
  try {
    // Check if smart_data includes weight_source field
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('items')
      .limit(1)
      .single();

    if (error) throw error;

    if (quote?.items?.[0]) {
      const firstItem = quote.items[0];
      console.log('✅ Quote item smart_data structure:', {
        has_weight_source: 'weight_source' in (firstItem.smart_data || {}),
        weight_source: firstItem.smart_data?.weight_source || 'not set',
        weight_confidence: firstItem.smart_data?.weight_confidence
      });
    }
  } catch (error) {
    console.error('❌ Quote item inspection failed:', error);
  }

  console.log('\n📋 Test 5: Analytics Data Check');
  try {
    const { data: trainingData, error } = await supabase
      .from('ml_training_history')
      .select('*')
      .eq('model_type', 'weight_selection')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log(`✅ Found ${trainingData?.length || 0} weight selection records`);
    if (trainingData?.[0]) {
      console.log('Latest selection:', {
        product: trainingData[0].product_name,
        hsn_weight: trainingData[0].training_data?.hsn_weight,
        ml_weight: trainingData[0].training_data?.ml_weight,
        selected_source: trainingData[0].training_data?.selected_source
      });
    }
  } catch (error) {
    console.error('❌ Analytics data check failed:', error);
  }

  console.log('\n✨ HSN Weight Integration Test Complete!');
}

// Run the test
testHSNWeightIntegration().catch(console.error);
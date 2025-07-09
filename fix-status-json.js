// Fix invalid JSON in system_settings table
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStatusJSON() {
  console.log('Checking system_settings table for invalid JSON...');
  
  try {
    // Get current settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['quote_statuses', 'order_statuses']);

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    console.log('Current settings:', data);

    // Check if the JSON is invalid
    for (const setting of data || []) {
      try {
        JSON.parse(setting.setting_value);
        console.log(`✅ ${setting.setting_key} has valid JSON`);
      } catch (e) {
        console.log(`❌ ${setting.setting_key} has invalid JSON:`, e.message);
        console.log('Invalid JSON content:', setting.setting_value);
        
        // Try to fix common issues like trailing commas
        let fixedJSON = setting.setting_value;
        
        // Remove trailing commas before closing brackets/braces
        fixedJSON = fixedJSON.replace(/,(\s*[\]}])/g, '$1');
        
        try {
          JSON.parse(fixedJSON);
          console.log(`🔧 Fixed JSON for ${setting.setting_key}`);
          
          // Update the database with fixed JSON
          const { error: updateError } = await supabase
            .from('system_settings')
            .update({ setting_value: fixedJSON })
            .eq('setting_key', setting.setting_key);
            
          if (updateError) {
            console.error('Error updating fixed JSON:', updateError);
          } else {
            console.log(`✅ Updated ${setting.setting_key} with fixed JSON`);
          }
        } catch (fixError) {
          console.log(`❌ Could not fix JSON for ${setting.setting_key}:`, fixError.message);
          
          // If we can't fix it, reset to defaults
          console.log(`🔄 Resetting ${setting.setting_key} to defaults...`);
          
          const defaultStatuses = setting.setting_key === 'quote_statuses' 
            ? getDefaultQuoteStatuses() 
            : getDefaultOrderStatuses();
            
          const { error: resetError } = await supabase
            .from('system_settings')
            .update({ setting_value: JSON.stringify(defaultStatuses) })
            .eq('setting_key', setting.setting_key);
            
          if (resetError) {
            console.error('Error resetting to defaults:', resetError);
          } else {
            console.log(`✅ Reset ${setting.setting_key} to defaults`);
          }
        }
      }
    }
    
    console.log('✅ JSON validation and fixes complete!');
  } catch (error) {
    console.error('Error in fixStatusJSON:', error);
  }
}

function getDefaultQuoteStatuses() {
  return [
    {
      id: 'pending',
      name: 'pending',
      label: 'Pending',
      description: 'Quote request is awaiting review',
      color: 'secondary',
      icon: 'Clock',
      isActive: true,
      order: 1,
      allowedTransitions: ['sent', 'rejected'],
      isTerminal: false,
      category: 'quote',
      triggersEmail: false,
      requiresAction: true,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false,
      isDefaultQuoteStatus: true
    },
    // Add other default statuses...
  ];
}

function getDefaultOrderStatuses() {
  return [
    {
      id: 'paid',
      name: 'paid',
      label: 'Paid',
      description: 'Payment has been received',
      color: 'default',
      icon: 'DollarSign',
      isActive: true,
      order: 1,
      allowedTransitions: ['ordered', 'cancelled'],
      isTerminal: false,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'payment_received',
      requiresAction: true,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    // Add other default statuses...
  ];
}

fixStatusJSON();
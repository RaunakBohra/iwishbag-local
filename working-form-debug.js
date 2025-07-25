// ==================================================
// WORKING FORM CLEARING DEBUG SCRIPT
// ==================================================
// Copy and paste this entire script in browser console

console.log('🔍 FORM CLEARING DEBUG SCRIPT LOADED');

// Global variables for tracking
window.formDebugActive = true;
window.formSnapshot = {};
window.clearingEvents = [];

// Enhanced form state capture
function captureFormState() {
  const items = [];
  
  // More specific selectors for product fields
  const productContainers = document.querySelectorAll('.border-b.border-gray-200, [class*="product"], .space-y-3 > div');
  
  productContainers.forEach((container, index) => {
    // Look for product name field
    const nameInput = container.querySelector('input[placeholder*="iPhone"], input[placeholder*="Pro Max"], input[value][type="text"]:not([type="number"])');
    
    // Look for URL field  
    const urlInput = container.querySelector('input[type="url"], input[placeholder*="amazon"], input[placeholder*="com"]');
    
    // Look for price field
    const priceInput = container.querySelector('input[type="number"][step="0.01"], input[type="number"]:not([min="1"])');
    
    // Look for weight field
    const weightInput = container.querySelector('input[placeholder*="0.2"], input[placeholder*="kg"]');
    
    // Look for quantity field
    const qtyInput = container.querySelector('input[type="number"][min="1"], input[placeholder="1"]');
    
    // Only add if we found at least one input
    if (nameInput || urlInput || priceInput) {
      const item = {
        index,
        container: container.className,
        name: nameInput?.value || '',
        url: urlInput?.value || '',
        price: priceInput?.value || '',
        weight: weightInput?.value || '',
        quantity: qtyInput?.value || '1',
        hasValues: Boolean(nameInput?.value || urlInput?.value || priceInput?.value)
      };
      
      if (item.hasValues) {
        items.push(item);
      }
    }
  });
  
  return {
    items,
    timestamp: Date.now(),
    itemsWithData: items.filter(item => item.hasValues).length
  };
}

// Check for form clearing
function detectFormClearing() {
  const currentState = captureFormState();
  
  if (window.formSnapshot.items && currentState.items.length >= 0) {
    window.formSnapshot.items.forEach((prevItem, index) => {
      const currentItem = currentState.items.find(item => item.index === prevItem.index) || {
        name: '', url: '', price: '', weight: '', quantity: ''
      };
      
      const clearedFields = [];
      
      // Check each field for clearing
      if (prevItem.name && !currentItem.name && prevItem.name.length > 2) {
        clearedFields.push({field: 'name', value: prevItem.name});
      }
      if (prevItem.url && !currentItem.url && prevItem.url.length > 5) {
        clearedFields.push({field: 'url', value: prevItem.url});
      }
      if (prevItem.price && !currentItem.price && prevItem.price !== '0') {
        clearedFields.push({field: 'price', value: prevItem.price});
      }
      if (prevItem.weight && !currentItem.weight && prevItem.weight !== '0') {
        clearedFields.push({field: 'weight', value: prevItem.weight});
      }
      
      if (clearedFields.length > 0) {
        const clearingEvent = {
          timestamp: Date.now(),
          itemIndex: prevItem.index,
          clearedFields: clearedFields,
          timeSinceLastSnapshot: Date.now() - window.formSnapshot.timestamp,
          possibleCause: determinePossibleCause(Date.now() - window.formSnapshot.timestamp)
        };
        
        window.clearingEvents.push(clearingEvent);
        
        // Alert with styling
        console.group('%c🚨 FORM CLEARING DETECTED', 'background: #ff4444; color: white; padding: 5px; font-weight: bold;');
        console.log('⏰ Time:', new Date().toISOString());
        console.log('📍 Item Index:', prevItem.index);
        console.log('🗑️ Cleared Fields:', clearedFields);
        console.log('⏱️ Time since last check:', `${clearingEvent.timeSinceLastSnapshot}ms`);
        console.log('🎯 Likely Cause:', clearingEvent.possibleCause);
        console.log('📊 Previous Values:', prevItem);
        console.log('📊 Current Values:', currentItem);
        console.groupEnd();
        
        // Highlight the cleared fields
        highlightClearedField(prevItem.index, clearedFields);
      }
    });
  }
  
  window.formSnapshot = currentState;
}

// Determine possible cause based on timing
function determinePossibleCause(timeDiff) {
  if (timeDiff >= 44000 && timeDiff <= 46000) {
    return "🎯 45-SECOND REACT QUERY REFETCH (Most Likely!)";
  } else if (timeDiff >= 29000 && timeDiff <= 31000) {
    return "🎯 30-SECOND REFETCH INTERVAL";
  } else if (timeDiff < 5000) {
    return "⚡ Form Reset/Component Re-render";
  } else if (timeDiff < 1000) {
    return "⚡ Immediate Form Reset (populateFormFromQuote?)";
  } else {
    return "❓ Unknown timing pattern";
  }
}

// Highlight cleared fields visually
function highlightClearedField(itemIndex, clearedFields) {
  const containers = document.querySelectorAll('.border-b.border-gray-200, [class*="product"]');
  const container = containers[itemIndex];
  
  if (container) {
    clearedFields.forEach(({field}) => {
      let selector;
      switch(field) {
        case 'name':
          selector = 'input[type="text"]:not([type="number"]), input[placeholder*="iPhone"]';
          break;
        case 'url':
          selector = 'input[type="url"]';
          break;
        case 'price':
          selector = 'input[type="number"][step="0.01"]';
          break;
        case 'weight':
          selector = 'input[placeholder*="0.2"]';
          break;
      }
      
      const input = container.querySelector(selector);
      if (input) {
        input.style.border = '3px solid #ff4444';
        input.style.backgroundColor = '#ffebee';
        input.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.5)';
        
        setTimeout(() => {
          input.style.border = '';
          input.style.backgroundColor = '';
          input.style.boxShadow = '';
        }, 5000);
      }
    });
  }
}

// Monitor React Query logs
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // Detect React Query activity
  if (message.includes('SAFE-SYNC') || message.includes('refetch') || message.includes('Force refreshing quote')) {
    console.group('%c🔄 REACT QUERY ACTIVITY', 'background: #2196F3; color: white; padding: 5px;');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📝 Message:', message);
    console.log('🔍 This might cause form clearing - checking...');
    console.groupEnd();
    
    // Check for clearing after a short delay
    setTimeout(() => {
      detectFormClearing();
    }, 100);
  }
  
  return originalConsoleLog.apply(this, args);
};

// Track user input to know when they're actively typing
let lastUserInputTime = 0;
document.addEventListener('input', (e) => {
  if (e.target.matches('input[type="text"], input[type="url"], input[type="number"]')) {
    lastUserInputTime = Date.now();
    console.log('%c✏️ USER INPUT', 'background: #4CAF50; color: white; padding: 2px 5px;', 
                `Field: ${e.target.placeholder || 'unknown'}, Value: "${e.target.value}"`);
  }
}, true);

// Create utility functions
window.formDebugStatus = function() {
  const current = captureFormState();
  console.group('%c📊 FORM DEBUG STATUS', 'background: #9C27B0; color: white; padding: 5px;');
  console.log('📊 Current form state:', current);
  console.log('🗑️ Total clearing events:', window.clearingEvents.length);
  console.log('⏰ Last user input:', lastUserInputTime ? new Date(lastUserInputTime).toISOString() : 'None');
  console.log('🎯 Recent clearing events:', window.clearingEvents.slice(-3));
  console.groupEnd();
  return {current, clearingEvents: window.clearingEvents.length};
};

window.checkFormNow = function() {
  console.log('%c🔍 MANUAL FORM CHECK', 'background: #FF9800; color: white; padding: 5px;');
  detectFormClearing();
};

window.getClearingHistory = function() {
  console.table(window.clearingEvents.map(event => ({
    time: new Date(event.timestamp).toISOString(),
    item: event.itemIndex,
    fields: event.clearedFields.map(f => f.field).join(', '),
    cause: event.possibleCause,
    timingMs: event.timeSinceLastSnapshot
  })));
  return window.clearingEvents;
};

window.stopFormDebug = function() {
  window.formDebugActive = false;
  console.log = originalConsoleLog;
  clearInterval(window.formCheckInterval);
  console.log('%c🛑 FORM DEBUG STOPPED', 'background: #f44336; color: white; padding: 5px;');
};

// Start monitoring
window.formSnapshot = captureFormState();
console.log('%c🚀 FORM DEBUG STARTED', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
console.log('Current form state captured:', window.formSnapshot);

// Check every 3 seconds
window.formCheckInterval = setInterval(() => {
  if (window.formDebugActive) {
    detectFormClearing();
  }
}, 3000);

// Instructions
console.log(`
%c📋 AVAILABLE COMMANDS:
• formDebugStatus() - Check current status
• checkFormNow() - Force immediate check  
• getClearingHistory() - View all clearing events
• stopFormDebug() - Stop monitoring

🎯 NOW: Type in product fields and watch for clearing alerts!
The script will automatically detect and highlight when fields get cleared.
`, 'background: #e3f2fd; color: #1976d2; padding: 10px; border-left: 4px solid #2196f3;');
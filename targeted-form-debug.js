// ==================================================
// TARGETED FORM CLEARING DEBUG SCRIPT
// ==================================================
// Specifically designed for your admin quotes page structure

console.log('🔍 TARGETED FORM DEBUG LOADED - Looking for your specific HTML structure');

// Global tracking variables
window.formDebugActive = true;
window.formSnapshot = {};
window.clearingEvents = [];

// Enhanced form state capture based on your HTML structure
function captureFormState() {
  const items = [];
  
  console.log('🔍 Scanning for product input fields...');
  
  // Your specific HTML shows these patterns:
  // 1. Product containers with class "p-4 space-y-3"
  // 2. Grid layouts with "grid grid-cols-12 gap-3" and "grid grid-cols-10 gap-3"
  
  // Look for the main product containers
  const productContainers = document.querySelectorAll('.p-4.space-y-3, .space-y-3, [class*="p-4"][class*="space-y-3"]');
  
  console.log(`Found ${productContainers.length} potential product containers`);
  
  productContainers.forEach((container, index) => {
    console.log(`Scanning container ${index}:`, container.className);
    
    // Look for the specific input fields based on your HTML structure
    const nameInput = container.querySelector('input[placeholder="iPhone 16 Pro Max"], input[placeholder*="iPhone"], .col-span-7 input[type="text"]');
    const urlInput = container.querySelector('input[placeholder="amazon.com/..."], input[placeholder*="amazon"], .col-span-5 input[type="url"]');
    const priceInput = container.querySelector('input[placeholder="1,000.00"], .col-span-4 input[type="number"][step="0.01"]');
    const weightInput = container.querySelector('input[placeholder="0.2"], input[placeholder*="0.2"]');
    const qtyInput = container.querySelector('input[placeholder="1"], .col-span-2 input[type="number"][min="1"]');
    
    console.log(`Container ${index} inputs:`, {
      name: nameInput?.value || 'not found',
      url: urlInput?.value || 'not found', 
      price: priceInput?.value || 'not found'
    });
    
    // Also try alternative selectors
    if (!nameInput && !urlInput && !priceInput) {
      // Fallback: look for any text inputs in this container
      const allInputs = container.querySelectorAll('input');
      console.log(`Container ${index} fallback - found ${allInputs.length} total inputs`);
      
      allInputs.forEach((input, i) => {
        console.log(`  Input ${i}: type=${input.type}, placeholder="${input.placeholder}", value="${input.value}"`);
      });
    }
    
    // Add to items if we found any meaningful inputs
    if (nameInput || urlInput || priceInput) {
      const item = {
        index,
        containerClass: container.className,
        name: nameInput?.value || '',
        url: urlInput?.value || '',
        price: priceInput?.value || '',
        weight: weightInput?.value || '',
        quantity: qtyInput?.value || '1',
        hasValues: Boolean((nameInput?.value && nameInput.value.length > 0) || 
                          (urlInput?.value && urlInput.value.length > 0) || 
                          (priceInput?.value && priceInput.value.length > 0))
      };
      
      items.push(item);
      console.log(`Added item ${index}:`, item);
    }
  });
  
  // Alternative approach: look for inputs by their grid column classes
  const nameInputs = document.querySelectorAll('.col-span-7 input[type="text"]');
  const urlInputs = document.querySelectorAll('.col-span-5 input[type="url"]');
  const priceInputs = document.querySelectorAll('.col-span-4 input[type="number"][step="0.01"]');
  
  console.log(`Alternative search found: ${nameInputs.length} name, ${urlInputs.length} url, ${priceInputs.length} price inputs`);
  
  // If we didn't find anything with containers, try the direct approach
  if (items.length === 0 && (nameInputs.length > 0 || urlInputs.length > 0 || priceInputs.length > 0)) {
    const maxInputs = Math.max(nameInputs.length, urlInputs.length, priceInputs.length);
    
    for (let i = 0; i < maxInputs; i++) {
      const nameInput = nameInputs[i];
      const urlInput = urlInputs[i];
      const priceInput = priceInputs[i];
      
      const item = {
        index: i,
        containerClass: 'direct-grid-search',
        name: nameInput?.value || '',
        url: urlInput?.value || '',
        price: priceInput?.value || '',
        weight: '',
        quantity: '1',
        hasValues: Boolean((nameInput?.value && nameInput.value.length > 0) || 
                          (urlInput?.value && urlInput.value.length > 0) || 
                          (priceInput?.value && priceInput.value.length > 0))
      };
      
      items.push(item);
      console.log(`Added direct item ${i}:`, item);
    }
  }
  
  const result = {
    items,
    timestamp: Date.now(),
    itemsWithData: items.filter(item => item.hasValues).length,
    totalInputsFound: items.length
  };
  
  console.log('📊 Form state capture result:', result);
  return result;
}

// Check for form clearing
function detectFormClearing() {
  const currentState = captureFormState();
  
  if (window.formSnapshot.items && currentState.items.length > 0) {
    window.formSnapshot.items.forEach((prevItem, index) => {
      const currentItem = currentState.items[index];
      
      if (currentItem) {
        const clearedFields = [];
        
        // Check each field for clearing (only if it had meaningful content)
        if (prevItem.name && prevItem.name.length > 1 && !currentItem.name) {
          clearedFields.push({field: 'name', value: prevItem.name});
        }
        if (prevItem.url && prevItem.url.length > 5 && !currentItem.url) {
          clearedFields.push({field: 'url', value: prevItem.url});
        }
        if (prevItem.price && prevItem.price.length > 0 && prevItem.price !== '0' && !currentItem.price) {
          clearedFields.push({field: 'price', value: prevItem.price});
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
          console.group('%c🚨 FORM CLEARING DETECTED', 'background: #ff4444; color: white; padding: 8px; font-weight: bold; font-size: 14px;');
          console.log('%c⏰ Time:', 'font-weight: bold;', new Date().toISOString());
          console.log('%c📍 Item Index:', 'font-weight: bold;', prevItem.index);
          console.log('%c🗑️ Cleared Fields:', 'font-weight: bold;', clearedFields);
          console.log('%c⏱️ Time since last check:', 'font-weight: bold;', `${clearingEvent.timeSinceLastSnapshot}ms`);
          console.log('%c🎯 Likely Cause:', 'font-weight: bold; color: red;', clearingEvent.possibleCause);
          console.log('%c📊 Previous Values:', 'color: green;', prevItem);
          console.log('%c📊 Current Values:', 'color: red;', currentItem);
          console.groupEnd();
          
          // Highlight the cleared fields
          highlightClearedField(prevItem.index, clearedFields);
        }
      }
    });
  }
  
  window.formSnapshot = currentState;
}

// Determine possible cause based on timing
function determinePossibleCause(timeDiff) {
  if (timeDiff >= 44000 && timeDiff <= 46000) {
    return "🎯 45-SECOND REACT QUERY REFETCH (MAIN CULPRIT!)";
  } else if (timeDiff >= 29000 && timeDiff <= 31000) {
    return "🎯 30-SECOND REFETCH INTERVAL";
  } else if (timeDiff < 2000) {
    return "⚡ IMMEDIATE FORM RESET (populateFormFromQuote)";
  } else if (timeDiff < 5000) {
    return "⚡ Component Re-render/State Update";
  } else {
    return `❓ Unknown timing pattern (${timeDiff}ms)`;
  }
}

// Enhanced highlighting
function highlightClearedField(itemIndex, clearedFields) {
  // Try multiple approaches to find and highlight the cleared inputs
  const nameInputs = document.querySelectorAll('.col-span-7 input[type="text"]');
  const urlInputs = document.querySelectorAll('.col-span-5 input[type="url"]');
  const priceInputs = document.querySelectorAll('.col-span-4 input[type="number"][step="0.01"]');
  
  clearedFields.forEach(({field}) => {
    let input;
    
    switch(field) {
      case 'name':
        input = nameInputs[itemIndex];
        break;
      case 'url':
        input = urlInputs[itemIndex];
        break;
      case 'price':
        input = priceInputs[itemIndex];
        break;
    }
    
    if (input) {
      console.log(`🎯 Highlighting cleared ${field} field:`, input);
      input.style.border = '4px solid #ff4444';
      input.style.backgroundColor = '#ffebee';  
      input.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.8)';
      input.style.transform = 'scale(1.02)';
      
      // Flash effect
      let flash = 0;
      const flashInterval = setInterval(() => {
        input.style.backgroundColor = flash % 2 ? '#ffebee' : '#ffcdd2';
        flash++;
        if (flash > 6) {
          clearInterval(flashInterval);
          input.style.backgroundColor = '#ffebee';
        }
      }, 200);
      
      setTimeout(() => {
        input.style.border = '';
        input.style.backgroundColor = '';
        input.style.boxShadow = '';
        input.style.transform = '';
      }, 8000);
    }
  });
}

// Track user input
let lastUserInputTime = 0;
document.addEventListener('input', (e) => {
  if (e.target.matches('input')) {
    lastUserInputTime = Date.now();
    console.log('%c✏️ USER INPUT DETECTED', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;', 
                {
                  field: e.target.placeholder || e.target.className,
                  value: e.target.value,
                  timestamp: new Date().toISOString()
                });
  }
}, true);

// Utility functions
window.formDebugStatus = function() {
  const current = captureFormState();
  console.group('%c📊 DETAILED FORM DEBUG STATUS', 'background: #9C27B0; color: white; padding: 8px; font-size: 14px;');
  console.log('%c📊 Current form state:', 'font-weight: bold;', current);
  console.log('%c🗑️ Total clearing events:', 'font-weight: bold;', window.clearingEvents.length);
  console.log('%c⏰ Last user input:', 'font-weight: bold;', lastUserInputTime ? new Date(lastUserInputTime).toISOString() : 'None detected');
  console.log('%c🎯 Recent clearing events:', 'font-weight: bold;', window.clearingEvents.slice(-3));
  
  // Show detailed input analysis
  const allInputs = document.querySelectorAll('input');
  console.log(`%c🔍 Total inputs on page: ${allInputs.length}`, 'color: blue;');
  
  const relevantInputs = Array.from(allInputs).filter(input => 
    input.type === 'text' || input.type === 'url' || (input.type === 'number' && input.getAttribute('step') === '0.01')
  );
  console.log(`%c🎯 Product-related inputs: ${relevantInputs.length}`, 'color: blue;');
  
  relevantInputs.forEach((input, i) => {
    console.log(`  Input ${i}: type=${input.type}, placeholder="${input.placeholder}", value="${input.value}", class="${input.className}"`);
  });
  
  console.groupEnd();
  return {current, clearingEvents: window.clearingEvents.length, totalInputs: allInputs.length};
};

window.manualCheck = function() {
  console.log('%c🔍 MANUAL FORM CHECK TRIGGERED', 'background: #FF9800; color: white; padding: 5px; font-weight: bold;');
  detectFormClearing();
};

window.showInputs = function() {
  console.log('%c🔍 SHOWING ALL INPUTS ON PAGE', 'background: #2196F3; color: white; padding: 5px;');
  const inputs = document.querySelectorAll('input');
  inputs.forEach((input, i) => {
    console.log(`${i}: ${input.type} | "${input.placeholder}" | "${input.value}" | ${input.className}`);
  });
};

// Enhanced React Query monitoring
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // Look for React Query and form-related activity
  if (message.includes('SAFE-SYNC') || 
      message.includes('refetch') || 
      message.includes('Force refreshing quote') ||
      message.includes('populateFormFromQuote') ||
      message.includes('form.reset')) {
    
    console.group('%c🔄 DETECTED POTENTIAL FORM RESET TRIGGER', 'background: #ff9800; color: white; padding: 5px; font-weight: bold;');
    console.log('%c⏰ Time:', 'font-weight: bold;', new Date().toISOString());
    console.log('%c📝 Message:', 'font-weight: bold;', message);
    console.log('%c🔍 Checking for form clearing in 200ms...', 'color: orange;');
    console.groupEnd();
    
    // Check for clearing after React has updated
    setTimeout(() => {
      detectFormClearing();
    }, 200);
  }
  
  return originalConsoleLog.apply(this, args);
};

// Initialize
console.log('%c🚀 TARGETED FORM DEBUG STARTING', 'background: #4CAF50; color: white; padding: 8px; font-weight: bold; font-size: 16px;');

// Capture initial state
window.formSnapshot = captureFormState();

// Start monitoring every 2 seconds
window.formCheckInterval = setInterval(() => {
  if (window.formDebugActive) {
    detectFormClearing();
  }
}, 2000);

console.log(`
%c📋 COMMANDS AVAILABLE:
• formDebugStatus() - Detailed status with input analysis
• manualCheck() - Force immediate form clearing check
• showInputs() - List all inputs on the page
• stopFormDebug() - Stop monitoring

🎯 ACTION ITEMS:
1. Run formDebugStatus() to see if inputs are detected
2. Type in product name/URL/price fields
3. Wait for clearing alerts (especially around 45-second intervals)

The script is now actively monitoring for form clearing!
`, 'background: #e3f2fd; color: #1976d2; padding: 10px; border-left: 4px solid #2196f3; font-size: 12px;');
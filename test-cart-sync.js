// Cart Synchronization Test Script
// Based on CART_SYNC_TEST_PLAN.md

const testCartSync = {
  // Test configuration
  config: {
    baseUrl: 'http://localhost:8083',
    timeout: 5000,
    retries: 3
  },

  // Test results storage
  results: {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  },

  // Utility functions
  utils: {
    log(message, type = 'info') {
      const timestamp = new Date().toISOString();
      const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'     // Reset
      };
      console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    },

    async wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    async retry(fn, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === retries - 1) throw error;
          await this.wait(1000 * (i + 1));
        }
      }
    }
  },

  // Test helpers
  helpers: {
    async getCartTotal() {
      // Get cart total from CartDrawer
      const cartDrawer = document.querySelector('[data-testid="cart-drawer"]');
      if (!cartDrawer) return null;
      
      const totalElement = cartDrawer.querySelector('[data-testid="cart-total"]');
      return totalElement ? parseFloat(totalElement.textContent.replace(/[^0-9.-]+/g, '')) : null;
    },

    async getCartPageTotal() {
      // Get cart total from Cart page
      const totalElement = document.querySelector('[data-testid="cart-page-total"]');
      return totalElement ? parseFloat(totalElement.textContent.replace(/[^0-9.-]+/g, '')) : null;
    },

    async getSelectedItemsCount() {
      const selectedElements = document.querySelectorAll('[data-testid="cart-item"] input[type="checkbox"]:checked');
      return selectedElements.length;
    },

    async getCartItemCount() {
      const cartItems = document.querySelectorAll('[data-testid="cart-item"]');
      return cartItems.length;
    },

    async selectCartItem(index = 0) {
      const checkboxes = document.querySelectorAll('[data-testid="cart-item"] input[type="checkbox"]');
      if (checkboxes[index]) {
        checkboxes[index].click();
        await this.utils.wait(500);
      }
    },

    async selectAllCartItems() {
      const selectAllCheckbox = document.querySelector('[data-testid="select-all-cart"]');
      if (selectAllCheckbox) {
        selectAllCheckbox.click();
        await this.utils.wait(500);
      }
    },

    async changeItemQuantity(index = 0, newQuantity) {
      const quantityInputs = document.querySelectorAll('[data-testid="quantity-input"]');
      if (quantityInputs[index]) {
        quantityInputs[index].value = newQuantity;
        quantityInputs[index].dispatchEvent(new Event('change'));
        await this.utils.wait(500);
      }
    },

    async moveItemToSaved(index = 0) {
      const moveButtons = document.querySelectorAll('[data-testid="move-to-saved"]');
      if (moveButtons[index]) {
        moveButtons[index].click();
        await this.utils.wait(1000);
      }
    },

    async openCartDrawer() {
      const cartButton = document.querySelector('[data-testid="cart-button"]');
      if (cartButton) {
        cartButton.click();
        await this.utils.wait(1000);
      }
    },

    async navigateToCartPage() {
      window.location.href = '/cart';
      await this.utils.wait(2000);
    }
  },

  // Test cases
  tests: {
    async testBasicCartOperations() {
      testCartSync.utils.log('🧪 Test Case 1: Basic Cart Operations', 'info');
      
      try {
        // Step 1: Open cart drawer
        await testCartSync.helpers.openCartDrawer();
        const drawerTotal = await testCartSync.helpers.getCartTotal();
        const drawerItemCount = await testCartSync.helpers.getCartItemCount();
        
        // Step 2: Navigate to cart page
        await testCartSync.helpers.navigateToCartPage();
        const pageTotal = await testCartSync.helpers.getCartPageTotal();
        const pageItemCount = await testCartSync.helpers.getCartItemCount();
        
        // Step 3: Compare totals
        const totalsMatch = Math.abs((drawerTotal || 0) - (pageTotal || 0)) < 0.01;
        const countsMatch = drawerItemCount === pageItemCount;
        
        if (totalsMatch && countsMatch) {
          testCartSync.utils.log('✅ Basic cart operations test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Basic cart operations test FAILED - Totals: ${totalsMatch}, Counts: ${countsMatch}`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Basic cart operations test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testItemSelectionSync() {
      testCartSync.utils.log('🧪 Test Case 2: Item Selection Synchronization', 'info');
      
      try {
        // Step 1: Open cart drawer and select items
        await testCartSync.helpers.openCartDrawer();
        await testCartSync.helpers.selectCartItem(0);
        const drawerSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        // Step 2: Navigate to cart page and check selection
        await testCartSync.helpers.navigateToCartPage();
        const pageSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        // Step 3: Select different items in cart page
        await testCartSync.helpers.selectCartItem(1);
        const pageNewSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        // Step 4: Go back to drawer and check
        await testCartSync.helpers.openCartDrawer();
        const drawerNewSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        const selectionSyncs = pageNewSelectedCount === drawerNewSelectedCount;
        
        if (selectionSyncs) {
          testCartSync.utils.log('✅ Item selection sync test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Item selection sync test FAILED - Selection not syncing`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Item selection sync test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testQuantityUpdates() {
      testCartSync.utils.log('🧪 Test Case 3: Quantity Updates', 'info');
      
      try {
        // Step 1: Open cart drawer and change quantity
        await testCartSync.helpers.openCartDrawer();
        const originalTotal = await testCartSync.helpers.getCartTotal();
        await testCartSync.helpers.changeItemQuantity(0, 2);
        await testCartSync.utils.wait(1000);
        const drawerNewTotal = await testCartSync.helpers.getCartTotal();
        
        // Step 2: Navigate to cart page and check
        await testCartSync.helpers.navigateToCartPage();
        const pageTotal = await testCartSync.helpers.getCartPageTotal();
        
        // Step 3: Change quantity in cart page
        await testCartSync.helpers.changeItemQuantity(0, 3);
        await testCartSync.utils.wait(1000);
        const pageNewTotal = await testCartSync.helpers.getCartPageTotal();
        
        // Step 4: Go back to drawer and check
        await testCartSync.helpers.openCartDrawer();
        const drawerFinalTotal = await testCartSync.helpers.getCartTotal();
        
        const quantitiesSync = Math.abs((pageNewTotal || 0) - (drawerFinalTotal || 0)) < 0.01;
        
        if (quantitiesSync) {
          testCartSync.utils.log('✅ Quantity updates test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Quantity updates test FAILED - Quantities not syncing`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Quantity updates test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testMoveBetweenCartAndSaved() {
      testCartSync.utils.log('🧪 Test Case 4: Move Between Cart and Saved', 'info');
      
      try {
        // Step 1: Open cart drawer and move item to saved
        await testCartSync.helpers.openCartDrawer();
        const originalCartCount = await testCartSync.helpers.getCartItemCount();
        await testCartSync.helpers.moveItemToSaved(0);
        await testCartSync.utils.wait(1000);
        const drawerCartCount = await testCartSync.helpers.getCartItemCount();
        
        // Step 2: Navigate to cart page and check
        await testCartSync.helpers.navigateToCartPage();
        const pageCartCount = await testCartSync.helpers.getCartItemCount();
        
        const moveToSavedWorks = drawerCartCount === pageCartCount && drawerCartCount < originalCartCount;
        
        if (moveToSavedWorks) {
          testCartSync.utils.log('✅ Move between cart/saved test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Move between cart/saved test FAILED - Move not working`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Move between cart/saved test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testBulkOperations() {
      testCartSync.utils.log('🧪 Test Case 5: Bulk Operations', 'info');
      
      try {
        // Step 1: Open cart drawer and select multiple items
        await testCartSync.helpers.openCartDrawer();
        await testCartSync.helpers.selectAllCartItems();
        const selectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        // Step 2: Navigate to cart page and check selection
        await testCartSync.helpers.navigateToCartPage();
        const pageSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        const bulkSelectionWorks = selectedCount === pageSelectedCount && selectedCount > 0;
        
        if (bulkSelectionWorks) {
          testCartSync.utils.log('✅ Bulk operations test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Bulk operations test FAILED - Bulk selection not working`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Bulk operations test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testCheckoutFlow() {
      testCartSync.utils.log('🧪 Test Case 6: Checkout Flow', 'info');
      
      try {
        // Step 1: Open cart drawer and select some items
        await testCartSync.helpers.openCartDrawer();
        await testCartSync.helpers.selectCartItem(0);
        const selectedCount = await testCartSync.helpers.getSelectedItemsCount();
        
        // Step 2: Check if checkout button is available
        const checkoutButton = document.querySelector('[data-testid="checkout-button"]');
        const checkoutAvailable = checkoutButton && !checkoutButton.disabled && selectedCount > 0;
        
        if (checkoutAvailable) {
          testCartSync.utils.log('✅ Checkout flow test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Checkout flow test FAILED - Checkout not available`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Checkout flow test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testAutoSelectionBehavior() {
      testCartSync.utils.log('🧪 Test Case 7: Auto-Selection Behavior', 'info');
      
      try {
        // Step 1: Open cart drawer and check auto-selection
        await testCartSync.helpers.openCartDrawer();
        const autoSelectedCount = await testCartSync.helpers.getSelectedItemsCount();
        const totalItems = await testCartSync.helpers.getCartItemCount();
        
        // Auto-selection should work when there are items
        const autoSelectionWorks = totalItems === 0 || autoSelectedCount === totalItems;
        
        if (autoSelectionWorks) {
          testCartSync.utils.log('✅ Auto-selection behavior test PASSED', 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Auto-selection behavior test FAILED - Auto-selection not working`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Auto-selection behavior test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    },

    async testPerformance() {
      testCartSync.utils.log('🧪 Test Case 8: Performance and Responsiveness', 'info');
      
      try {
        const startTime = performance.now();
        
        // Step 1: Open cart drawer
        await testCartSync.helpers.openCartDrawer();
        const drawerLoadTime = performance.now() - startTime;
        
        // Step 2: Navigate to cart page
        const pageStartTime = performance.now();
        await testCartSync.helpers.navigateToCartPage();
        const pageLoadTime = performance.now() - pageStartTime;
        
        const performanceAcceptable = drawerLoadTime < 2000 && pageLoadTime < 2000;
        
        if (performanceAcceptable) {
          testCartSync.utils.log(`✅ Performance test PASSED - Drawer: ${drawerLoadTime.toFixed(0)}ms, Page: ${pageLoadTime.toFixed(0)}ms`, 'success');
          testCartSync.results.passed++;
          return true;
        } else {
          testCartSync.utils.log(`❌ Performance test FAILED - Drawer: ${drawerLoadTime.toFixed(0)}ms, Page: ${pageLoadTime.toFixed(0)}ms`, 'error');
          testCartSync.results.failed++;
          return false;
        }
      } catch (error) {
        testCartSync.utils.log(`❌ Performance test ERROR: ${error.message}`, 'error');
        testCartSync.results.failed++;
        return false;
      }
    }
  },

  // Main test runner
  async runAllTests() {
    testCartSync.utils.log('🚀 Starting Cart Synchronization Test Suite', 'info');
    testCartSync.utils.log('='.repeat(60), 'info');
    
    const testCases = [
      { name: 'Basic Cart Operations', fn: testCartSync.tests.testBasicCartOperations },
      { name: 'Item Selection Sync', fn: testCartSync.tests.testItemSelectionSync },
      { name: 'Quantity Updates', fn: testCartSync.tests.testQuantityUpdates },
      { name: 'Move Between Cart/Saved', fn: testCartSync.tests.testMoveBetweenCartAndSaved },
      { name: 'Bulk Operations', fn: testCartSync.tests.testBulkOperations },
      { name: 'Checkout Flow', fn: testCartSync.tests.testCheckoutFlow },
      { name: 'Auto-Selection Behavior', fn: testCartSync.tests.testAutoSelectionBehavior },
      { name: 'Performance', fn: testCartSync.tests.testPerformance }
    ];

    for (const testCase of testCases) {
      testCartSync.results.total++;
      try {
        await testCartSync.utils.retry(async () => {
          const result = await testCase.fn();
          testCartSync.results.details.push({
            name: testCase.name,
            status: result ? 'PASSED' : 'FAILED',
            timestamp: new Date().toISOString()
          });
          return result;
        }, testCartSync.config.retries);
      } catch (error) {
        testCartSync.results.details.push({
          name: testCase.name,
          status: 'ERROR',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Wait between tests
      await testCartSync.utils.wait(1000);
    }

    // Generate report
    testCartSync.generateReport();
  },

  // Generate test report
  generateReport() {
    testCartSync.utils.log('='.repeat(60), 'info');
    testCartSync.utils.log('📊 Cart Synchronization Test Report', 'info');
    testCartSync.utils.log('='.repeat(60), 'info');
    
    testCartSync.utils.log(`Total Tests: ${testCartSync.results.total}`, 'info');
    testCartSync.utils.log(`Passed: ${testCartSync.results.passed}`, 'success');
    testCartSync.utils.log(`Failed: ${testCartSync.results.failed}`, testCartSync.results.failed > 0 ? 'error' : 'success');
    testCartSync.utils.log(`Success Rate: ${((testCartSync.results.passed / testCartSync.results.total) * 100).toFixed(1)}%`, 'info');
    
    testCartSync.utils.log('\n📋 Detailed Results:', 'info');
    testCartSync.results.details.forEach(detail => {
      const statusColor = detail.status === 'PASSED' ? 'success' : 'error';
      testCartSync.utils.log(`  ${detail.status === 'PASSED' ? '✅' : '❌'} ${detail.name}: ${detail.status}`, statusColor);
      if (detail.error) {
        testCartSync.utils.log(`    Error: ${detail.error}`, 'error');
      }
    });
    
    // Overall result
    const allPassed = testCartSync.results.failed === 0;
    testCartSync.utils.log('\n' + '='.repeat(60), 'info');
    if (allPassed) {
      testCartSync.utils.log('🎉 ALL TESTS PASSED! Cart synchronization is working correctly.', 'success');
    } else {
      testCartSync.utils.log('⚠️  SOME TESTS FAILED. Please review the issues above.', 'warning');
    }
    testCartSync.utils.log('='.repeat(60), 'info');
  },

  // Quick test for specific functionality
  async quickTest() {
    testCartSync.utils.log('⚡ Running Quick Cart Sync Test', 'info');
    
    try {
      await testCartSync.helpers.openCartDrawer();
      const drawerTotal = await testCartSync.helpers.getCartTotal();
      const drawerCount = await testCartSync.helpers.getCartItemCount();
      
      await testCartSync.helpers.navigateToCartPage();
      const pageTotal = await testCartSync.helpers.getCartPageTotal();
      const pageCount = await testCartSync.helpers.getCartItemCount();
      
      const syncs = Math.abs((drawerTotal || 0) - (pageTotal || 0)) < 0.01 && drawerCount === pageCount;
      
      if (syncs) {
        testCartSync.utils.log('✅ Quick test PASSED - Cart sync is working!', 'success');
      } else {
        testCartSync.utils.log('❌ Quick test FAILED - Cart sync issues detected', 'error');
      }
      
      return syncs;
    } catch (error) {
      testCartSync.utils.log(`❌ Quick test ERROR: ${error.message}`, 'error');
      return false;
    }
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testCartSync = testCartSync;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testCartSync;
}

console.log('🧪 Cart Synchronization Test Suite loaded!');
console.log('Run testCartSync.runAllTests() to execute all tests');
console.log('Run testCartSync.quickTest() for a quick check'); 
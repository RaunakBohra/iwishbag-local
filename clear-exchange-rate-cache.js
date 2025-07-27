// Clear exchange rate cache in browser
// Run this in browser console

console.log('🧹 Clearing exchange rate cache...');

// Clear localStorage cache
const keys = Object.keys(localStorage);
const cacheKeys = keys.filter(key => key.includes('iwishbag_currency_rate_'));
console.log('Found cache keys:', cacheKeys);

cacheKeys.forEach(key => {
  console.log(`Removing cache key: ${key}`);
  localStorage.removeItem(key);
});

// Clear memory cache in OptimizedCurrencyService if available
if (window.optimizedCurrencyService) {
  console.log('Clearing OptimizedCurrencyService memory cache...');
  window.optimizedCurrencyService.clearCache?.();
}

// Clear CurrencyService cache if available  
if (window.currencyService) {
  console.log('Clearing CurrencyService cache...');
  window.currencyService.clearCache?.();
}

console.log('✅ Cache cleared! Refresh the page to fetch fresh exchange rates.');
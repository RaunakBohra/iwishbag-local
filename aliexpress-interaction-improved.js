// Updated AliExpress Interaction Code
navigate(input.url);

// Wait for page to load and handle potential redirects
wait('body', {timeout: 15000});

// Wait for main content with fallback selectors
const titleSelectors = [
  'h1[data-pl="product-title"]',
  '.product-title-text',
  'h1.product-name',
  'h1'
];

let titleFound = false;
for (const selector of titleSelectors) {
  try {
    wait(selector, {timeout: 3000});
    titleFound = true;
    break;
  } catch (e) {
    continue;
  }
}

if (!titleFound) {
  throw new Error('Product title not found - page may not have loaded correctly');
}

// Wait for price with multiple selectors
const priceSelectors = [
  '.price-default--current--F8OlYIo',
  '.product-price-current',
  '.notranslate',
  '[data-spm-anchor-id*="price"]'
];

for (const selector of priceSelectors) {
  try {
    wait(selector, {timeout: 2000});
    break;
  } catch (e) {
    continue;
  }
}

// Wait for images with fallback
const imageSelectors = [
  '.magnifier--image--RM17RL2',
  '.product-image img',
  '[class*="main-image"] img'
];

for (const selector of imageSelectors) {
  try {
    wait(selector, {timeout: 3000});
    break;
  } catch (e) {
    continue;
  }
}

// Wait for gallery images
const gallerySelectors = [
  '.slider--img--kD4mIg7 img',
  '[class*="thumb"] img',
  '[class*="gallery"] img'
];

for (const selector of gallerySelectors) {
  try {
    wait(selector, {timeout: 2000});
    break;
  } catch (e) {
    continue;
  }
}

// Wait for store info
const storeSelectors = [
  '.store-info--name--E2VWTyv a',
  '[class*="store"] a',
  '[class*="seller"] a'
];

for (const selector of storeSelectors) {
  try {
    wait(selector, {timeout: 2000});
    break;
  } catch (e) {
    continue;
  }
}

// Wait for specifications and scroll to them
const specSelectors = [
  '.specification--list--GZuXzRX',
  '[class*="spec"]',
  '.product-property-list'
];

for (const selector of specSelectors) {
  try {
    wait(selector, {timeout: 2000});
    scroll_to(selector);
    break;
  } catch (e) {
    continue;
  }
}

// Small delay to ensure all dynamic content loads
wait(1000);

collect(parse());
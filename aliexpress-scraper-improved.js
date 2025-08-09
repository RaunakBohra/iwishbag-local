// Updated AliExpress Product Scraper Parser
function extractNumber(text) {
  if (!text) return null;
  // Handle various number formats including decimals and commas
  const cleanText = text.replace(/[^\d.,]/g, '');
  const match = cleanText.match(/(\d{1,3}(?:[,]\d{3})*(?:\.\d{2})?|\d+\.?\d*)/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : null;
}

function extractCurrency(text) {
  if (!text) return 'USD';
  // Extract currency symbols and codes
  const currencyMatch = text.match(/([A-Z]{3})|(\$|€|£|¥|₹|₦|R\$)/g);
  if (currencyMatch) {
    const currency = currencyMatch[0];
    // Convert symbols to codes
    const symbolMap = {
      '$': 'USD',
      '€': 'EUR', 
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR',
      '₦': 'NGN',
      'R$': 'BRL'
    };
    return symbolMap[currency] || currency;
  }
  return 'USD';
}

function getTextSafely(selector) {
  const element = $(selector);
  return element.length ? element.text().trim() : '';
}

function getAttrSafely(selector, attr) {
  const element = $(selector);
  return element.length ? element.attr(attr) : null;
}

function makeAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://www.aliexpress.us' + url;
  if (url.startsWith('http')) return url;
  return 'https://www.aliexpress.us/' + url;
}

// Main parser function
const url = location.href;
const product_id = url.match(/item\/(\d+)\.html/)?.[1] || url.match(/\/(\d+)\.html/)?.[1] || '';

// Try multiple selectors for title
const title = getTextSafely('h1[data-pl="product-title"]') || 
              getTextSafely('.product-title-text') ||
              getTextSafely('h1.product-name') ||
              getTextSafely('h1') ||
              '';

// Try multiple selectors for current price
const current_price_text = getTextSafely('.price-default--current--F8OlYIo') ||
                          getTextSafely('.product-price-current') ||
                          getTextSafely('.notranslate') ||
                          getTextSafely('[data-spm-anchor-id*="price"]') ||
                          '';

const currency = extractCurrency(current_price_text);
const current_price = current_price_text ? new Money(extractNumber(current_price_text), currency) : null;

// Try multiple selectors for original price
const original_price_text = getTextSafely('._3DRNh span:first-child') ||
                           getTextSafely('.product-price-del') ||
                           getTextSafely('[class*="origin"]') ||
                           '';
const original_price = original_price_text ? new Money(extractNumber(original_price_text), currency) : null;

// Discount percentage
const discount_percentage = getTextSafely('.W__kt') ||
                           getTextSafely('[class*="discount"]') ||
                           getTextSafely('[class*="off"]') ||
                           '';

// Rating and reviews - try multiple selectors
const rating = parseFloat(getTextSafely('.reviewer--rating--xrWWFzx strong') ||
                         getTextSafely('[class*="rating"] strong') ||
                         getTextSafely('.score') ||
                         '') || null;

const review_count = extractNumber(getTextSafely('.reviewer--reviews--cx7Zs_V') ||
                                  getTextSafely('[class*="review"] [class*="count"]') ||
                                  getTextSafely('.review-count') ||
                                  '') || null;

const sold_count = extractNumber(getTextSafely('.reviewer--sold--ytPeoEy') ||
                                getTextSafely('[class*="sold"]') ||
                                getTextSafely('[class*="orders"]') ||
                                '') || null;

// Stock information
const stock_text = getTextSafely('.quantity--info--jnoo_pD') ||
                   getTextSafely('[class*="stock"]') ||
                   getTextSafely('[class*="quantity"]') ||
                   '';
const stock_available = extractNumber(stock_text) || null;

// Images - try multiple selectors
let main_image = getAttrSafely('.magnifier--image--RM17RL2', 'src') ||
                getAttrSafely('.product-image img', 'src') ||
                getAttrSafely('[class*="main-image"] img', 'src') ||
                getAttrSafely('img[class*="product"]', 'src');

main_image = makeAbsoluteUrl(main_image);

// Additional images
const images = [];
$('.slider--img--kD4mIg7 img, [class*="thumb"] img, [class*="gallery"] img').each(function() {
  const src = $(this).attr('src') || $(this).attr('data-src');
  if (src) {
    const absoluteUrl = makeAbsoluteUrl(src);
    if (absoluteUrl && !images.includes(absoluteUrl)) {
      images.push(absoluteUrl);
    }
  }
});

// Store information
const store_name = getTextSafely('.store-info--name--E2VWTyv a') ||
                   getTextSafely('[class*="store"] a') ||
                   getTextSafely('[class*="seller"] a') ||
                   '';

let store_url = getAttrSafely('.store-info--name--E2VWTyv a', 'href') ||
               getAttrSafely('[class*="store"] a', 'href') ||
               getAttrSafely('[class*="seller"] a', 'href');
store_url = makeAbsoluteUrl(store_url);

// Specifications
const specifications = [];
$('.specification--list--GZuXzRX .specification--prop--Jh28bKu, [class*="spec"] [class*="prop"], .product-property-list .property-item').each(function() {
  const name = $(this).find('.specification--title--SfH3sA8, [class*="title"], [class*="name"], dt').text().trim();
  const value = $(this).find('.specification--desc--Dxx6W0W, [class*="desc"], [class*="value"], dd').text().trim();
  if (name && value) {
    specifications.push({ name, value });
  }
});

// Breadcrumb
const breadcrumb = getTextSafely('.cross-link--breadcrumb--yfIP3xx') ||
                   getTextSafely('[class*="breadcrumb"]') ||
                   getTextSafely('.bread-crumb') ||
                   '';

// Additional useful data
const description = getTextSafely('.product-overview .content') ||
                   getTextSafely('[class*="description"]') ||
                   '';

const shipping_info = getTextSafely('[class*="shipping"]') ||
                     getTextSafely('[class*="delivery"]') ||
                     '';

const variants = [];
$('[class*="sku"], [class*="variant"], .product-variation-select').each(function() {
  const variant_name = $(this).find('[class*="title"], label').text().trim();
  const variant_options = [];
  $(this).find('[class*="option"], option, [class*="item"]').each(function() {
    const option_text = $(this).text().trim();
    const option_value = $(this).attr('data-sku-id') || $(this).attr('value') || option_text;
    if (option_text) {
      variant_options.push({
        text: option_text,
        value: option_value,
        available: !$(this).hasClass('disabled')
      });
    }
  });
  if (variant_name && variant_options.length > 0) {
    variants.push({
      name: variant_name,
      options: variant_options
    });
  }
});

return {
  url: new URL(url),
  product_id,
  title,
  current_price,
  original_price,
  discount_percentage,
  currency,
  rating,
  review_count,
  sold_count,
  stock_available,
  main_image: main_image ? new URL(main_image) : null,
  images: images.map(img => new URL(img)),
  store_name,
  store_url: store_url ? new URL(store_url) : null,
  specifications,
  breadcrumb,
  description,
  shipping_info,
  variants,
  scraped_at: new Date().toISOString(),
  source: 'aliexpress'
};
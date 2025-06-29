# ScrapeAPI Integration Setup

This guide explains how to set up and use ScrapeAPI for the auto quote system.

## What is ScrapeAPI?

ScrapeAPI is a web scraping service that provides:
- **Specialized Amazon scraper** - Better data extraction for Amazon products
- **Anti-bot protection** - Bypasses CAPTCHAs and bot detection
- **Structured data** - Returns clean, parsed product information
- **High success rate** - More reliable than generic scraping

## Setup Instructions

### 1. Get ScrapeAPI Key

1. Sign up at [ScrapeAPI.com](https://www.scraperapi.com/)
2. Get your API key from the dashboard
3. Add it to your `.env` file:

```bash
VITE_SCRAPER_API_KEY=your_scraper_api_key_here
```

### 2. Test the Integration

Run the test script to verify everything is working:

```bash
node test-scrapeapi.js
```

This will test:
- ✅ API key configuration
- ✅ Amazon product scraping
- ✅ Data extraction

### 3. How It Works

The system now uses a **dual approach**:

1. **Primary**: ScrapeAPI (better for Amazon, structured data)
2. **Fallback**: Bright Data (for other sites, HTML parsing)

#### For Amazon Products:
- Uses ScrapeAPI's specialized Amazon endpoint
- Extracts ASIN from URL automatically
- Returns structured product data
- Better price, weight, and image extraction

#### For Other Sites:
- Uses ScrapeAPI's general scraping endpoint
- Falls back to Bright Data if needed
- HTML parsing for data extraction

## Supported Websites

### Primary (ScrapeAPI):
- **Amazon** - Specialized scraper with structured data
- **eBay** - General scraping with custom selectors
- **Walmart** - General scraping with custom selectors
- **Target** - General scraping with custom selectors

### Fallback (Bright Data):
- All supported sites as backup

## Data Extraction

ScrapeAPI provides better data extraction for:

### Amazon Products:
- ✅ Product title
- ✅ Current price
- ✅ Original price
- ✅ Product weight
- ✅ Product images
- ✅ Availability status
- ✅ Product category
- ✅ ASIN

### Other Sites:
- ✅ Product title
- ✅ Price
- ✅ Estimated weight
- ✅ Product images
- ✅ Availability

## Testing

### Test URLs to Try:

**Amazon:**
```
https://www.amazon.com/dp/B08N5WRWNW  # Echo Dot
https://www.amazon.com/dp/B08C7KG5LP  # Fire TV Stick
https://www.amazon.com/dp/B07ZPKBL9V  # Kindle
```

**eBay:**
```
https://www.ebay.com/itm/123456789    # Any eBay listing
```

**Walmart:**
```
https://www.walmart.com/ip/123456789  # Any Walmart product
```

## Troubleshooting

### Common Issues:

1. **"ScrapeAPI key not configured"**
   - Check your `.env` file
   - Make sure `VITE_SCRAPER_API_KEY` is set

2. **"Could not extract ASIN from Amazon URL"**
   - Make sure you're using a valid Amazon product URL
   - URL should contain `/dp/` followed by 10 characters

3. **"ScrapeAPI failed, trying Bright Data"**
   - This is normal fallback behavior
   - Check your ScrapeAPI account for usage limits

4. **Poor data quality**
   - Try different product URLs
   - Check if the product page is accessible
   - Some products may have limited data

### Debug Mode:

Enable debug logging by checking the browser console for:
- `🔵 Using ScrapeAPI for amazon.com: https://...`
- `✅ Successfully scraped with ScrapeAPI: Product Name`
- `⚠️ ScrapeAPI failed, trying Bright Data: Error message`

## Cost Optimization

### ScrapeAPI Pricing:
- **Free tier**: 1,000 requests/month
- **Paid plans**: Starting at $29/month for 5,000 requests

### Tips to Reduce Costs:
1. **Cache results** - Don't scrape the same product multiple times
2. **Use fallback** - Bright Data as backup reduces ScrapeAPI usage
3. **Batch requests** - Group multiple products when possible
4. **Monitor usage** - Check your ScrapeAPI dashboard regularly

## Migration from Bright Data

The system automatically:
- ✅ Tries ScrapeAPI first
- ✅ Falls back to Bright Data if needed
- ✅ Maintains backward compatibility
- ✅ No breaking changes to existing functionality

## Next Steps

1. **Test with real products** - Try the auto quote page with Amazon URLs
2. **Monitor performance** - Check success rates and data quality
3. **Optimize rules** - Adjust confidence thresholds based on results
4. **Add more sites** - Extend support for additional e-commerce platforms

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Run the test script: `node test-scrapeapi.js`
3. Verify your ScrapeAPI key is valid
4. Check ScrapeAPI dashboard for usage and errors 
# Cloudflare Images Setup Guide

## 1. Enable Cloudflare Images

1. Go to your Cloudflare Dashboard
2. Select your domain (whyteclub.com)
3. Navigate to **Images** in the sidebar
4. Click **Enable Cloudflare Images**
5. Choose your plan (pay-as-you-go is recommended)

## 2. Get Your Credentials

After enabling Images:

1. Go to **Images > API**
2. Copy your **Account ID** (already have: 610762493d34333f1a6d72a037b345cf)
3. Create an **API Token** with Images permissions:
   - Click "Create Token"
   - Use template "Custom token"
   - Add permissions: Account > Cloudflare Images > Edit
   - Continue to summary and create token
4. Note your **Images Delivery URL** (format: https://imagedelivery.net/YOUR_ACCOUNT_ID)

## 3. Add Environment Variables

Add these to your Cloudflare Pages environment:

```bash
VITE_CLOUDFLARE_ACCOUNT_ID=610762493d34333f1a6d72a037b345cf
VITE_CLOUDFLARE_API_TOKEN=your_api_token_here
VITE_CLOUDFLARE_IMAGES_DELIVERY_URL=https://imagedelivery.net/610762493d34333f1a6d72a037b345cf
```

## 4. Configure Variants

In Cloudflare Dashboard > Images > Variants, ensure these variants exist:
- `thumbnail` (150x150, cover)
- `small` (400x400, contain)
- `medium` (800x800, contain)
- `large` (1200x1200, contain)
- `public` (1600px, scale-down)

## 5. Test the Implementation

### Test Upload Component
```tsx
import { CloudflareImageUpload } from '@/components/images/CloudflareImageUpload';

function TestUpload() {
  const handleUpload = (imageId: string, variants: Record<string, string>) => {
    console.log('Uploaded:', imageId, variants);
  };

  return (
    <CloudflareImageUpload
      onUpload={handleUpload}
      maxFiles={5}
      metadata={{ source: 'product-gallery' }}
    />
  );
}
```

### Test Image Display
```tsx
import { CloudflareImage, ProductImage } from '@/components/images/CloudflareImage';

function TestDisplay() {
  return (
    <>
      {/* Basic image */}
      <CloudflareImage
        imageId="your-image-id"
        alt="Product image"
        variant="medium"
      />

      {/* Product image with zoom */}
      <ProductImage
        imageId="your-image-id"
        alt="Product"
        showZoom={true}
      />
    </>
  );
}
```

## 6. Usage in Product Forms

Replace existing image uploads with Cloudflare Images:

```tsx
// In quote creation/product forms
const [productImages, setProductImages] = useState<string[]>([]);

<CloudflareImageUpload
  onUpload={(imageId) => {
    setProductImages([...productImages, imageId]);
  }}
  maxFiles={10}
  metadata={{
    quote_id: quoteId,
    product_name: productName,
  }}
/>

// Display uploaded images
{productImages.map(imageId => (
  <CloudflareImage
    key={imageId}
    imageId={imageId}
    alt="Product"
    variant="small"
  />
))}
```

## 7. Benefits

- **Automatic optimization**: WebP/AVIF conversion
- **Global CDN**: 300+ edge locations
- **Responsive images**: Multiple sizes generated
- **Polish & Mirage**: Further optimization
- **Bandwidth savings**: Up to 80% reduction
- **Fast loading**: <50ms from nearest edge

## 8. Monitoring

Track usage in Cloudflare Dashboard:
- Images > Analytics
- View stored images, transformations, bandwidth
- Set up alerts for usage thresholds

## 9. Cost Estimation

- **Storage**: $5.00 per 100,000 images
- **Delivery**: $1.00 per 100,000 delivered images
- **Example**: 10,000 images with 1M views/month ≈ $10.50/month

## 10. Migration from Existing Images

To migrate existing Supabase storage images:

1. Create migration script using `uploadImage(url)` method
2. Update database references to store Cloudflare image IDs
3. Gradually replace old image URLs with new ones
4. Delete old images after verification
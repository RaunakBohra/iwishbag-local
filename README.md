# Global Wishlist Hub

A comprehensive e-commerce platform with advanced features for managing global wishlists and orders.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your environment variables
4. Start the development server: `npm run dev`
5. Navigate to `http://localhost:8082` to view the application

## Features

- Advanced e-commerce functionality
- Real-time analytics and reporting
- Admin dashboard with comprehensive management tools
- Customer management and order processing
- Quote management and approval workflows
- Multi-currency support
- Bank transfer and cash on delivery payment options
- Responsive design with modern UI
- And much more...

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui
- Supabase (Backend & Database)
- React Query (Data fetching)
- React Router (Navigation)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── contexts/      # React contexts
├── lib/           # Utility functions and configurations
├── types/         # TypeScript type definitions
└── config/        # Configuration files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Important Development Notes

### Dual Currency Display Requirement
When working with admin quotes and orders, ensure that cost breakdowns display in both purchase currency and user's preferred currency. See `DUAL_CURRENCY_DISPLAY_REQUIREMENT.md` for detailed implementation guidelines.

**Key Requirement:** Always include user profile information when fetching quotes/orders for admin display:
```typescript
.select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
```

## Delivery Options: How Purchase and Shipping Country Are Determined

The Delivery Options section displays the shipping route as `ORIGIN → DESTINATION` using `shippingRoute.origin_country` and `shippingRoute.destination_country`.

- If `quote.shipping_route_id` is present, the route is fetched from the database and its `origin_country` and `destination_country` are used.
- If not, the system falls back to:
  - `quote.origin_country` or `quote.country_code` (or `'US'` if not set) for the origin (purchase country)
  - `shippingAddress.country` for the destination (shipping country)

This logic is important for both displaying the route and calculating available delivery options.

## Status Badge System (Admin Quote/Order UI)

### Overview
- Status badges for quotes and orders are rendered using the `StatusBadge` component (`src/components/dashboard/StatusBadge.tsx`).
- This component ensures consistent display of status label, color, and icon across both the quote list and the quote detail page.
- Status configuration (label, color, icon, etc.) is managed via the status management system (`useStatusManagement` hook).

### How it Works
- The `StatusBadge` component takes a `status` string and (optionally) a `showIcon` prop (default: true).
- It looks up the status config (label, color, icon) from the status management system.
- If the status is not found, it falls back to a generic badge with the status name.
- The badge uses the same color and icon as defined in the config, ensuring visual consistency.

### Where to Use
- **Quote List:** Use `<StatusBadge status={quote.status} />` in list items (e.g., `AdminQuoteListItem`).
- **Quote Detail Page:** Use `<StatusBadge status={quote.status} showIcon />` in the header (e.g., `AdminQuoteDetailPage`).
- **Order List/Detail:** Use the same component for order statuses.

### How to Update/Extend
- To add or change a status, update the status config in the database or in the `useStatusManagement` hook's defaults.
- To change the appearance (icon, color, label), update the config for that status.
- If you want to show/hide the icon, use the `showIcon` prop on `StatusBadge`.
- Always use `StatusBadge` for status display to ensure consistency.

### Why This Matters
- This approach prevents UI drift and ensures that any change to status logic or appearance is reflected everywhere in the admin UI.
- Future developers should always use the shared `StatusBadge` component and never hardcode status badges or icons in individual pages.

## Priority Calculation System

### Overview
The priority calculation system automatically assigns priority levels to quotes based on the final total amount and country-specific thresholds. This helps admins quickly identify high-value orders that may need special attention.

### How It Works

#### 1. Priority Levels
- **Low**: Standard priority for regular orders
- **Normal**: Medium priority for moderate-value orders  
- **Urgent**: High priority for high-value orders requiring immediate attention

#### 2. Country-Specific Thresholds
Each country has configurable priority thresholds in their local currency:

```json
{
  "low": 0,
  "normal": 500,      // Amount threshold for normal priority
  "urgent": 2000      // Amount threshold for urgent priority
}
```

**Example thresholds by country:**
- **US (USD)**: Low: $0, Normal: $500, Urgent: $2,000
- **India (INR)**: Low: ₹0, Normal: ₹41,500, Urgent: ₹166,000
- **Nepal (NPR)**: Low: ₨0, Normal: ₨66,500, Urgent: ₨266,000
- **Japan (JPY)**: Low: ¥0, Normal: ¥75,000, Urgent: ¥300,000

#### 3. Calculation Logic
When the calculate button is pressed on a quote:

```typescript
// Priority calculation logic (src/hooks/useAdminQuoteDetail.ts)
const country = allCountries?.find(c => c.code === quote.country_code);
const thresholds = country?.priority_thresholds || { low: 0, normal: 500, urgent: 2000 };
const finalTotal = finalQuoteData.final_total || 0;

let priority;
if (finalTotal < thresholds.normal) {
    priority = 'low';
} else if (finalTotal < thresholds.urgent) {
    priority = 'normal';
} else {
    priority = 'urgent';
}
```

#### 4. Automatic Updates
- **Always recalculated**: Priority is automatically recalculated every time the calculate button is pressed
- **Form synchronization**: The priority field in the admin form is automatically updated
- **Database update**: The quote record is updated with the new priority
- **Debug logging**: Console logs show the calculation details for debugging

### Configuration

#### Setting Priority Thresholds
1. Go to **Admin → Country Settings**
2. Edit a country
3. Set the priority thresholds in the country's main currency
4. Save the changes

#### Database Schema
Priority thresholds are stored in the `country_settings` table:

```sql
ALTER TABLE country_settings 
ADD COLUMN priority_thresholds JSONB DEFAULT '{"low":0,"normal":500,"urgent":2000}';
```

### Usage in Admin Interface

#### Quote List View
- Priority badges are displayed next to each quote
- Color coding: Low (outline), Normal (secondary), Urgent (destructive)
- Quick visual identification of high-priority quotes

#### Quote Detail Page
- Priority field shows current priority level
- Automatically updates when calculate button is pressed
- Can be manually overridden if needed

### Debugging

#### Console Logs
When priority is calculated, debug information is logged:

```javascript
console.log('[Priority Calculation]', {
    countryCode: quote.country_code,
    countryName: country?.name,
    thresholds,
    finalTotal,
    calculatedPriority: priority,
    previousPriority: data.priority
});
```

#### Common Issues
1. **Priority not updating**: Check if country has priority thresholds configured
2. **Wrong currency**: Ensure thresholds are in the country's main currency
3. **Calculation errors**: Verify the final total is being calculated correctly

### Testing

#### Manual Testing
1. Create a quote with items totaling different amounts
2. Press the calculate button
3. Verify the priority updates correctly based on thresholds
4. Check console logs for calculation details

#### Automated Testing
Use the priority calculation test script to verify logic:

```javascript
// Test cases for different amounts and countries
const testCases = [
    { countryCode: 'US', amount: 100, expected: 'low' },
    { countryCode: 'US', amount: 750, expected: 'normal' },
    { countryCode: 'US', amount: 2500, expected: 'urgent' }
];
```

### Future Development

#### Adding New Countries
1. Add country to `country_settings` table
2. Set appropriate priority thresholds in local currency
3. Test with sample quotes

#### Modifying Priority Logic
- Update the calculation logic in `src/hooks/useAdminQuoteDetail.ts`
- Ensure the logic always recalculates priority (don't add conditions that skip calculation)
- Add appropriate debug logging
- Update tests to cover new scenarios

#### Priority Display
- Use the existing priority badge system for consistent UI
- Priority badges are rendered using the same component across the admin interface
- Colors and styling are defined in the badge component

### Important Notes
- **Always recalculate**: The system is designed to always recalculate priority when calculate is pressed
- **Currency conversion**: Thresholds are in the country's local currency, not USD
- **Fallback values**: If country thresholds are not set, defaults are used (low: 0, normal: 500, urgent: 2000)
- **Manual override**: Admins can manually change priority after calculation if needed
- **Consistent display**: Always use the shared priority badge component for consistent UI
- **Initial status**: All quotes created by users are automatically set to "pending" status
- **Status preservation**: Calculate button does not change quote status - it only updates calculations
- **Status progression**: Update button changes status from "pending" to "sent", but preserves other statuses

### Quote Status Workflow

#### Status Flow
1. **User submits quote** → status = "pending"
2. **Admin calculates quote** → status stays "pending" (no change)
3. **Admin presses "Update"** → status changes from "pending" to "sent"
4. **Admin calculates again** → status stays "sent" (no change)
5. **Admin presses "Update" again** → status stays "sent" (no change)

#### Key Behaviors
- **Calculate Button**: Only updates calculations and priority - never changes status
- **Update Button**: 
  - If status is "pending" → changes to "sent"
  - If status is anything else → preserves current status
- **Status Transitions**: Follow the configured status workflow rules

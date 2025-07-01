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


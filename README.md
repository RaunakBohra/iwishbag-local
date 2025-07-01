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


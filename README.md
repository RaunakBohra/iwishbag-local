# Global Wishlist Hub

A comprehensive e-commerce platform with advanced features for managing global wishlists and orders.

## 🚀 Quick Start

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd iwishBag-new
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your Supabase credentials
   ```

3. **Start Development**
   ```bash
   npm run dev
   # Frontend: http://localhost:8082
   # Supabase Functions: http://localhost:54321
   ```

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (Database + Edge Functions)
- **State Management**: Zustand + React Query
- **Routing**: React Router

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript checking |

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── admin/     # Admin-specific components
│   ├── cart/      # Cart functionality
│   ├── dashboard/ # Dashboard components
│   └── ui/        # Base UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── contexts/      # React contexts
├── lib/           # Utility functions
├── stores/        # State management
└── types/         # TypeScript definitions
```

## 🎯 Core Features

### **E-commerce Platform**
- ✅ **Quote Management**: Multi-step quote creation and approval
- ✅ **Order Processing**: Automated quote-to-order transitions
- ✅ **Payment Integration**: Stripe, COD, Bank Transfer support
- ✅ **Multi-currency**: Dynamic currency conversion and display
- ✅ **Cart System**: Reactive cart with persistence and loading states

### **Admin Dashboard**
- ✅ **Quote Management**: Status tracking, priority calculation
- ✅ **Order Management**: Shipping, delivery tracking
- ✅ **Analytics**: Real-time metrics and reporting
- ✅ **Customer Management**: User profiles and communication

### **User Experience**
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **Real-time Updates**: Instant UI feedback
- ✅ **Progressive Enhancement**: Graceful degradation
- ✅ **Accessibility**: WCAG compliant components

## 🔧 Key Systems

### **Cart System** 🛒

#### **Reactive Cart Management**
- **Instant Updates**: All pages update immediately when cart changes
- **Cross-page Sync**: Cart state consistent across all pages
- **No Page Refresh**: Users see instant feedback

#### **Cart Persistence**
- **Per-user Storage**: Isolated cart data per user
- **localStorage Sync**: Automatic persistence across sessions
- **Server Loading**: Robust loading states prevent "no products" errors

#### **Implementation Pattern**
```typescript
// Required for all cart-dependent pages
const { items: cartItems, isLoading, hasLoadedFromServer, loadFromServer } = useCart();

useEffect(() => {
  if (user && !isLoading && !hasLoadedFromServer) {
    loadFromServer(user.id);
  }
}, [user, loadFromServer, isLoading, hasLoadedFromServer]);
```

### **Quote Management** 📋

#### **Quote Status Workflow**
1. **User submits** → `pending`
2. **Admin calculates** → `pending` (no change)
3. **Admin updates** → `pending` → `sent`
4. **User approves** → `approved`
5. **Payment received** → `paid` (moves to Orders)

#### **Priority Calculation**
- **Automatic**: Based on final total and country thresholds
- **Country-specific**: Configurable thresholds per currency
- **Visual Indicators**: Color-coded priority badges

#### **Quote Types**
- **Combined Quotes**: All products from same country (better rates)
- **Separate Quotes**: Individual quotes per product (maximum flexibility)

### **Payment System** 💳

#### **Supported Methods**
- **Stripe**: Credit/debit cards with webhook processing
- **Cash on Delivery**: Manual payment confirmation
- **Bank Transfer**: Manual payment confirmation

#### **Quote-to-Order Transition**
- **Automatic**: When payment received, quote becomes order
- **Page Separation**: Orders never appear on Quotes page
- **Status Tracking**: Complete order lifecycle management

### **Shipping & Delivery** 📦

#### **Route Display Logic**
- **Smart Detection**: Uses shipping_route_id or falls back to quote data
- **Consistent Display**: Shared utilities ensure accuracy
- **Origin/Destination**: Clear route visualization

#### **Delivery Options**
- **Country-specific**: Available options per shipping route
- **Cost Calculation**: Real-time shipping cost estimation
- **Timeline Estimates**: Expected delivery dates

## 🎨 UI/UX Systems

### **Status Badge System**
```typescript
// Consistent status display across all admin pages
<StatusBadge status={quote.status} category="quote" showIcon />
```

### **Multi-currency Display**
```typescript
// Always include user profile for admin displays
.select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
```

### **Responsive Design**
- **Mobile-first**: Optimized for mobile devices
- **Progressive Enhancement**: Works without JavaScript
- **Accessibility**: WCAG 2.1 AA compliant

## 🔄 Recent Improvements

### **Cart System Cleanup** (Latest)
- ✅ **Removed unused components**: `useCartMutations.ts`, `CartItem.tsx`
- ✅ **Simplified cart logic**: Removed unused grid view functionality
- ✅ **Updated bulk actions**: Now uses unified cart store
- ✅ **Reduced bundle size**: ~450 lines of unused code removed

### **Checkout Page Redesign**
- ✅ **Single-page layout**: Shopify-style checkout experience
- ✅ **Removed customer info**: Focus on shipping and payment
- ✅ **Better UX**: Cleaner, more focused checkout flow
- ✅ **Fixed JavaScript errors**: Resolved duplicate variable declarations

### **Quote Request Flow**
- ✅ **Product review**: Users can review before submission
- ✅ **Edit functionality**: Go back and fix mistakes
- ✅ **Progress indicators**: Clear 2-step process
- ✅ **Response time**: Clear expectations (24-48 hours)

## 🚨 Critical Development Notes

### **Cart Loading Requirements**
**IMPORTANT**: All cart-dependent pages MUST include server loading logic:

```typescript
// Required pattern for cart pages
const { items: cartItems, isLoading, hasLoadedFromServer, loadFromServer } = useCart();

useEffect(() => {
  if (user && !isLoading && !hasLoadedFromServer) {
    loadFromServer(user.id);
  }
}, [user, loadFromServer, isLoading, hasLoadedFromServer]);

// Handle loading states
if (cartLoading) {
  return <LoadingSpinner />;
}
```

### **Quote Expiration System**
- **7-day default**: Configurable via `autoExpireHours` setting
- **Based on 'sent' time**: Never resets on approval
- **Automatic enforcement**: Database trigger + Edge Function
- **UI indicators**: Countdown timer and expiry badges

### **Status Management**
- **Use StatusBadge component**: Never hardcode status display
- **Category-based**: 'quote' vs 'order' categories
- **Consistent styling**: Colors and icons from config

## 🐛 Troubleshooting

### **Common Cart Issues**
1. **"No products" error**: Missing server loading logic
2. **Button not updating**: Not subscribed to cart store
3. **Inconsistent state**: Different quoteId formats

### **Quote Issues**
1. **Priority not updating**: Check country thresholds
2. **Status not changing**: Verify workflow rules
3. **Expiration wrong**: Check `expires_at` field usage

### **Payment Issues**
1. **Webhook not working**: Check Stripe configuration
2. **Order not appearing**: Verify status transitions
3. **Manual payment**: Use Orders page for confirmation

## 📚 Documentation

For comprehensive documentation, see the [docs/](docs/) directory:

- **[📖 Documentation Index](docs/README.md)** - Complete documentation overview
- **[🏗️ Architecture Overview](docs/technical/ARCHITECTURE_OVERVIEW.md)** - System design and architecture
- **[🚀 Development Guide](docs/guides/DEVELOPMENT_GUIDE.md)** - Getting started for developers
- **[💳 Payment Setup](docs/guides/PAYMENT_SETUP.md)** - Stripe and payment configuration
- **[🚀 Payment Enhancement Plan](docs/technical/PAYMENT_ENHANCEMENT_PLAN.md)** - Advanced payment features roadmap
- **[⚡ Payment Quick Start](docs/guides/PAYMENT_QUICK_START.md)** - High-impact payment improvements
- **[🧪 PayU Testing Guide](docs/guides/PAYU_TESTING_GUIDE.md)** - Comprehensive PayU integration testing
- **[🔧 Status Management](docs/technical/STATUS_SYSTEM.md)** - Quote/order status workflow

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Follow** the coding standards
4. **Test** thoroughly
5. **Submit** a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Need Help?** Check the troubleshooting section or create an issue with detailed information about your problem.

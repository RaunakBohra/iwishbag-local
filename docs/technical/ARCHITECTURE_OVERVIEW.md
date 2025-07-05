# System Architecture Overview

## 🏗️ High-Level Architecture

The Global Wishlist Hub is built as a modern e-commerce platform with the following architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Supabase Backend│    │  External APIs  │
│                 │    │                 │    │                 │
│ • TypeScript    │◄──►│ • PostgreSQL    │◄──►│ • Stripe        │
│ • Vite          │    │ • Edge Functions│    │ • ScrapeAPI     │
│ • Tailwind CSS  │    │ • Real-time     │    │ • Email Service │
│ • Zustand Store │    │ • Auth          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Core Systems

### **1. Cart System** 🛒
- **State Management**: Zustand store with localStorage persistence
- **Reactive Updates**: All components subscribe to cart changes
- **Server Sync**: Automatic loading from database on user login
- **Cross-page Consistency**: Cart state maintained across all pages

### **2. Quote Management** 📋
- **Status Workflow**: Configuration-driven status transitions
- **Priority Calculation**: Automatic priority based on total and country
- **Expiration System**: Configurable expiration with automated cleanup
- **Multi-currency**: Dynamic currency conversion and display

### **3. Payment Integration** 💳
- **Multiple Methods**: Stripe, Cash on Delivery, Bank Transfer
- **Webhook Processing**: Automatic order creation on payment
- **Quote-to-Order**: Seamless transition from quote to order
- **Status Tracking**: Complete payment lifecycle management

### **4. Admin Dashboard** 👨‍💼
- **Real-time Analytics**: Live metrics and reporting
- **Bulk Operations**: Mass quote/order management
- **Customer Management**: User profiles and communication
- **Status Management**: Visual status configuration

## 📊 Database Schema

### **Core Tables**
```sql
-- User management
profiles (id, email, preferred_display_currency, ...)
addresses (id, user_id, type, country_code, ...)

-- Quote system
quotes (id, user_id, status, total, currency, expires_at, ...)
quote_items (id, quote_id, product_url, price, weight, ...)

-- Order system
orders (id, quote_id, payment_method, status, ...)

-- Configuration
system_settings (setting_key, setting_value, ...)
country_settings (country_code, currency, thresholds, ...)
```

### **Key Relationships**
- **Quotes** → **Quote Items** (one-to-many)
- **Quotes** → **Orders** (one-to-one, when paid)
- **Profiles** → **Addresses** (one-to-many)
- **System Settings** → **Status Configuration** (JSON)

## 🔄 Data Flow

### **Quote Creation Flow**
```
1. User submits quote request
   ↓
2. Quote created with 'pending' status
   ↓
3. Admin reviews and calculates
   ↓
4. Status changed to 'sent' (triggers email)
   ↓
5. User approves quote
   ↓
6. Status changed to 'approved' (enables payment)
   ↓
7. User makes payment
   ↓
8. Quote becomes order (moves to Orders page)
```

### **Cart Synchronization Flow**
```
1. User adds item to cart
   ↓
2. Zustand store updates immediately
   ↓
3. localStorage persists changes
   ↓
4. Server sync on page load
   ↓
5. All components re-render with new state
```

## 🎨 UI/UX Architecture

### **Component Hierarchy**
```
App
├── Layout
│   ├── Header (Navigation, Cart Icon)
│   ├── Main Content
│   └── Footer
├── Pages
│   ├── Home (Landing)
│   ├── Quote Request (Multi-step form)
│   ├── Dashboard (User quotes/orders)
│   ├── Checkout (Single-page)
│   └── Admin (Management interface)
└── Components
    ├── Cart (Drawer, Items, Actions)
    ├── Quote (Cards, Status, Actions)
    ├── Forms (Validation, Submission)
    └── UI (Buttons, Cards, Modals)
```

### **State Management**
- **Zustand**: Global cart and user state
- **React Query**: Server state and caching
- **Context**: Theme, auth, and status configuration
- **Local State**: Component-specific state

## 🔐 Security & Performance

### **Security Measures**
- **Row Level Security**: Database-level access control
- **JWT Authentication**: Secure user sessions
- **Input Validation**: Client and server-side validation
- **CORS Configuration**: Proper cross-origin handling

### **Performance Optimizations**
- **Code Splitting**: Lazy-loaded components
- **Image Optimization**: WebP format with fallbacks
- **Caching Strategy**: React Query for server state
- **Bundle Optimization**: Tree shaking and minification

## 🚀 Deployment Architecture

### **Frontend**
- **Platform**: Vercel (automatic deployments)
- **CDN**: Global content delivery
- **Environment**: Production/Staging separation

### **Backend**
- **Database**: Supabase PostgreSQL
- **Functions**: Edge Functions for serverless
- **Real-time**: WebSocket connections
- **Storage**: File uploads and media

### **External Services**
- **Payments**: Stripe (webhook processing)
- **Email**: Supabase Edge Functions
- **Scraping**: ScrapeAPI integration
- **Monitoring**: Error tracking and analytics

## 🔧 Development Workflow

### **Code Organization**
```
src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── hooks/         # Custom React hooks
├── contexts/      # React contexts
├── lib/           # Utility functions
├── stores/        # State management
└── types/         # TypeScript definitions
```

### **Testing Strategy**
- **Unit Tests**: Component and hook testing
- **Integration Tests**: API and database testing
- **E2E Tests**: User workflow testing
- **Performance Tests**: Load and stress testing

## 📈 Scalability Considerations

### **Database Scaling**
- **Indexing**: Optimized queries with proper indexes
- **Partitioning**: Large tables partitioned by date
- **Caching**: Redis for frequently accessed data
- **Read Replicas**: Separate read/write operations

### **Application Scaling**
- **Microservices**: Separate concerns into services
- **CDN**: Global content distribution
- **Load Balancing**: Multiple server instances
- **Monitoring**: Real-time performance tracking

---

**Last Updated**: January 2025  
**Architecture Version**: 2.0.0  
**Maintainer**: Development Team 
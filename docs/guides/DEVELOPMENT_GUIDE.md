# Development Guide

Welcome to the Global Wishlist Hub development team! This guide will help you get started and understand our development practices.

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Git
- Supabase CLI (optional)

### **Setup Steps**
```bash
# 1. Clone the repository
git clone <repository-url>
cd iwishBag-new

# 2. Install dependencies
npm install

# 3. Set up environment
cp env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm run dev
```

## 🏗️ Project Structure

```
iwishBag-new/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── admin/     # Admin-specific components
│   │   ├── cart/      # Cart functionality
│   │   ├── dashboard/ # Dashboard components
│   │   └── ui/        # Base UI components
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   ├── contexts/      # React contexts
│   ├── lib/           # Utility functions
│   ├── stores/        # State management
│   └── types/         # TypeScript definitions
├── docs/              # Documentation
├── supabase/          # Database and functions
└── public/            # Static assets
```

## 🎯 Development Workflow

### **1. Feature Development**
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

### **2. Code Standards**
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Standard commit messages

### **3. Testing**
```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build
```

## 🔧 Key Systems

### **Cart System**
The cart uses Zustand for state management with localStorage persistence:

```typescript
// Required pattern for cart pages
const { items: cartItems, isLoading, hasLoadedFromServer, loadFromServer } = useCart();

useEffect(() => {
  if (user && !isLoading && !hasLoadedFromServer) {
    loadFromServer(user.id);
  }
}, [user, loadFromServer, isLoading, hasLoadedFromServer]);
```

### **Status Management**
Status configuration is stored in the database and managed through the admin interface:

```typescript
// Get status configuration
const { getStatusConfig } = useStatusManagement();
const statusConfig = getStatusConfig(quote.status, 'quote');

// Check if quote can be paid
if (statusConfig.canBePaid) {
  // Show payment button
}
```

### **Database Operations**
Use React Query for all database operations:

```typescript
// Example: Fetch quotes
const { data: quotes, isLoading } = useQuery({
  queryKey: ['quotes', userId],
  queryFn: () => fetchQuotes(userId),
  enabled: !!userId
});
```

## 🎨 UI/UX Guidelines

### **Component Design**
- **Mobile-first**: All components must work on mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Consistent styling**: Use shadcn/ui components
- **Loading states**: Always show loading indicators

### **Color Scheme**
- **Primary**: Brand colors for CTAs
- **Secondary**: Supporting actions
- **Success**: Green for positive actions
- **Warning**: Yellow for caution
- **Error**: Red for errors

### **Typography**
- **Headings**: Inter font family
- **Body**: System font stack
- **Code**: Monospace for technical content

## 🔐 Security Best Practices

### **Authentication**
- Always check user authentication
- Use Row Level Security (RLS)
- Validate user permissions

### **Data Validation**
- Client-side validation for UX
- Server-side validation for security
- Sanitize all user inputs

### **API Security**
- Use HTTPS in production
- Implement rate limiting
- Validate webhook signatures

## 📊 Performance Guidelines

### **Code Splitting**
```typescript
// Lazy load components
const AdminDashboard = lazy(() => import('./AdminDashboard'));
```

### **Image Optimization**
```typescript
// Use optimized images
<img src="/optimized-image.webp" alt="Description" />
```

### **Caching Strategy**
- React Query for server state
- localStorage for user preferences
- CDN for static assets

## 🐛 Debugging

### **Common Issues**

#### **Cart Not Updating**
1. Check if component subscribes to cart store
2. Verify server loading logic
3. Check localStorage persistence

#### **Status Not Changing**
1. Verify status configuration
2. Check database permissions
3. Review status transition rules

#### **Payment Issues**
1. Check Stripe configuration
2. Verify webhook setup
3. Review order creation logic

### **Debug Tools**
- **React DevTools**: Component inspection
- **Redux DevTools**: State debugging
- **Network Tab**: API calls
- **Console**: Error logging

## 📚 Learning Resources

### **Documentation**
- [Architecture Overview](technical/ARCHITECTURE_OVERVIEW.md)
- [Status Management](technical/STATUS_SYSTEM.md)
- [Cart System](technical/CART_CHECKOUT_SYNC_FIX.md)

### **External Resources**
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Team Collaboration

### **Code Reviews**
- Review all PRs before merging
- Test functionality thoroughly
- Check for security issues
- Ensure documentation updates

### **Communication**
- Use GitHub Issues for bugs
- Create feature requests
- Update documentation
- Share knowledge in team meetings

### **Deployment**
- Test in staging environment
- Monitor production metrics
- Rollback plan for issues
- Regular security updates

## 🎯 Next Steps

1. **Read the documentation**: Start with [Architecture Overview](technical/ARCHITECTURE_OVERVIEW.md)
2. **Set up your environment**: Follow the quick start guide
3. **Explore the codebase**: Understand the component structure
4. **Pick a small task**: Start with a bug fix or small feature
5. **Ask questions**: Don't hesitate to ask for help

---

**Welcome to the team!** 🚀

**Last Updated**: January 2025  
**Guide Version**: 1.0.0  
**Maintainer**: Development Team 
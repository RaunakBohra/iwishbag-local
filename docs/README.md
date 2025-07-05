# Global Wishlist Hub - Documentation

Welcome to the comprehensive documentation for the Global Wishlist Hub e-commerce platform.

## 📚 Documentation Structure

### **🚀 Getting Started**
- [Main README](../README.md) - Project overview, quick start, and core features
- [Environment Setup](../env.example) - Configuration template

### **📖 Guides**
*User guides and tutorials for common tasks*

- [Payment Setup](guides/PAYMENT_SETUP.md) - Stripe, COD, and Bank Transfer configuration
- [Webhook Setup](guides/WEBHOOK_SETUP.md) - Payment webhook configuration
- [ScrapeAPI Setup](guides/SCRAPEAPI_SETUP.md) - Product scraping integration
- [Customer Page Enhancement](guides/CUSTOMER_PAGE_ENHANCEMENT_PLAN.md) - UX improvements

### **🔧 Technical Documentation**
*Deep technical details and system architecture*

#### **Core Systems**
- [Status Management System](technical/STATUS_SYSTEM.md) - Status workflow and configuration
- [Enhanced Status System](technical/ENHANCED_STATUS_SYSTEM_SUMMARY.md) - Advanced status management
- [Status Management Demo](technical/STATUS_MANAGEMENT_DEMO.md) - User interface guide
- [Status Save Fix](technical/STATUS_SAVE_FIX_SUMMARY.md) - Database persistence solution

#### **Cart & Checkout**
- [Cart Checkout Sync Fix](technical/CART_CHECKOUT_SYNC_FIX.md) - Cart synchronization solution
- [Cart NaN Issue Fix](technical/CART_NAN_ISSUE_FIX.md) - Number handling improvements
- [Cart Save Move Issue Fix](technical/CART_SAVE_MOVE_ISSUE_FIX.md) - Cart persistence fixes
- [Cart Sync Test Plan](technical/CART_SYNC_TEST_PLAN.md) - Testing methodology

#### **System Architecture**
- [Dual Currency Display](technical/DUAL_CURRENCY_DISPLAY_REQUIREMENT.md) - Multi-currency implementation
- [Weight Unit System](technical/WEIGHT_UNIT_SYSTEM.md) - Shipping weight calculations
- [Technical Debt Cleanup](technical/TECHNICAL_DEBT_CLEANUP_PLAN.md) - Code organization strategy

### **🚀 Deployment**
*Production deployment and maintenance*

- [Expiration Cron Setup](deployment/setup-expiration-cron.md) - Automated quote expiration

## 🎯 Quick Navigation

### **For Developers**
1. Start with [Main README](../README.md)
2. Review [Technical Documentation](technical/) for system architecture
3. Check [Guides](guides/) for specific setup instructions

### **For Administrators**
1. Read [Status Management Demo](technical/STATUS_MANAGEMENT_DEMO.md)
2. Configure [Payment Setup](guides/PAYMENT_SETUP.md)
3. Set up [Webhook Configuration](guides/WEBHOOK_SETUP.md)

### **For Users**
1. Review [Main README](../README.md) for feature overview
2. Check [Customer Page Enhancement](guides/CUSTOMER_PAGE_ENHANCEMENT_PLAN.md) for UX details

## 📋 Documentation Standards

### **File Naming**
- Use `UPPER_SNAKE_CASE.md` for feature-specific docs
- Use descriptive names that indicate content
- Group related functionality together

### **Content Structure**
- Start with a clear title and purpose
- Include problem/solution format for fixes
- Provide code examples where relevant
- End with testing/verification steps

### **Maintenance**
- Update docs when features change
- Link related documentation
- Keep technical debt docs updated
- Archive obsolete documentation

## 🔗 Related Resources

- **GitHub Issues**: For bug reports and feature requests
- **Supabase Dashboard**: For database management
- **Stripe Dashboard**: For payment configuration
- **Vercel Dashboard**: For deployment management

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team 
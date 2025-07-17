# Lighthouse CI Integration Guide

## Overview
This document provides comprehensive guidance for the Lighthouse CI integration implemented for iwishBag's automated performance testing. The integration enforces performance budgets and monitors Core Web Vitals compliance in our CI/CD pipeline.

## Integration Components

### 1. Lighthouse CI Package Installation
- **@lhci/cli**: Command-line interface for Lighthouse CI
- **@lhci/utils**: Utility functions for Lighthouse CI operations

### 2. Configuration Files
- **`lighthouserc.json`**: Desktop performance testing configuration
- **`lighthouserc.mobile.json`**: Mobile performance testing configuration
- **`.github/workflows/lighthouse-ci.yml`**: GitHub Actions workflow

### 3. NPM Scripts
```json
{
  "lighthouse:ci": "lhci autorun",
  "lighthouse:collect": "lhci collect", 
  "lighthouse:assert": "lhci assert",
  "lighthouse:mobile": "lhci autorun --config=lighthouserc.mobile.json",
  "performance:test": "npm run build && npm run lighthouse:ci",
  "performance:mobile": "npm run build && npm run lighthouse:mobile",
  "performance:full": "npm run build && npm run lighthouse:ci && npm run lighthouse:mobile"
}
```

## Performance Budget Configuration

### Desktop Performance Targets
- **Performance Score**: ≥ 85%
- **Accessibility Score**: ≥ 95%
- **Best Practices Score**: ≥ 90%
- **SEO Score**: ≥ 90%

### Core Web Vitals (Desktop)
- **First Contentful Paint (FCP)**: ≤ 1.5s
- **Largest Contentful Paint (LCP)**: ≤ 2.5s
- **Total Blocking Time (TBT)**: ≤ 200ms
- **Cumulative Layout Shift (CLS)**: ≤ 0.1
- **Speed Index**: ≤ 2.0s
- **Time to Interactive (TTI)**: ≤ 3.0s

### Mobile Performance Targets
- **Performance Score**: ≥ 75% (more lenient for mobile)
- **Core Web Vitals (Mobile)**:
  - **FCP**: ≤ 2.0s
  - **LCP**: ≤ 4.0s
  - **TBT**: ≤ 300ms
  - **TTI**: ≤ 5.0s

## Tested URLs
The Lighthouse CI tests critical user journeys:
1. **Homepage** (`/`) - Landing page performance
2. **Quote Request** (`/quote-request`) - Core conversion flow
3. **Dashboard** (`/dashboard`) - User portal performance
4. **Checkout** (`/checkout`) - Payment flow performance (desktop only)

## GitHub Actions Integration

### Workflow Triggers
- **Push to main**: Full performance monitoring
- **Pull Requests**: Performance impact assessment
- **Manual Dispatch**: On-demand testing

### Workflow Features
- **Automated build**: Creates optimized production build
- **Performance testing**: Runs Lighthouse CI with budget enforcement
- **Artifact storage**: Saves detailed reports (30-day retention)
- **Failure notifications**: Clear feedback on budget violations
- **Success summaries**: Performance metrics confirmation

### Workflow Output Examples

#### Success Output
```
✅ All performance budgets met!
🚀 Core Web Vitals within targets:
  • LCP < 2.5s
  • INP < 200ms  
  • CLS < 0.1
📈 Performance score ≥ 85%
♿ Accessibility score ≥ 95%
🎯 Best practices score ≥ 90%
🔍 SEO score ≥ 90%
```

#### Failure Output
```
❌ Performance budget exceeded!
🔍 Key areas to investigate:
  • Core Web Vitals (LCP, INP, CLS)
  • Bundle size optimization
  • Image optimization
  • JavaScript execution time
  • CSS optimization

📊 Review the Lighthouse CI results for detailed recommendations
```

## Local Development Workflow

### Quick Performance Testing
```bash
# Test desktop performance
npm run performance:test

# Test mobile performance  
npm run performance:mobile

# Test both desktop and mobile
npm run performance:full

# Individual operations
npm run lighthouse:collect  # Gather data only
npm run lighthouse:assert   # Check budgets only
```

### Development Best Practices
1. **Pre-commit testing**: Run performance tests before major commits
2. **Feature impact**: Test performance after adding new features
3. **Optimization cycles**: Regular performance tuning based on reports
4. **Budget awareness**: Consider performance impact in development decisions

## Performance Optimization Insights

### Current Build Analysis
Based on the recent build output:
- **Main bundle**: 642.08 kB (exceeds 500 kB recommended limit)
- **CSS bundle**: 133.18 kB
- **Code splitting**: Good separation of component chunks
- **Compression**: Effective gzip compression ratios

### Optimization Opportunities
1. **Bundle Size Reduction**:
   - Implement dynamic imports for large components
   - Use manual chunk splitting for vendor libraries
   - Tree shake unused dependencies

2. **Critical Path Optimization**:
   - Inline critical CSS for above-the-fold content
   - Defer non-critical JavaScript
   - Preload key resources

3. **Image Optimization**:
   - Convert to modern formats (WebP/AVIF)
   - Implement responsive images
   - Add lazy loading for below-the-fold images

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Build Failures
```bash
# Error: Module not found
npm run build
# Solution: Check for missing dependencies or imports
```

#### 2. Server Startup Issues
```bash
# Error: Server not ready
npm run preview
# Solution: Verify build artifacts exist and server can start
```

#### 3. Performance Budget Failures
```bash
# Check specific metrics that failed
cat .lighthouseci/lhr-*.json | jq '.audits'
# Solution: Focus on failing metrics for optimization
```

#### 4. Lighthouse CI Configuration Errors
```bash
# Test configuration validity
npx lhci healthcheck
# Solution: Fix JSON syntax or missing properties
```

### Debugging Performance Issues

#### Bundle Analysis
```bash
# Analyze bundle composition
npx vite-bundle-analyzer dist/assets/index-*.js
```

#### Lighthouse Report Analysis
```bash
# View detailed report
npx lhci open
```

#### Network Throttling Testing
```bash
# Test with different network conditions
npx lhci autorun --throttling-method=devtools
```

## Performance Monitoring Strategy

### Continuous Monitoring
- **GitHub Actions**: Automated testing on every deployment
- **Report Storage**: 30-day artifact retention for trend analysis
- **Alert Integration**: Failed builds trigger team notifications

### Performance Metrics Dashboard
Access performance data through:
1. **GitHub Actions Artifacts**: Download comprehensive Lighthouse reports
2. **Local Reports**: `.lighthouseci/` directory contains detailed analysis
3. **CI Logs**: Summary metrics in workflow execution logs

### Trend Analysis
- **Weekly Reviews**: Analyze performance trends over time
- **Feature Impact**: Correlate performance changes with feature releases
- **Regression Detection**: Early warning system for performance degradation

## Advanced Configuration

### Custom Assertions
Add specific performance requirements:
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-meaningful-paint": ["warn", {"maxNumericValue": 2000}],
        "unused-css-rules": ["error", {"maxLength": 5000}]
      }
    }
  }
}
```

### Environment-Specific Budgets
```bash
# Development environment (more lenient)
LHCI_BUILD_CONTEXT__CURRENT_BRANCH=develop npx lhci autorun

# Production environment (strict budgets)  
LHCI_BUILD_CONTEXT__CURRENT_BRANCH=main npx lhci autorun
```

### Integration with SonarCloud
Performance metrics complement code quality analysis:
- **Technical Debt**: Performance issues add to technical debt scores
- **Quality Gates**: Performance budgets as quality requirements
- **Trend Analysis**: Combined code and performance health monitoring

## Team Adoption Guidelines

### Developer Workflows
1. **Code Reviews**: Include performance considerations
2. **Sprint Planning**: Account for performance optimization time
3. **Definition of Done**: Performance budgets must pass
4. **Knowledge Sharing**: Regular performance optimization sessions

### Performance Champions
- **Designated team members**: Performance advocacy and expertise
- **Training**: Regular updates on performance best practices
- **Mentoring**: Support team members in optimization efforts

## Resources and References

### External Documentation
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Performance Budget Best Practices](https://web.dev/performance-budgets-101/)

### iwishBag Resources
- **Performance Framework**: `docs/performance-budget-framework.md`
- **Configuration Files**: `lighthouserc*.json`
- **GitHub Workflow**: `.github/workflows/lighthouse-ci.yml`
- **Build Scripts**: `package.json` performance commands

### Performance Tools
- **Bundle Analyzer**: Webpack Bundle Analyzer for chunk analysis
- **Chrome DevTools**: Performance profiling and Core Web Vitals
- **PageSpeed Insights**: Google's performance analysis tool
- **Web Vitals Extension**: Browser extension for real-time metrics

## Implementation Success Metrics

### Technical Metrics
- **Performance Score**: Consistently ≥ 85% (desktop), ≥ 75% (mobile)
- **Core Web Vitals**: All metrics within target thresholds
- **Build Success Rate**: ≥ 95% of builds pass performance budgets
- **Report Coverage**: All critical pages tested

### Business Impact
- **User Experience**: Improved page load times and responsiveness
- **Conversion Rates**: Better performance correlates with higher conversions
- **SEO Performance**: Higher search rankings due to performance optimization
- **Development Velocity**: Faster iteration cycles with automated testing

This Lighthouse CI integration provides iwishBag with world-class performance monitoring and ensures our e-commerce platform delivers exceptional user experiences across all devices and network conditions.
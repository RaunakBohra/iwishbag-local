# Performance Budget Framework Documentation

## Overview
This document outlines the Performance Budget Framework for iwishBag, implementing automated performance testing using Lighthouse CI to ensure world-class user experience and Core Web Vitals compliance.

## Performance Targets

### Core Web Vitals (2025 Standards)
- **Largest Contentful Paint (LCP)**: ≤ 2.5 seconds
- **Interaction to Next Paint (INP)**: ≤ 200 milliseconds  
- **Cumulative Layout Shift (CLS)**: ≤ 0.1

### Additional Performance Metrics
- **First Contentful Paint (FCP)**: ≤ 1.5 seconds
- **Speed Index**: ≤ 2.0 seconds
- **Total Blocking Time (TBT)**: ≤ 200 milliseconds
- **Time to Interactive (TTI)**: ≤ 3.0 seconds

### Quality Score Targets
- **Performance Score**: ≥ 85%
- **Accessibility Score**: ≥ 95%
- **Best Practices Score**: ≥ 90%
- **SEO Score**: ≥ 90%

## Implementation

### Lighthouse CI Configuration

The framework is configured via `lighthouserc.json` with the following key features:

1. **Multi-Page Testing**: Tests critical user journeys
   - Homepage (`/`)
   - Quote Request (`/quote-request`)
   - Dashboard (`/dashboard`)
   - Checkout (`/checkout`)

2. **Desktop-First Approach**: Optimized for e-commerce desktop experience
   - 1920x1080 screen resolution
   - Fast network throttling (10 Mbps)
   - Desktop form factor and user agent

3. **Statistical Reliability**: 3 runs per URL for consistent results

### Automated CI/CD Integration

#### Workflow Triggers
- **Push to main**: Performance monitoring on production code
- **Pull Requests**: Performance impact assessment for new features
- **Manual Dispatch**: On-demand performance testing

#### Performance Budget Enforcement
- **Blocking Failures**: Performance score < 85% fails the build
- **Warning Alerts**: Sub-optimal metrics trigger warnings
- **Detailed Reporting**: Actionable insights for optimization

## Local Development

### Quick Performance Test
```bash
# Run full performance test suite
npm run performance:test

# Individual Lighthouse CI commands
npm run lighthouse:collect  # Gather performance data
npm run lighthouse:assert   # Check against budgets
npm run lighthouse:ci       # Full automated run
```

### Development Workflow
1. **Build optimized version**: `npm run build`
2. **Start preview server**: `npm run preview`  
3. **Run performance tests**: `npm run lighthouse:ci`
4. **Review results**: Check `.lighthouseci/` directory

## Performance Optimization Guidelines

### Bundle Size Optimization
- **Target**: Main bundle ≤ 500 KB gzipped
- **Strategies**:
  - Code splitting for route-based chunks
  - Lazy loading for non-critical components
  - Tree shaking for unused dependencies
  - Dynamic imports for large libraries

### Image Optimization
- **Format**: WebP/AVIF for modern browsers with fallbacks
- **Sizing**: Responsive images with `srcset`
- **Loading**: Lazy loading for below-the-fold images
- **Compression**: Optimal quality vs. file size balance

### JavaScript Performance
- **Minification**: Production builds use minified JavaScript
- **Modern Syntax**: ES2020+ for supported browsers
- **Execution Time**: Minimize main thread blocking
- **Critical Path**: Inline critical CSS and defer non-critical JavaScript

### Core Web Vitals Optimization

#### Largest Contentful Paint (LCP)
- **Server Response**: Fast TTFB < 800ms
- **Resource Loading**: Preload critical resources
- **Client Rendering**: Minimize render-blocking resources

#### Interaction to Next Paint (INP)
- **Event Handlers**: Optimize JavaScript execution time
- **Input Delay**: Minimize main thread blocking
- **Visual Feedback**: Immediate response to user interactions

#### Cumulative Layout Shift (CLS)
- **Size Attributes**: Set dimensions for images and videos
- **Font Loading**: Use `font-display: swap` for web fonts
- **Dynamic Content**: Reserve space for ads and embeds

## Monitoring and Alerting

### Continuous Monitoring
- **GitHub Actions**: Automated testing on every deployment
- **Performance Artifacts**: 30-day retention of detailed reports
- **Trend Analysis**: Performance regression detection

### Alert Conditions
- **Critical**: Performance score drops below 85%
- **Warning**: Core Web Vitals exceed thresholds
- **Info**: Best practices or accessibility issues

### Performance Dashboard
Access detailed reports via:
1. **GitHub Actions Artifacts**: Download comprehensive reports
2. **Local Reports**: `.lighthouseci/` directory after local runs
3. **CI Logs**: Summary metrics in workflow output

## Troubleshooting Common Issues

### Performance Score Below Target
1. **Bundle Analysis**: Check for oversized JavaScript bundles
2. **Critical Path**: Optimize render-blocking resources
3. **Caching**: Implement proper cache headers
4. **CDN**: Use content delivery network for static assets

### Core Web Vitals Failures
1. **LCP Issues**: Optimize server response time and resource loading
2. **INP Problems**: Reduce JavaScript execution time
3. **CLS Violations**: Set proper dimensions and avoid layout shifts

### Build Failures
1. **Missing Dependencies**: Ensure Lighthouse CI is installed
2. **Server Startup**: Check preview server configuration
3. **Network Issues**: Verify localhost accessibility

## Performance Budget Adjustments

### When to Adjust Budgets
- **New Feature Impact**: Major features may require temporary budget adjustments
- **Third-Party Integration**: External services may affect performance scores
- **Platform Changes**: Browser updates or framework changes

### Budget Modification Process
1. **Analyze Impact**: Understand performance regression cause
2. **Stakeholder Review**: Discuss with development team
3. **Update Configuration**: Modify `lighthouserc.json` thresholds
4. **Document Changes**: Update this documentation

## Best Practices

### Development Guidelines
- **Performance-First**: Consider performance impact of new features
- **Testing Cadence**: Run performance tests before major releases
- **Optimization Priority**: Focus on user-facing performance metrics
- **Documentation**: Update performance docs with architectural changes

### Team Workflows
- **Code Reviews**: Include performance considerations
- **Feature Planning**: Account for performance budget in sprint planning
- **Monitoring**: Regular review of performance trends
- **Training**: Keep team updated on performance best practices

## Resources

### Tools and References
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Performance Budget Guide](https://web.dev/performance-budgets-101/)
- [Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

### iwishBag Specific Resources
- **Configuration**: `lighthouserc.json`
- **CI Workflow**: `.github/workflows/lighthouse-ci.yml`
- **Local Scripts**: `package.json` performance scripts
- **Documentation**: This file for team reference

## Changelog

### Version 1.0 (January 2025)
- Initial Performance Budget Framework implementation
- Lighthouse CI integration with GitHub Actions
- Core Web Vitals compliance targets set
- Multi-page performance testing configured
- Desktop-optimized performance thresholds established
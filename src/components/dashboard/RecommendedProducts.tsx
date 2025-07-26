import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Eye,
  ShoppingCart,
  ExternalLink,
  Plus,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/design-system';
import { userActivityService, ACTIVITY_TYPES } from '@/services/UserActivityService';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  useActivityPatterns,
  useRecentProductViews,
  useQuoteHistory,
  inferCategoryFromProductName,
  activityKeys,
} from '@/hooks/useUserActivityAnalytics';

interface RecommendedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  source: 'recent' | 'popular' | 'similar' | 'trending'; // More specific type
  confidence: number; // 0-100 recommendation confidence
  reason: string; // Why this is recommended
  url?: string;
  category?: string;
  rating?: number;
  reviews?: number;
}

interface RecommendedProductsProps {
  maxItems?: number;
  className?: string;
  showTitle?: boolean;
}

const ProductCard: React.FC<{
  product: RecommendedProduct;
  index: number;
  onProductClick: (product: RecommendedProduct) => void;
}> = ({ product, index, onProductClick }) => {
  const getSourceIcon = () => {
    switch (product.source) {
      case 'recent':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'popular':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'similar':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'trending':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceLabel = () => {
    switch (product.source) {
      case 'recent':
        return 'Recently Viewed';
      case 'popular':
        return 'Popular Choice';
      case 'similar':
        return 'Similar to Your Orders';
      case 'trending':
        return 'Trending Now';
      default:
        return 'Recommended';
    }
  };

  const getConfidenceColor = () => {
    if (product.confidence >= 80) return 'bg-green-100 text-green-800';
    if (product.confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border-l-4 border-l-teal-500"
        onClick={() => onProductClick(product)}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center border border-gray-200">
                  <ShoppingBag className="w-8 h-8 text-teal-600" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2 text-sm">
                    {product.name}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">{product.description}</p>
                </div>

                {/* Price */}
                <div className="ml-2 text-right">
                  <div className="font-bold text-green-600 text-sm">
                    {product.currency === 'USD' ? '$' : product.currency}
                    {product.price.toFixed(2)}
                  </div>
                  {product.rating && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>{product.rating}</span>
                      {product.reviews && <span className="ml-1">({product.reviews})</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Source indicator */}
                  <div className="flex items-center gap-1">
                    {getSourceIcon()}
                    <span className="text-xs text-gray-500">{getSourceLabel()}</span>
                  </div>

                  {/* Category */}
                  {product.category && (
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                  )}
                </div>

                {/* Confidence indicator */}
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getConfidenceColor())}>
                    {product.confidence}% match
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              {/* Reason */}
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">{product.reason}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const RecommendedProducts: React.FC<RecommendedProductsProps> = ({
  maxItems = 4,
  className,
  showTitle = true,
}) => {
  const { user } = useAuth();
  const { quotes, orders } = useDashboardState();
  const queryClient = useQueryClient();

  // Use React Query hooks for intelligent data fetching
  const { data: activityPatterns, isLoading: patternsLoading } = useActivityPatterns();
  const { data: recentViews, isLoading: viewsLoading } = useRecentProductViews(10);
  const { data: quoteHistory, isLoading: historyLoading } = useQuoteHistory(20);

  const isLoading = patternsLoading || viewsLoading || historyLoading;

  // Helper function to generate category-based recommendations (memoized for performance)
  const generateCategoryRecommendations = useMemo(
    () =>
      (
        category: string,
        priceRange: { min: number; max: number; average: number; confidence: number },
        confidence: number,
      ): Omit<RecommendedProduct, 'id' | 'source' | 'reason'>[] => {
        const categoryProducts = {
          Electronics: [
            {
              name: 'iPhone 15 Pro',
              description: 'Latest Apple smartphone with professional camera system',
              price: 999,
            },
            {
              name: 'MacBook Air M3',
              description: '13-inch laptop with Apple M3 chip and all-day battery',
              price: 1099,
            },
            {
              name: 'Sony WH-1000XM5',
              description: 'Industry-leading noise canceling wireless headphones',
              price: 399,
            },
            {
              name: 'iPad Pro 12.9"',
              description: 'Most advanced iPad with M2 chip and Liquid Retina display',
              price: 1099,
            },
            {
              name: 'AirPods Pro 2nd Gen',
              description: 'Active noise cancellation with spatial audio',
              price: 249,
            },
          ],
          Fashion: [
            {
              name: 'Nike Air Jordan 1 Retro High',
              description: 'Classic basketball sneakers in premium leather',
              price: 170,
            },
            {
              name: "Levi's 501 Original Jeans",
              description: 'The original blue jean with a straight leg fit',
              price: 98,
            },
            {
              name: 'Ray-Ban Aviator Sunglasses',
              description: 'Iconic pilot sunglasses with crystal lenses',
              price: 154,
            },
            {
              name: 'Adidas Ultraboost 23',
              description: 'Premium running shoes with responsive cushioning',
              price: 190,
            },
            {
              name: 'Champion Reverse Weave Hoodie',
              description: 'Classic heavyweight hoodie with iconic logo',
              price: 85,
            },
          ],
          'Home & Garden': [
            {
              name: 'Dyson V15 Detect Vacuum',
              description: 'Cordless vacuum with laser dust detection',
              price: 749,
            },
            {
              name: 'Instant Pot Duo 7-in-1',
              description: 'Multi-use pressure cooker for fast, healthy meals',
              price: 99,
            },
            {
              name: 'Philips Hue Smart Bulbs',
              description: 'Color-changing LED bulbs with app control',
              price: 199,
            },
            {
              name: 'Ninja Foodi Indoor Grill',
              description: 'Indoor grill and air fryer combination',
              price: 229,
            },
            {
              name: 'iRobot Roomba j7+',
              description: 'Self-emptying robot vacuum with obstacle avoidance',
              price: 799,
            },
          ],
          'Sports & Outdoors': [
            {
              name: 'Yeti Rambler Tumbler',
              description: 'Insulated stainless steel drinkware',
              price: 39,
            },
            {
              name: 'Patagonia Down Sweater',
              description: 'Lightweight insulated jacket for outdoor adventures',
              price: 229,
            },
            {
              name: 'Hydro Flask Water Bottle',
              description: 'Insulated water bottle that keeps drinks cold 24hrs',
              price: 44,
            },
            {
              name: 'REI Co-op Trail 40 Backpack',
              description: 'Versatile hiking backpack with multiple compartments',
              price: 149,
            },
            {
              name: 'Fitbit Charge 5',
              description: 'Advanced fitness tracker with built-in GPS',
              price: 199,
            },
          ],
          'Beauty & Health': [
            {
              name: 'Olaplex Hair Treatment Set',
              description: 'Professional hair repair treatment system',
              price: 85,
            },
            {
              name: 'The Ordinary Skincare Set',
              description: 'Complete skincare routine with active ingredients',
              price: 45,
            },
            {
              name: 'Dyson Airwrap Styler',
              description: 'Multi-styler for hair styling without extreme heat',
              price: 599,
            },
            {
              name: 'Cetaphil Gentle Cleanser',
              description: 'Dermatologist-recommended face wash for sensitive skin',
              price: 15,
            },
            {
              name: 'Biotin Hair Growth Supplements',
              description: 'Daily vitamins for stronger, healthier hair',
              price: 29,
            },
          ],
        };

        const products = categoryProducts[category as keyof typeof categoryProducts] || [];

        // Filter products within user's price range preference
        const affordableProducts = products.filter(
          (product) =>
            product.price >= priceRange.min * 0.5 && product.price <= priceRange.max * 1.5,
        );

        return (affordableProducts.length > 0 ? affordableProducts : products.slice(0, 2)).map(
          (product) => ({
            name: product.name,
            description: product.description,
            price: product.price,
            currency: 'USD',
            confidence: Math.max(60, confidence),
            category,
            rating: 4.1 + Math.random() * 0.8,
            reviews: Math.floor(Math.random() * 1000) + 200,
          }),
        );
      },
    [],
  ); // Empty dependency array since product catalog is static

  // Helper function to generate similar products based on previous orders (memoized for performance)
  const generateSimilarProduct = useMemo(
    () =>
      (
        originalProduct: string,
        category: string,
        price: number,
      ): Omit<RecommendedProduct, 'id' | 'source' | 'reason'> | null => {
        const similarProducts = {
          // Electronics variations
          iphone: ['iPhone 15 Pro Max', 'Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro'],
          macbook: ['MacBook Pro 14"', 'Dell XPS 13', 'Surface Laptop Studio'],
          headphones: ['Sony WH-1000XM5', 'Bose QuietComfort 45', 'Apple AirPods Max'],

          // Fashion variations
          nike: ['Nike Air Jordan 4', 'Nike Dunk Low', 'Nike Air Force 1'],
          adidas: ['Adidas Stan Smith', 'Adidas Ultraboost', 'Adidas Gazelle'],
          jeans: ["Levi's 511 Slim", 'Wrangler 936 Cowboy Cut', 'AG Graduate Jeans'],
        };

        const productLower = originalProduct.toLowerCase();
        let suggestions: string[] = [];

        // Find matching product category
        for (const [key, variants] of Object.entries(similarProducts)) {
          if (productLower.includes(key)) {
            suggestions = variants;
            break;
          }
        }

        if (suggestions.length === 0) {
          // Fallback to category-based suggestions
          const categoryProducts = generateCategoryRecommendations(
            category,
            { min: price * 0.7, max: price * 1.3, average: price, confidence: 70 },
            70,
          );
          return categoryProducts[0] || null;
        }

        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        return {
          name: randomSuggestion,
          description: `Recommended based on your interest in similar products`,
          price: Math.round(price * (0.8 + Math.random() * 0.4)), // ±20% price variation
          currency: 'USD',
          confidence: 75,
          category,
          rating: 4.2 + Math.random() * 0.6,
          reviews: Math.floor(Math.random() * 800) + 150,
        };
      },
    [],
  ); // Empty dependency array since product variations are static

  // Helper function to get trending products (memoized for performance)
  const getTrendingProducts = useMemo(
    () =>
      (
        priceRange: { min: number; max: number; average: number; confidence: number },
        preferredCategory?: string,
      ): Omit<RecommendedProduct, 'id' | 'source'>[] => {
        const globalTrending = [
          {
            name: 'iPhone 15 Pro Max',
            description: 'Latest Apple flagship with titanium design and Action Button',
            price: 1199,
            category: 'Electronics',
            confidence: 88,
            reason: 'Trending globally - most requested premium smartphone',
          },
          {
            name: 'Sony PlayStation 5',
            description: 'Next-gen gaming console with ultra-high speed SSD',
            price: 499,
            category: 'Electronics',
            confidence: 85,
            reason: 'High demand gaming console, perfect for international shipping',
          },
          {
            name: 'Nike Air Jordan 1 Chicago',
            description: 'Iconic basketball shoe in the original Chicago colorway',
            price: 170,
            category: 'Fashion',
            confidence: 82,
            reason: 'Consistently popular sneaker with strong resale value',
          },
          {
            name: 'Dyson V15 Detect',
            description: 'Advanced cordless vacuum with laser dust detection',
            price: 749,
            category: 'Home & Garden',
            confidence: 79,
            reason: 'Premium home appliance frequently requested by customers',
          },
          {
            name: 'MacBook Air M3',
            description: '13-inch laptop with Apple M3 chip for professionals',
            price: 1099,
            category: 'Electronics',
            confidence: 90,
            reason: 'Top-rated laptop for work and creativity, excellent for shipping',
          },
          {
            name: 'Patagonia Better Sweater',
            description: 'Sustainable fleece jacket made from recycled materials',
            price: 99,
            category: 'Fashion',
            confidence: 76,
            reason: 'Eco-friendly fashion trending among conscious consumers',
          },
        ];

        // Filter by preferred category if available
        let filteredProducts = preferredCategory
          ? globalTrending.filter((p) => p.category === preferredCategory)
          : globalTrending;

        // If no products in preferred category, use all trending
        if (filteredProducts.length === 0) {
          filteredProducts = globalTrending;
        }

        // Filter by price range if user has established preferences
        if (priceRange.confidence > 50) {
          const affordableProducts = filteredProducts.filter(
            (product) =>
              product.price >= priceRange.min * 0.3 && product.price <= priceRange.max * 2,
          );
          if (affordableProducts.length > 0) {
            filteredProducts = affordableProducts;
          }
        }

        return filteredProducts.map((product) => ({
          name: product.name,
          description: product.description,
          price: product.price,
          currency: 'USD',
          confidence: product.confidence,
          reason: product.reason,
          category: product.category,
          rating: 4.1 + Math.random() * 0.7,
          reviews: Math.floor(Math.random() * 1200) + 300,
        }));
      },
    [],
  ); // Empty dependency array since trending products catalog is static

  // Generate intelligent recommendations using activity patterns
  const recommendations = useMemo((): RecommendedProduct[] => {
    if (!user) return [];

    // Handle new users with no activity data - provide trending recommendations
    if (
      !activityPatterns ||
      (activityPatterns.recentlyViewedProducts.length === 0 &&
        activityPatterns.preferredCategories.length === 0 &&
        activityPatterns.quoteCompletionHistory.length === 0)
    ) {
      // For new users, show trending products with generic messaging
      const newUserTrending = getTrendingProducts(
        { min: 50, max: 500, average: 150, confidence: 0 }, // Default price range for new users
        undefined, // No category preference
      );

      return newUserTrending.slice(0, maxItems).map((product, index) => ({
        ...product,
        id: `new_user_trending_${index}`,
        source: 'trending' as const,
        reason:
          'Popular choice for first-time iwishBag customers - highly rated and frequently shipped',
      }));
    }

    const intelligentRecommendations: RecommendedProduct[] = [];

    // Priority 1: Recently viewed products (highest confidence)
    if (activityPatterns.recentlyViewedProducts.length > 0) {
      const recentProducts = activityPatterns.recentlyViewedProducts
        .slice(0, Math.min(2, maxItems))
        .map((product, index) => ({
          id: `recent_${index}`,
          name: product.product_name,
          description: `You viewed this ${product.viewCount > 1 ? `${product.viewCount} times` : 'recently'}`,
          price: product.product_price || 99,
          currency: 'USD',
          source: 'recent' as const,
          confidence: product.confidence,
          reason: `You've shown interest in this product${product.viewCount > 1 ? ' multiple times' : ''} - perfect for your next quote`,
          category: product.category || 'General',
          rating: 4.3 + Math.random() * 0.7,
          reviews: Math.floor(Math.random() * 500) + 100,
          url: product.product_url,
        }));

      intelligentRecommendations.push(...recentProducts);
    }

    // Priority 2: Products in preferred categories
    if (
      activityPatterns.preferredCategories.length > 0 &&
      intelligentRecommendations.length < maxItems
    ) {
      const topCategories = activityPatterns.preferredCategories.slice(0, 2);

      topCategories.forEach((categoryInfo, index) => {
        if (intelligentRecommendations.length >= maxItems) return;

        // Generate smart suggestions based on user's category preferences and price range
        const categoryProducts = generateCategoryRecommendations(
          categoryInfo.category,
          activityPatterns.priceRangePreference,
          categoryInfo.confidence,
        );

        if (categoryProducts.length > 0) {
          intelligentRecommendations.push({
            ...categoryProducts[0],
            id: `category_${index}`,
            source: 'popular' as const,
            reason: `Popular in ${categoryInfo.category} - you've shown strong interest in this category (${categoryInfo.frequency} interactions)`,
          });
        }
      });
    }

    // Priority 3: Similar to completed quotes/orders
    if (
      activityPatterns.quoteCompletionHistory.length > 0 &&
      intelligentRecommendations.length < maxItems
    ) {
      const recentCompletions = activityPatterns.quoteCompletionHistory.slice(0, 2);

      recentCompletions.forEach((completion, index) => {
        if (intelligentRecommendations.length >= maxItems || !completion.product_name) return;

        const similarProduct = generateSimilarProduct(
          completion.product_name,
          completion.category || 'General',
          completion.value || activityPatterns.priceRangePreference.average,
        );

        if (similarProduct) {
          intelligentRecommendations.push({
            ...similarProduct,
            id: `similar_${index}`,
            source: 'similar' as const,
            reason: `Similar to "${completion.product_name}" which you successfully ordered`,
          });
        }
      });
    }

    // Priority 4: Trending products (fallback for new users or to fill remaining slots)
    if (intelligentRecommendations.length < maxItems) {
      const trendingProducts = getTrendingProducts(
        activityPatterns.priceRangePreference,
        activityPatterns.preferredCategories[0]?.category,
      );

      const remainingSlots = maxItems - intelligentRecommendations.length;
      trendingProducts.slice(0, remainingSlots).forEach((product, index) => {
        intelligentRecommendations.push({
          ...product,
          id: `trending_${index}`,
          source: 'trending' as const,
        });
      });
    }

    return intelligentRecommendations.slice(0, maxItems);
  }, [
    activityPatterns,
    maxItems,
    user,
    generateCategoryRecommendations,
    generateSimilarProduct,
    getTrendingProducts,
  ]);

  const handleProductClick = async (product: RecommendedProduct) => {
    // Track the recommendation click
    await userActivityService.trackProductActivity(
      ACTIVITY_TYPES.PRODUCT_VIEW,
      {
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
      },
      {
        recommendation_source: product.source,
        recommendation_confidence: product.confidence,
        clicked_from: 'dashboard_recommendations',
      },
    );

    // For now, navigate to quote creation with pre-filled product name
    // In a real implementation, this would navigate to the product detail or create quote
    const quoteUrl = `/quote?product=${encodeURIComponent(product.name)}`;
    window.location.href = quoteUrl;
  };

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm mb-4">
              Start creating quotes to get personalized recommendations!
            </p>
            <Link to="/quote">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Request Quote
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          {showTitle && (
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Recommended for You
            </CardTitle>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-teal-600 hover:text-teal-700"
            onClick={() => {
              // Invalidate and refetch activity data
              if (user?.id) {
                queryClient.invalidateQueries({ queryKey: activityKeys.all });
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onProductClick={handleProductClick}
            />
          ))}
        </div>

        {/* Footer with view all link */}
        <div className="mt-6 text-center">
          <Link to="/quote" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
            Don't see what you want? Request a custom quote →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

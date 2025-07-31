import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBlogPosts, usePopularPosts } from '@/hooks/useBlogPosts';
import { useBlogCategories } from '@/hooks/useBlogCategories';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCategories } from '@/components/blog/BlogCategories';
import { BlogPostFilters } from '@/types/blog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<BlogPostFilters>({
    page: parseInt(searchParams.get('page') || '1'),
    per_page: 12,
    sort_by: 'published_at',
    sort_order: 'desc',
  });

  const { data: postsResponse, isLoading: postsLoading, error: postsError } = useBlogPosts(filters);
  const { data: popularPosts, isLoading: popularLoading } = usePopularPosts(5);
  const { data: categories } = useBlogCategories();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize filters from URL
  useEffect(() => {
    const categoryId = searchParams.get('category');
    const sortBy = searchParams.get('sort') as BlogPostFilters['sort_by'];
    const page = parseInt(searchParams.get('page') || '1');

    const newFilters = {
      page,
      per_page: 12,
      category_id: categoryId || undefined,
      sort_by: sortBy || 'published_at',
      sort_order: 'desc' as const,
    };

    // Only update if filters actually changed
    setFilters(prevFilters => {
      const hasChanged = 
        prevFilters.page !== newFilters.page ||
        prevFilters.category_id !== newFilters.category_id ||
        prevFilters.sort_by !== newFilters.sort_by;
      
      return hasChanged ? newFilters : prevFilters;
    });
  }, [searchParams]);

  // Update URL when filters change (debounced to prevent loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
      if (filters.category_id) params.set('category', filters.category_id);
      if (filters.sort_by && filters.sort_by !== 'published_at') params.set('sort', filters.sort_by);

      const newSearchString = params.toString();
      const currentSearchString = searchParams.toString();
      
      // Only update URL if it's actually different
      if (newSearchString !== currentSearchString) {
        setSearchParams(params, { replace: true });
      }
    }, 100); // Small debounce to prevent rapid updates

    return () => clearTimeout(timeoutId);
  }, [filters, setSearchParams, searchParams]);

  const handleFilterChange = (newFilters: Partial<BlogPostFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedCategory = categories?.find((cat) => cat.id === filters.category_id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Filter Bar */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center space-x-6">
              {/* Quick Filter Tabs */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleFilterChange({ sort_by: 'published_at' })}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    filters.sort_by === 'published_at'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => handleFilterChange({ sort_by: 'views_count' })}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    filters.sort_by === 'views_count'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Popular
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-2">
                <BlogCategories
                  selectedCategoryId={filters.category_id}
                  onCategorySelect={(categoryId) => handleFilterChange({ category_id: categoryId })}
                />
              </div>
            </div>

            {/* Active Filters */}
            <div className="flex items-center space-x-2">
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={() => handleFilterChange({ category_id: undefined })}
                >
                  {selectedCategory.name} ×
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

          {/* Posts Grid */}
          {postsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <Skeleton className="h-24 w-full mb-3 rounded" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : postsError ? (
            <div className="text-center py-12">
              <p className="text-red-600">Failed to load blog posts</p>
            </div>
          ) : !postsResponse?.data || postsResponse.data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No blog posts found</p>
              {filters.category_id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      page: 1,
                      per_page: 12,
                      sort_by: 'published_at',
                      sort_order: 'desc',
                    });
                  }}
                  className="mt-4 border-gray-300"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Post - First post on page 1 */}
              {filters.page === 1 && postsResponse.data.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="md:flex">
                    {postsResponse.data[0].featured_image && (
                      <div className="md:w-1/2">
                        <img
                          src={postsResponse.data[0].featured_image}
                          alt={postsResponse.data[0].title}
                          className="w-full h-64 md:h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6 md:w-1/2">
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                        <span>{new Date(postsResponse.data[0].published_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{postsResponse.data[0].category?.name}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        <a href={`/blog/${postsResponse.data[0].slug}`} className="hover:text-blue-600">
                          {postsResponse.data[0].title}
                        </a>
                      </h2>
                      <p className="text-gray-600 mb-4 line-clamp-3">{postsResponse.data[0].excerpt}</p>
                      <a
                        href={`/blog/${postsResponse.data[0].slug}`}
                        className="text-blue-600 font-medium hover:text-blue-700"
                      >
                        Read more →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid Posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {postsResponse.data
                  .slice(filters.page === 1 ? 1 : 0) // Skip first post on page 1 (it's featured)
                  .map((post) => (
                    <article key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      {post.featured_image && (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                          <span>{new Date(post.published_at).toLocaleDateString()}</span>
                          {post.category && (
                            <>
                              <span>•</span>
                              <span>{post.category.name}</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          <a href={`/blog/${post.slug}`} className="hover:text-blue-600">
                            {post.title}
                          </a>
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                      </div>
                    </article>
                  ))}
              </div>

              {/* Pagination */}
              {postsResponse.total_pages > 1 && (
                <div className="flex justify-center pt-8 border-t border-gray-200">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(Math.max(1, filters.page! - 1))}
                          className={
                            filters.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>

                      {[...Array(Math.min(5, postsResponse.total_pages))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === filters.page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            handlePageChange(Math.min(postsResponse.total_pages, filters.page! + 1))
                          }
                          className={
                            filters.page === postsResponse.total_pages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Blog;

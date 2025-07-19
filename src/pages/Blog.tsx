import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBlogPosts, usePopularPosts } from '@/hooks/useBlogPosts';
import { useBlogCategories } from '@/hooks/useBlogCategories';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogSearch } from '@/components/blog/BlogSearch';
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

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    if (filters.category_id) params.set('category', filters.category_id);
    if (filters.search) params.set('search', filters.search);
    if (filters.sort_by && filters.sort_by !== 'published_at') params.set('sort', filters.sort_by);

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Initialize filters from URL
  useEffect(() => {
    const categoryId = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort') as BlogPostFilters['sort_by'];
    const page = parseInt(searchParams.get('page') || '1');

    setFilters((prev) => ({
      ...prev,
      category_id: categoryId || undefined,
      search: search || undefined,
      sort_by: sortBy || 'published_at',
      page,
    }));
  }, [searchParams]);

  const handleFilterChange = (newFilters: Partial<BlogPostFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedCategory = categories?.find((cat) => cat.id === filters.category_id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900">iwishBag</h1>
            </div>
            <nav className="flex space-x-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="/blog" className="text-gray-900 font-medium">Blog</a>
              <a href="/about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="/contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
            <p className="text-xl text-gray-600 mb-8">
              Insights and tips for international shopping
            </p>
            <div className="max-w-md mx-auto">
              <BlogSearch
                onSearch={(searchTerm) => handleFilterChange({ search: searchTerm })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-gray-200 pb-6">
            <div className="flex flex-wrap gap-2 items-center">
              <BlogCategories
                selectedCategoryId={filters.category_id}
                onCategorySelect={(categoryId) => handleFilterChange({ category_id: categoryId })}
              />
              
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="bg-orange-50 text-orange-700 border-orange-200"
                >
                  {selectedCategory.name}
                </Badge>
              )}

              {filters.search && (
                <Badge variant="outline" className="text-gray-600">
                  "{filters.search}"
                </Badge>
              )}
            </div>

            <Select
              value={filters.sort_by}
              onValueChange={(value) =>
                handleFilterChange({ sort_by: value as BlogPostFilters['sort_by'] })
              }
            >
              <SelectTrigger className="w-40 h-10 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published_at">Latest</SelectItem>
                <SelectItem value="views_count">Most Popular</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posts Grid */}
          {postsLoading ? (
            <div className="grid grid-cols-1 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-b border-gray-200 pb-8">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
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
              {(filters.search || filters.category_id) && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      page: 1,
                      per_page: 12,
                      sort_by: 'published_at',
                      sort_order: 'desc',
                    })
                  }
                  className="mt-4 border-gray-300"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured Posts */}
              {filters.page === 1 && (
                <>
                  {postsResponse.data.filter((post) => post.featured).length > 0 && (
                    <div className="space-y-8">
                      <h2 className="text-2xl font-bold text-gray-900">Featured</h2>
                      <div className="space-y-8">
                        {postsResponse.data
                          .filter((post) => post.featured)
                          .slice(0, 2)
                          .map((post) => (
                            <BlogCard key={post.id} post={post} />
                          ))}
                      </div>
                      <div className="border-t border-gray-200 pt-8"></div>
                    </div>
                  )}
                </>
              )}

              {/* All Posts */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {filters.page === 1 ? 'Recent Posts' : `Page ${filters.page}`}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {postsResponse.count} posts
                  </span>
                </div>

                <div className="space-y-8">
                  {postsResponse.data
                    .filter((post) => (filters.page === 1 ? !post.featured : true))
                    .map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                </div>
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

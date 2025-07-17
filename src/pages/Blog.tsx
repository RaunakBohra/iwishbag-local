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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">iwishBag Blog</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your guide to smart international shopping. Tips, reviews, and insights for shopping
              from Amazon, Flipkart, eBay, and more.
            </p>
            <BlogSearch
              onSearch={(searchTerm) => handleFilterChange({ search: searchTerm })}
              className="max-w-md mx-auto"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              <BlogCategories
                selectedCategoryId={filters.category_id}
                onCategorySelect={(categoryId) => handleFilterChange({ category_id: categoryId })}
              />

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Filtered by:</span>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${selectedCategory.color}20`,
                          color: selectedCategory.color,
                        }}
                      >
                        {selectedCategory.name}
                      </Badge>
                    </div>
                  )}

                  {filters.search && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Search:</span>
                      <Badge variant="outline">"{filters.search}"</Badge>
                    </div>
                  )}
                </div>

                <Select
                  value={filters.sort_by}
                  onValueChange={(value) =>
                    handleFilterChange({ sort_by: value as BlogPostFilters['sort_by'] })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published_at">Latest</SelectItem>
                    <SelectItem value="views_count">Most Popular</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Posts Grid */}
            {postsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video" />
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : postsError ? (
              <div className="text-center py-12">
                <p className="text-destructive">Failed to load blog posts</p>
              </div>
            ) : !postsResponse?.data || postsResponse.data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No blog posts found</p>
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
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Featured Posts */}
                {filters.page === 1 && (
                  <>
                    {postsResponse.data.filter((post) => post.featured).length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Featured Posts</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {postsResponse.data
                            .filter((post) => post.featured)
                            .slice(0, 2)
                            .map((post) => (
                              <BlogCard key={post.id} post={post} />
                            ))}
                        </div>
                        <Separator />
                      </div>
                    )}
                  </>
                )}

                {/* All Posts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                      {filters.page === 1 ? 'Recent Posts' : `Posts - Page ${filters.page}`}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {postsResponse.count} posts found
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {postsResponse.data
                      .filter((post) => (filters.page === 1 ? !post.featured : true))
                      .map((post) => (
                        <BlogCard key={post.id} post={post} />
                      ))}
                  </div>
                </div>

                {/* Pagination */}
                {postsResponse.total_pages > 1 && (
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
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Popular Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {popularLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {popularPosts?.map((post) => (
                      <div key={post.id} className="space-y-2">
                        <a
                          href={`/blog/${post.slug}`}
                          className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                        >
                          {post.title}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(post.published_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{post.views_count} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory?.id === category.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleFilterChange({ category_id: category.id })}
                      className="w-full justify-start"
                      style={{
                        backgroundColor:
                          selectedCategory?.id === category.id ? category.color : undefined,
                        color: selectedCategory?.id === category.id ? 'white' : category.color,
                      }}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;

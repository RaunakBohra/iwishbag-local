import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useBlogPost, useRelatedPosts } from '@/hooks/useBlogPosts';
import { BlogCard } from '@/components/blog/BlogCard';
import { MetaTags } from '@/components/blog/MetaTags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  Eye,
  User,
  ArrowLeft,
  Share2,
  Bookmark,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: post, isLoading, error } = useBlogPost(slug!);
  const { data: relatedPosts, isLoading: relatedLoading } = useRelatedPosts(
    slug && post ? slug : '',
    3,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6" />
            <Skeleton className="h-64 w-full mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return <Navigate to="/blog" replace />;
  }

  const publishedDate = post.published_at ? new Date(post.published_at) : null;
  const categoryColor = post.category?.color || '#3B82F6';

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post.title;
    const text = post.excerpt || post.title;

    switch (platform) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast({
            title: 'Link copied!',
            description: 'The blog post URL has been copied to your clipboard.',
          });
        } catch (err) {
          toast({
            title: 'Failed to copy',
            description: 'Please copy the URL manually.',
            variant: 'destructive',
          });
        }
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank',
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          '_blank',
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank',
        );
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MetaTags post={post} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="aspect-video overflow-hidden rounded-lg mb-8">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              {post.category && (
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                >
                  {post.category.name}
                </Badge>
              )}

              {post.featured && <Badge variant="default">Featured</Badge>}
            </div>

            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

            {post.excerpt && <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>}

            {/* Article Meta */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                {post.author && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.author.name || post.author.email}</p>
                      <p className="text-sm text-muted-foreground">Author</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {publishedDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDistanceToNow(publishedDate, { addSuffix: true })}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{post.reading_time_minutes} min read</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{post.views_count} views</span>
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('copy')}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleShare('facebook')}>
                  <Facebook className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleShare('twitter')}>
                  <Twitter className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')}>
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tagRelation) => (
                  <Badge key={tagRelation.tag.id} variant="outline" className="text-xs">
                    #{tagRelation.tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />
          </div>

          {/* Article Content */}
          <div className="prose prose-gray max-w-none mb-12">
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          <Separator className="mb-8" />

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Related Posts</h2>

              {relatedLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="aspect-video" />
                      <CardHeader>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-full" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <div key={relatedPost.id} className="space-y-4">
                      <Link to={`/blog/${relatedPost.slug}`}>
                        {relatedPost.featured_image_url && (
                          <div className="aspect-video overflow-hidden rounded-lg mb-3">
                            <img
                              src={relatedPost.featured_image_url}
                              alt={relatedPost.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Badge variant="outline" className="text-xs">
                            {relatedPost.category_name}
                          </Badge>
                          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
                            {relatedPost.title}
                          </h3>
                          {relatedPost.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {relatedPost.excerpt}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(relatedPost.published_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                Ready to start your international shopping journey?
              </h3>
              <p className="text-muted-foreground mb-6">
                Get quotes for your favorite products from Amazon, Flipkart, eBay, and more.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/quote">Get a Quote</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/blog">Read More Articles</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;

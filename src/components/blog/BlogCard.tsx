import { BlogPost } from '@/types/blog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Eye, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface BlogCardProps {
  post: BlogPost;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showViews?: boolean;
  className?: string;
}

export const BlogCard = ({
  post,
  showExcerpt = true,
  showAuthor = true,
  showViews = true,
  className = '',
}: BlogCardProps) => {
  const publishedDate = post.published_at ? new Date(post.published_at) : null;
  const categoryColor = post.category?.color || '#3B82F6';

  return (
    <Card className={`group hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <Link to={`/blog/${post.slug}`} className="block">
        {post.featured_image_url && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}

        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {post.category && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
              >
                {post.category.name}
              </Badge>
            )}

            {post.featured && (
              <Badge variant="default" className="text-xs">
                Featured
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          {showExcerpt && post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.slice(0, 3).map((tagRelation) => (
                <Badge key={tagRelation.tag.id} variant="outline" className="text-xs">
                  {tagRelation.tag.name}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {showAuthor && post.author && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>{post.author.name || post.author.email}</span>
                </div>
              )}

              {publishedDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(publishedDate, { addSuffix: true })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{post.reading_time_minutes} min read</span>
              </div>

              {showViews && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.views_count}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

import { useBlogCategories } from '@/hooks/useBlogCategories';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface BlogCategoriesProps {
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | undefined) => void;
  className?: string;
}

export const BlogCategories = ({
  selectedCategoryId,
  onCategorySelect,
  className = '',
}: BlogCategoriesProps) => {
  const { data: categories, isLoading, error } = useBlogCategories();

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={`text-sm text-destructive ${className}`}>Failed to load categories</div>;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-sm text-muted-foreground">Categories</h3>

      <ScrollArea className="w-full">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategoryId ? 'outline' : 'default'}
            size="sm"
            onClick={() => onCategorySelect(undefined)}
            className="h-8 text-xs"
          >
            All Posts
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategorySelect(category.id)}
              className="h-8 text-xs"
              style={{
                backgroundColor: selectedCategoryId === category.id ? category.color : undefined,
                borderColor: category.color,
                color: selectedCategoryId === category.id ? 'white' : category.color,
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

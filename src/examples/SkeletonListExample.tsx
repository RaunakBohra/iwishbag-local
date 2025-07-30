import { useQuery } from '@tanstack/react-query';
import { ConditionalSkeleton } from '@/components/ui/skeleton-loader';
import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonText, SkeletonButton } from '@/components/ui/skeleton';

// Example: Product List with Skeleton Loading

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

// Custom skeleton for a single product card
const ProductCardSkeleton = () => (
  <Card className="p-4 space-y-3">
    <Skeleton className="h-48 w-full rounded-lg" /> {/* Image */}
    <Skeleton className="h-6 w-3/4" /> {/* Title */}
    <SkeletonText lines={2} /> {/* Description */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-20" /> {/* Price */}
      <SkeletonButton /> {/* Action button */}
    </div>
  </Card>
);

// Custom skeleton for the entire list
const ProductListSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

// Actual product card component
const ProductCard = ({ product }: { product: Product }) => (
  <Card className="p-4 space-y-3 hover:shadow-lg transition-shadow">
    <img 
      src={product.imageUrl} 
      alt={product.name}
      className="h-48 w-full object-cover rounded-lg"
    />
    <h3 className="text-lg font-semibold">{product.name}</h3>
    <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
    <div className="flex justify-between items-center">
      <span className="text-xl font-bold">${product.price}</span>
      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Add to Cart
      </button>
    </div>
  </Card>
);

// Main component with skeleton loading
export function ProductList() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json() as Promise<Product[]>;
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Our Products</h1>
      
      <ConditionalSkeleton
        conditions={[
          { data: products, isLoading }
        ]}
        minimumLoadTime={500} // Half second minimum to prevent flashing
        skeleton={<ProductListSkeleton />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </ConditionalSkeleton>
    </div>
  );
}

// Example with filters and multiple data sources
export function ProductListWithFilters() {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json() as Promise<Product[]>;
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      return response.json();
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Shop by Category</h1>
      
      <div className="flex gap-6">
        {/* Sidebar with categories */}
        <aside className="w-64">
          <ConditionalSkeleton
            conditions={[
              { data: categories, isLoading: categoriesLoading }
            ]}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
          >
            <div className="space-y-2">
              {categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </ConditionalSkeleton>
        </aside>

        {/* Product grid */}
        <main className="flex-1">
          <ConditionalSkeleton
            conditions={[
              { data: products, isLoading: productsLoading },
              { data: categories, isLoading: categoriesLoading }
            ]}
            minimumLoadTime={600}
            skeleton={<ProductListSkeleton />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products?.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </ConditionalSkeleton>
        </main>
      </div>
    </div>
  );
}
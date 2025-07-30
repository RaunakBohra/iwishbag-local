import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

// Specialized skeleton components for common UI patterns
function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

function SkeletonInput({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-full', className)} />;
}

function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-24', className)} />;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );
}

function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" /> {/* Label */}
          <SkeletonInput />
        </div>
      ))}
      <SkeletonButton className="w-full" />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonInput, SkeletonButton, SkeletonCard, SkeletonForm };

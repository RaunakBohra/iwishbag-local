import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { RateLimitManager } from '@/components/admin/RateLimitManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RateLimitManagement() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need administrator privileges to access rate limit management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold">Rate Limit Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure rate limiting rules to prevent abuse and ensure fair usage
        </p>
      </div>

      {/* Rate Limit Manager Component */}
      <RateLimitManager />

      {/* Additional Information */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            ⚡ Rate Limiting Benefits
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Prevents brute force attacks</li>
            <li>• Protects against API abuse</li>
            <li>• Ensures fair resource usage</li>
            <li>• Improves overall performance</li>
            <li>• Reduces server load</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">
            🎯 Best Practices
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Start with logging before blocking</li>
            <li>• Set reasonable thresholds</li>
            <li>• Monitor false positives</li>
            <li>• Use different limits for different endpoints</li>
            <li>• Consider user experience</li>
          </ul>
        </div>
      </div>

      {/* Implementation Tips */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-2">
          💡 Implementation Tips
        </h3>
        <div className="text-sm text-yellow-800 space-y-2">
          <p>
            <strong>Authentication Endpoints:</strong> Use stricter limits (3-5 attempts) with longer periods to prevent brute force attacks.
          </p>
          <p>
            <strong>API Endpoints:</strong> Balance between preventing abuse and allowing legitimate high-volume usage. Consider API key-based limits.
          </p>
          <p>
            <strong>Search/Browse:</strong> Be generous with limits to avoid frustrating genuine users who are actively shopping.
          </p>
          <p>
            <strong>Testing:</strong> Always test rules in "log" mode first to understand impact before enabling blocking.
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { WAFManager } from '@/components/admin/WAFManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function WAFManagement() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [showDemo, setShowDemo] = useState(true);

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
            You need administrator privileges to access WAF management.
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
        
        <h1 className="text-3xl font-bold">WAF Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure Web Application Firewall rules to protect your application
        </p>
      </div>

      {/* Demo Mode Alert */}
      {showDemo && (
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            WAF rules are shown in demo mode. To deploy actual rules to Cloudflare:
            <ol className="mt-2 ml-4 list-decimal">
              <li>Get your Cloudflare API token from your account settings</li>
              <li>Add VITE_CF_API_TOKEN to your environment variables</li>
              <li>Enable the rules you want and click "Deploy Rules"</li>
            </ol>
            <Button
              variant="link"
              onClick={() => setShowDemo(false)}
              className="mt-2 p-0"
            >
              Dismiss this message
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* WAF Manager Component */}
      <WAFManager />

      {/* Additional Information */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            🛡️ Current Protection Status
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Bot Fight Mode: Active</li>
            <li>✓ DDoS Protection: Always On</li>
            <li>✓ SSL/TLS: Full (Strict)</li>
            <li>✓ DNSSEC: Enabled</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">
            📊 Security Benefits
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Blocks SQL injection attempts</li>
            <li>• Prevents XSS attacks</li>
            <li>• Protects against brute force</li>
            <li>• Filters malicious bot traffic</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Lock, 
  Mail, 
  Globe, 
  Users, 
  Clock, 
  MapPin, 
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';
import { cloudflareService } from '@/services/CloudflareFeatureService';
import { useToast } from '@/hooks/use-toast';

export default function ZeroTrustSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    appName: 'iwishBag Admin Dashboard',
    domain: 'admin.iwishbag.com',
    emailDomains: ['iwishbag.com', 'gmail.com'],
    sessionDuration: '24h',
    requireMFA: true,
  });
  const [setupResult, setSetupResult] = useState<any>(null);

  const handleQuickSetup = async () => {
    try {
      setLoading(true);
      
      const result = await cloudflareService.setupZeroTrustApplication({
        name: config.appName,
        domain: config.domain,
        type: 'self_hosted',
        session_duration: config.sessionDuration,
        policies: [
          {
            name: 'Admin Access Policy',
            action: 'allow',
            include: config.emailDomains.map(domain => ({
              email_domain: { domain }
            })),
          },
        ],
      });

      setSetupResult(result);
      
      toast({
        title: 'Zero Trust Configured!',
        description: `Application "${config.appName}" has been created successfully`,
      });
    } catch (error) {
      console.error('Zero Trust setup failed:', error);
      toast({
        title: 'Setup Failed',
        description: `Failed to configure Zero Trust: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Text copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Zero Trust Access Setup</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Secure your admin dashboard with enterprise-grade authentication and access controls
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Free Tier: Up to 50 users
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              No code changes required
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="quick-setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quick-setup">Quick Setup</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Quick Setup Tab */}
          <TabsContent value="quick-setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-indigo-600" />
                    Application Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your Zero Trust application settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-name">Application Name</Label>
                    <Input
                      id="app-name"
                      value={config.appName}
                      onChange={(e) => setConfig(prev => ({ ...prev, appName: e.target.value }))}
                      placeholder="iwishBag Admin Dashboard"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Application Domain</Label>
                    <Input
                      id="domain"
                      value={config.domain}
                      onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="admin.iwishbag.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-domains">Allowed Email Domains</Label>
                    <Input
                      id="email-domains"
                      value={config.emailDomains.join(', ')}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        emailDomains: e.target.value.split(',').map(d => d.trim()) 
                      }))}
                      placeholder="iwishbag.com, gmail.com"
                    />
                    <p className="text-xs text-gray-500">
                      Comma-separated list of email domains that can access the admin dashboard
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-duration">Session Duration</Label>
                    <select
                      id="session-duration"
                      value={config.sessionDuration}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionDuration: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="1h">1 hour</option>
                      <option value="4h">4 hours</option>
                      <option value="8h">8 hours</option>
                      <option value="24h">24 hours</option>
                      <option value="168h">1 week</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleQuickSetup}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up Zero Trust...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Deploy Zero Trust Access
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Benefits Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Security Benefits
                  </CardTitle>
                  <CardDescription>
                    What you get with Zero Trust Access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Email-based Authentication</h4>
                        <p className="text-sm text-gray-600">One-time PIN or SSO integration</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Team Management</h4>
                        <p className="text-sm text-gray-600">Control access by email domain or individual users</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Session Control</h4>
                        <p className="text-sm text-gray-600">Automatic timeout and re-authentication</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Geographic Controls</h4>
                        <p className="text-sm text-gray-600">Restrict access by location and IP</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Smartphone className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Device Trust</h4>
                        <p className="text-sm text-gray-600">Certificate-based device authentication</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Setup Result */}
            {setupResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Setup Complete!
                  </CardTitle>
                  <CardDescription>
                    Your Zero Trust application has been configured successfully
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">Application Created</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Application ID: <code className="bg-green-100 px-1 rounded">{setupResult.id}</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Next Steps:</h4>
                    <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                      <li>
                        Visit{' '}
                        <a 
                          href={`https://${config.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {config.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {' '}to test access
                      </li>
                      <li>You'll be redirected to Cloudflare authentication</li>
                      <li>Enter your email (must be from allowed domains)</li>
                      <li>Check email for PIN code and complete login</li>
                      <li>You'll be redirected to your admin dashboard</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(`https://${config.domain}`, '_blank')}
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Test Access
                    </Button>
                    <Button
                      onClick={() => handleCopy(JSON.stringify(setupResult, null, 2))}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>DNS Configuration</CardTitle>
                  <CardDescription>
                    Add a DNS record for your admin subdomain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <div className="grid grid-cols-3 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
                      <span>Type</span>
                      <span>Name</span>
                      <span>Target</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span>CNAME</span>
                      <span>admin</span>
                      <span>iwishbag.com</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Make sure proxy status is enabled (orange cloud)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Identity Providers</CardTitle>
                  <CardDescription>
                    Choose how users authenticate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-gray-900">One-time PIN (Recommended)</h4>
                      <p className="text-sm text-gray-600">PIN sent via email - no setup required</p>
                      <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                        Easiest Setup
                      </Badge>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-gray-900">Google Workspace</h4>
                      <p className="text-sm text-gray-600">SSO with your Google accounts</p>
                      <Badge variant="secondary" className="mt-2">
                        Enterprise
                      </Badge>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-gray-900">GitHub</h4>
                      <p className="text-sm text-gray-600">Developer-friendly authentication</p>
                      <Badge variant="secondary" className="mt-2">
                        Developer
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Testing Checklist
                </CardTitle>
                <CardDescription>
                  Verify your Zero Trust setup is working correctly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    'Admin can access with company email',
                    'Developers can access with approved emails', 
                    'Unauthorized users are blocked',
                    'Session timeout works correctly',
                    'Mobile access works',
                    'Audit logs are captured',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={`test-${index}`}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor={`test-${index}`} className="text-sm text-gray-700">
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Policies</CardTitle>
                  <CardDescription>
                    Example configurations for enhanced security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Time-based Access</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  "name": "Business Hours Only",
  "require": [{
    "time": {
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "hours": ["09:00", "18:00"],
      "timezone": "Asia/Kolkata"
    }
  }]
}`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Geographic Restrictions</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  "name": "Location Policy",
  "require": [{
    "geo": {
      "country_code": ["IN", "NP", "US"]
    }
  }]
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoring</CardTitle>
                  <CardDescription>
                    Track access and security events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">Access Logs</h4>
                      <p className="text-sm text-blue-700">
                        View all login attempts and user activity in Zero Trust dashboard
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900">Analytics</h4>
                      <p className="text-sm text-purple-700">
                        Monitor user patterns, failed attempts, and geographic distribution
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900">Alerts</h4>
                      <p className="text-sm text-green-700">
                        Set up notifications for suspicious activity or policy violations
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => window.open('https://dash.cloudflare.com/zero-trust', '_blank')}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Zero Trust Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
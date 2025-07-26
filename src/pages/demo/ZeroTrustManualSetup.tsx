import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Globe, 
  Mail, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  ArrowRight,
  Terminal,
  FileCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ZeroTrustManualSetup() {
  const { toast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const dnsRecord = {
    type: 'CNAME',
    name: 'admin',
    content: 'whyteclub.com',
    proxy: true
  };

  const redirectCode = `// Add to your App.tsx or main routing file
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function AdminRedirect() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useEffect(() => {
    // Only redirect on production
    if (window.location.hostname === 'whyteclub.com' && isAdminRoute) {
      // Preserve the path after /admin
      const adminPath = location.pathname.replace('/admin', '');
      window.location.href = \`https://admin.whyteclub.com\${adminPath}\${location.search}\`;
    }
  }, [location]);
  
  return null;
}`;

  const envConfig = `# Add to your .env file
VITE_ADMIN_URL=https://admin.whyteclub.com
VITE_PUBLIC_URL=https://whyteclub.com

# For development
# VITE_ADMIN_URL=http://localhost:8082
# VITE_PUBLIC_URL=http://localhost:8082`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Zero Trust Manual Setup Guide</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Complete guide to set up Zero Trust Access for your admin panel at admin.whyteclub.com
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              No Code Changes to Auth
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Free for up to 50 users
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Progress</CardTitle>
            <CardDescription>Complete all steps to enable Zero Trust</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">{completedSteps.length} of 4 steps</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps.length / 4) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="step1" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="step1">1. DNS Setup</TabsTrigger>
            <TabsTrigger value="step2">2. Create App</TabsTrigger>
            <TabsTrigger value="step3">3. Configure</TabsTrigger>
            <TabsTrigger value="step4">4. Code Changes</TabsTrigger>
          </TabsList>

          {/* Step 1: DNS Setup */}
          <TabsContent value="step1" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Step 1: Create DNS Record
                    </CardTitle>
                    <CardDescription>
                      Add a CNAME record for admin.whyteclub.com
                    </CardDescription>
                  </div>
                  <Button
                    variant={completedSteps.includes('dns') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStep('dns')}
                  >
                    {completedSteps.includes('dns') ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">DNS Record Details:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <p className="font-mono font-medium">{dnsRecord.type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-mono font-medium">{dnsRecord.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Content:</span>
                      <p className="font-mono font-medium">{dnsRecord.content}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Proxy:</span>
                      <p className="font-mono font-medium">Enabled (Orange Cloud)</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Important: Make sure the proxy status is enabled (orange cloud icon) for Zero Trust to work
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open('https://dash.cloudflare.com/?to=/:account/whyteclub.com/dns', '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open DNS Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(`Type: CNAME\nName: admin\nContent: whyteclub.com\nProxy: Enabled`, 'DNS record details')}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Create Application */}
          <TabsContent value="step2" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Step 2: Create Zero Trust Application
                    </CardTitle>
                    <CardDescription>
                      Set up the application in Cloudflare Zero Trust
                    </CardDescription>
                  </div>
                  <Button
                    variant={completedSteps.includes('app') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStep('app')}
                  >
                    {completedSteps.includes('app') ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Manual Steps:</h4>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                      <div>
                        <p className="font-medium">Go to Zero Trust Dashboard</p>
                        <p className="text-gray-600">Navigate to Access → Applications</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                      <div>
                        <p className="font-medium">Add an Application</p>
                        <p className="text-gray-600">Click "Add an application" → Select "Self-hosted"</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                      <div>
                        <p className="font-medium">Configure Application</p>
                        <div className="mt-2 bg-gray-50 p-3 rounded text-xs font-mono">
                          <p>Name: whyteclub Admin Dashboard</p>
                          <p>Subdomain: admin</p>
                          <p>Domain: whyteclub.com</p>
                          <p>Path: (leave empty)</p>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>

                <Button
                  onClick={() => window.open('https://one.dash.cloudflare.com/?to=/:account/access/apps', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Zero Trust Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Configure Policies */}
          <TabsContent value="step3" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Step 3: Configure Access Policies
                    </CardTitle>
                    <CardDescription>
                      Set who can access your admin panel
                    </CardDescription>
                  </div>
                  <Button
                    variant={completedSteps.includes('policy') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStep('policy')}
                  >
                    {completedSteps.includes('policy') ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Recommended Policy:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Policy Name:</p>
                        <p className="font-mono text-sm">Admin Access Policy</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Action:</p>
                        <p className="font-mono text-sm">Allow</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Include (Any of these):</p>
                        <ul className="text-sm font-mono mt-1 space-y-1">
                          <li>• Emails ending in: @whyteclub.com</li>
                          <li>• Emails ending in: @gmail.com</li>
                          <li>• Specific emails: admin@example.com</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Session Duration:</h4>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900">
                        Set to 24 hours for convenience, or shorter for higher security
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Identity Providers:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600 mb-2" />
                        <p className="font-medium text-sm">One-time PIN</p>
                        <p className="text-xs text-gray-600">Recommended - No setup</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <Users className="h-5 w-5 text-purple-600 mb-2" />
                        <p className="font-medium text-sm">Google SSO</p>
                        <p className="text-xs text-gray-600">For Google Workspace</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Code Changes */}
          <TabsContent value="step4" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      Step 4: Add Redirect Logic (Optional)
                    </CardTitle>
                    <CardDescription>
                      Automatically redirect /admin routes to admin subdomain
                    </CardDescription>
                  </div>
                  <Button
                    variant={completedSteps.includes('code') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStep('code')}
                  >
                    {completedSteps.includes('code') ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This step is optional. Your existing auth will work without any changes. This just adds convenience redirects.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">1. Add Redirect Component</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(redirectCode, 'Redirect code')}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{redirectCode}</code>
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">2. Environment Variables</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(envConfig, 'Environment variables')}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{envConfig}</code>
                    </pre>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Remember:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Your existing authentication remains unchanged</li>
                      <li>• Zero Trust adds an extra security layer</li>
                      <li>• Users will authenticate twice (Cloudflare + your app)</li>
                      <li>• This provides defense in depth</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Card */}
            {completedSteps.length === 4 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5" />
                    Setup Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-800 mb-4">
                    Zero Trust is now protecting your admin panel. Test it by visiting:
                  </p>
                  <Button
                    onClick={() => window.open('https://admin.whyteclub.com', '_blank')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit admin.whyteclub.com
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">DNS not resolving?</p>
              <p className="text-sm text-gray-600">Wait 5-10 minutes for DNS propagation. Make sure proxy is enabled.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm">Getting authentication loops?</p>
              <p className="text-sm text-gray-600">Clear cookies for admin.whyteclub.com and try again.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm">Can't see Zero Trust in dashboard?</p>
              <p className="text-sm text-gray-600">Zero Trust is available on all plans. Look for "Access" in the sidebar.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Zap,
  Shield,
  Globe,
  Activity,
  Cloud,
  Lock
} from 'lucide-react';

interface Feature {
  name: string;
  status: 'completed' | 'failed' | 'manual';
  icon: React.ElementType;
  description: string;
  details?: string;
  link?: string;
}

export default function CloudflareSetupSummary() {
  const features: Feature[] = [
    {
      name: 'Turnstile CAPTCHA',
      status: 'completed',
      icon: Shield,
      description: 'Bot protection on all public forms',
      details: 'Successfully integrated on quote forms, contact forms, and auth flows'
    },
    {
      name: 'Web Analytics & RUM',
      status: 'completed',
      icon: Activity,
      description: 'Real-time performance monitoring',
      details: 'Tracking user behavior and performance metrics'
    },
    {
      name: 'Workers & API Proxy',
      status: 'completed',
      icon: Cloud,
      description: 'Edge computing for API handling',
      details: 'Created Worker proxy for Cloudflare API access'
    },
    {
      name: 'D1 Database',
      status: 'completed',
      icon: Zap,
      description: 'Edge database for caching',
      details: 'Currency rates cached at edge locations'
    },
    {
      name: 'Rate Limiting',
      status: 'completed',
      icon: Shield,
      description: 'API protection from abuse',
      details: 'Configured limits for quotes, auth, and public endpoints'
    },
    {
      name: 'Zero Trust Access',
      status: 'manual',
      icon: Lock,
      description: 'Enterprise authentication for admin',
      details: 'Requires DNS configuration and domain setup',
      link: 'https://dash.cloudflare.com/zero-trust'
    },
    {
      name: 'Speed Optimizations',
      status: 'manual',
      icon: Zap,
      description: 'Polish, Brotli, Auto Minify',
      details: 'Requires additional API permissions',
      link: 'https://dash.cloudflare.com/?to=/:account/whyteclub.com/speed/optimization'
    },
    {
      name: 'Load Balancing',
      status: 'manual',
      icon: Globe,
      description: 'High availability setup',
      details: 'Requires subscription upgrade',
      link: 'https://dash.cloudflare.com/?to=/:account/whyteclub.com/traffic/load-balancing'
    }
  ];

  const completedCount = features.filter(f => f.status === 'completed').length;
  const manualCount = features.filter(f => f.status === 'manual').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Cloudflare Setup Summary</h1>
          <p className="text-lg text-gray-600">
            We've successfully configured {completedCount} features. {manualCount} features require manual setup.
          </p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm text-gray-600">{completedCount} of {features.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / features.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{completedCount} Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>{manualCount} Manual</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.name} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        feature.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          feature.status === 'completed' ? 'text-green-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.name}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={feature.status === 'completed' ? 'default' : 'secondary'}>
                      {feature.status === 'completed' ? 'Active' : 'Manual Setup'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{feature.details}</p>
                  {feature.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(feature.link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Configure in Dashboard
                    </Button>
                  )}
                </CardContent>
                {feature.status === 'completed' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Complete the remaining manual configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Manual Setup Required:</h4>
              
              <div className="pl-4 space-y-3">
                <div>
                  <h5 className="font-medium text-gray-800">1. Zero Trust Access</h5>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    <li>• Create DNS record for admin subdomain</li>
                    <li>• Configure identity provider (Email OTP recommended)</li>
                    <li>• Set up access policies for your team</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800">2. Speed Optimizations</h5>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    <li>• Enable Polish for image optimization</li>
                    <li>• Turn on Brotli compression</li>
                    <li>• Configure Auto Minify for CSS/JS/HTML</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800">3. Load Balancing</h5>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    <li>• Requires paid plan upgrade</li>
                    <li>• Set up health monitors</li>
                    <li>• Configure origin pools</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => window.open('https://dash.cloudflare.com', '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Cloudflare Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/demo'}
                className="flex-1"
              >
                Back to Demo Index
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
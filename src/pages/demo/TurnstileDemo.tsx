import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { Palette, Monitor, Sun, Moon, Smartphone, Computer, Info, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAABluNSYgD5S5Rf_j';

export default function TurnstileDemo() {
  const [completedTokens, setCompletedTokens] = useState<Record<string, string>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});
  const [resetKeys, setResetKeys] = useState<Record<string, number>>({});

  const handleSuccess = (demoId: string) => (token: string) => {
    console.log(`✅ [${demoId}] Turnstile Success:`, token.substring(0, 20) + '...');
    setCompletedTokens(prev => ({ ...prev, [demoId]: token }));
    setErrorStates(prev => ({ ...prev, [demoId]: '' }));
  };

  const handleError = (demoId: string) => (error: string) => {
    console.log(`❌ [${demoId}] Turnstile Error:`, error);
    setErrorStates(prev => ({ ...prev, [demoId]: error }));
    setCompletedTokens(prev => ({ ...prev, [demoId]: '' }));
  };

  const handleExpired = (demoId: string) => () => {
    console.log(`⏰ [${demoId}] Turnstile Expired`);
    setCompletedTokens(prev => ({ ...prev, [demoId]: '' }));
    setErrorStates(prev => ({ ...prev, [demoId]: 'Token expired' }));
  };

  const resetWidget = (demoId: string) => {
    setResetKeys(prev => ({ ...prev, [demoId]: (prev[demoId] || 0) + 1 }));
    setCompletedTokens(prev => ({ ...prev, [demoId]: '' }));
    setErrorStates(prev => ({ ...prev, [demoId]: '' }));
  };

  const getStatusIcon = (demoId: string) => {
    if (completedTokens[demoId]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (errorStates[demoId]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Monitor className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = (demoId: string) => {
    if (completedTokens[demoId]) {
      return `✅ Verified: ${completedTokens[demoId].substring(0, 20)}...`;
    }
    if (errorStates[demoId]) {
      return `❌ Error: ${errorStates[demoId]}`;
    }
    return '⏳ Waiting for verification...';
  };

  const themes = [
    { id: 'auto', name: 'Auto Theme', icon: Monitor, description: 'Adapts to system preference', theme: 'auto' as const },
    { id: 'light', name: 'Light Theme', icon: Sun, description: 'Always light appearance', theme: 'light' as const },
    { id: 'dark', name: 'Dark Theme', icon: Moon, description: 'Always dark appearance', theme: 'dark' as const },
  ];

  const sizes = [
    { id: 'normal', name: 'Normal Size', icon: Computer, description: 'Standard size widget', size: 'normal' as const },
    { id: 'compact', name: 'Compact Size', icon: Smartphone, description: 'Smaller size for mobile', size: 'compact' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Palette className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Turnstile CAPTCHA Themes</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore different appearance options for Cloudflare Turnstile CAPTCHA integration
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>Site Key: {SITE_KEY.substring(0, 20)}...</span>
          </div>
        </div>

        {/* Theme Variations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="h-6 w-6 text-teal-600" />
            Theme Options
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themes.map((themeOption) => (
              <Card key={themeOption.id} className="relative">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <themeOption.icon className="h-5 w-5 text-teal-600" />
                    {themeOption.name}
                  </CardTitle>
                  <CardDescription>{themeOption.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Turnstile Widget */}
                  <div className="flex justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <TurnstileWidget
                      key={`${themeOption.id}-${resetKeys[themeOption.id] || 0}`}
                      siteKey={SITE_KEY}
                      theme={themeOption.theme}
                      size="normal"
                      action={`demo_${themeOption.id}`}
                      onSuccess={handleSuccess(themeOption.id)}
                      onError={handleError(themeOption.id)}
                      onExpired={handleExpired(themeOption.id)}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {getStatusIcon(themeOption.id)}
                      <span className="font-medium">Status:</span>
                    </div>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                      {getStatusText(themeOption.id)}
                    </p>
                  </div>

                  {/* Reset Button */}
                  <Button
                    onClick={() => resetWidget(themeOption.id)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Widget
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Size Variations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Computer className="h-6 w-6 text-teal-600" />
            Size Options
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sizes.map((sizeOption) => (
              <Card key={sizeOption.id} className="relative">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <sizeOption.icon className="h-5 w-5 text-teal-600" />
                    {sizeOption.name}
                  </CardTitle>
                  <CardDescription>{sizeOption.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Turnstile Widget */}
                  <div className="flex justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <TurnstileWidget
                      key={`${sizeOption.id}-${resetKeys[sizeOption.id] || 0}`}
                      siteKey={SITE_KEY}
                      theme="auto"
                      size={sizeOption.size}
                      action={`demo_${sizeOption.id}`}
                      onSuccess={handleSuccess(sizeOption.id)}
                      onError={handleError(sizeOption.id)}
                      onExpired={handleExpired(sizeOption.id)}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {getStatusIcon(sizeOption.id)}
                      <span className="font-medium">Status:</span>
                    </div>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                      {getStatusText(sizeOption.id)}
                    </p>
                  </div>

                  {/* Reset Button */}
                  <Button
                    onClick={() => resetWidget(sizeOption.id)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Widget
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Combined Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="h-6 w-6 text-teal-600" />
            Combined Examples
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light + Compact */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sun className="h-5 w-5 text-teal-600" />
                  Light + Compact
                  <Badge variant="secondary">Recommended for Mobile</Badge>
                </CardTitle>
                <CardDescription>Perfect for mobile forms and light interfaces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                  <TurnstileWidget
                    key={`light-compact-${resetKeys['light-compact'] || 0}`}
                    siteKey={SITE_KEY}
                    theme="light"
                    size="compact"
                    action="demo_light_compact"
                    onSuccess={handleSuccess('light-compact')}
                    onError={handleError('light-compact')}
                    onExpired={handleExpired('light-compact')}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {getStatusIcon('light-compact')}
                    <span className="font-medium">Status:</span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                    {getStatusText('light-compact')}
                  </p>
                </div>
                <Button
                  onClick={() => resetWidget('light-compact')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Widget
                </Button>
              </CardContent>
            </Card>

            {/* Dark + Normal */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Moon className="h-5 w-5 text-teal-600" />
                  Dark + Normal
                  <Badge variant="secondary">Recommended for Desktop</Badge>
                </CardTitle>
                <CardDescription>Great for dark mode interfaces and desktop forms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 border-2 border-dashed border-gray-800 rounded-lg bg-gray-900">
                  <TurnstileWidget
                    key={`dark-normal-${resetKeys['dark-normal'] || 0}`}
                    siteKey={SITE_KEY}
                    theme="dark"
                    size="normal"
                    action="demo_dark_normal"
                    onSuccess={handleSuccess('dark-normal')}
                    onError={handleError('dark-normal')}
                    onExpired={handleExpired('dark-normal')}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {getStatusIcon('dark-normal')}
                    <span className="font-medium">Status:</span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono">
                    {getStatusText('dark-normal')}
                  </p>
                </div>
                <Button
                  onClick={() => resetWidget('dark-normal')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Widget
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Configuration Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-teal-600" />
              How to Configure Turnstile Theme
            </CardTitle>
            <CardDescription>
              You can customize the appearance of Turnstile widgets in your application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Available Themes:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">auto</Badge>
                    Automatically adapts to user's system preference (default)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">light</Badge>
                    Always shows light theme regardless of system setting
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">dark</Badge>
                    Always shows dark theme regardless of system setting
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Available Sizes:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">normal</Badge>
                    Standard size widget (recommended for desktop)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">compact</Badge>
                    Smaller size widget (recommended for mobile)
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Code Example:</h4>
              <pre className="text-sm text-gray-600 overflow-x-auto">
{`<TurnstileWidget
  siteKey={SITE_KEY}
  theme="light"        // or "dark" or "auto"
  size="compact"       // or "normal"
  onSuccess={handleSuccess}
  onError={handleError}
/>`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
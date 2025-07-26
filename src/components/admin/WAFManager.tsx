import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { wafService, WAFRule, WAFStats } from '@/services/CloudflareWAFService';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Globe, Lock, Bot, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function WAFManager() {
  const [rules, setRules] = useState<WAFRule[]>([]);
  const [stats, setStats] = useState<WAFStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    // Load default rules
    setRules(wafService.getDefaultRules());
    
    // Load stats
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const wafStats = await wafService.getStats();
      setStats(wafStats);
    } catch (error) {
      console.error('Failed to load WAF stats:', error);
    }
  };

  const toggleRule = (index: number) => {
    const newRules = [...rules];
    newRules[index].enabled = !newRules[index].enabled;
    setRules(newRules);
  };

  const deployRules = async () => {
    setDeploying(true);
    try {
      const enabledRules = rules.filter(r => r.enabled);
      const result = await wafService.deployRules(enabledRules);
      
      toast({
        title: 'WAF Rules Deployed',
        description: `Successfully deployed ${result.deployed.length} rules`,
      });
    } catch (error: any) {
      toast({
        title: 'Deployment Not Available',
        description: error.message || 'WAF rules can only be deployed via Cloudflare dashboard or backend API.',
        variant: 'destructive'
      });
    } finally {
      setDeploying(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sql_injection':
      case 'xss':
      case 'path_traversal':
        return <AlertTriangle className="h-4 w-4" />;
      case 'bot':
        return <Bot className="h-4 w-4" />;
      case 'geo':
        return <Globe className="h-4 w-4" />;
      case 'admin':
      case 'payment':
        return <Lock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'block':
        return 'destructive';
      case 'challenge':
      case 'js_challenge':
      case 'managed_challenge':
        return 'warning';
      case 'log':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Web Application Firewall (WAF)
          </h2>
          <p className="text-muted-foreground">
            Configure security rules to protect your application from attacks
          </p>
        </div>
        <Button
          onClick={deployRules}
          disabled={deploying || rules.filter(r => r.enabled).length === 0}
          className="flex items-center gap-2"
        >
          {deploying ? (
            <>Deploying...</>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Deploy Rules
            </>
          )}
        </Button>
      </div>

      {/* Demo Mode Notice */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">Demo Mode Active</AlertTitle>
        <AlertDescription className="text-yellow-800">
          WAF rules are shown in demo mode. To deploy actual rules:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Use the Cloudflare dashboard directly</li>
            <li>Or implement a backend API endpoint to proxy Cloudflare API calls</li>
            <li>Browser CORS policy prevents direct API calls to Cloudflare</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.blockedRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2)}% of traffic
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Challenged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.challengedRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Required verification</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.passedRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Clean traffic</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WAF Rules Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Security Rules</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Active Rules Count */}
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              {rules.filter(r => r.enabled).length} of {rules.length} rules are enabled. 
              Deploy changes to apply them to your site.
            </AlertDescription>
          </Alert>

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <Card key={index} className={cn(
                "transition-opacity",
                !rule.enabled && "opacity-60"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(rule.category)}
                      <div>
                        <CardTitle className="text-base">{rule.name}</CardTitle>
                        <CardDescription>{rule.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getActionBadgeVariant(rule.action)}>
                        {rule.action.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(index)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-xs">{rule.expression}</code>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">{rule.category}</Badge>
                    <Badge variant="outline">{rule.ruleType}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          {stats && (
            <>
              {/* Top Blocked IPs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Blocked IPs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topBlockedIPs.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <code className="text-sm">{item.ip}</code>
                        <Badge variant="destructive">{item.count} blocks</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Blocked Paths */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Targeted Paths</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topBlockedPaths.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <code className="text-sm">{item.path}</code>
                        <Badge variant="warning">{item.count} attempts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Block Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Block Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topBlockReasons.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{item.reason}</span>
                        <Badge>{item.count} blocks</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WAF Configuration</CardTitle>
              <CardDescription>
                Advanced settings for Web Application Firewall
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  To fully configure WAF rules, you need to add your Cloudflare API token 
                  to the environment variables: VITE_CF_API_TOKEN
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">OWASP Core Rule Set</h4>
                    <p className="text-sm text-muted-foreground">
                      Industry-standard protection against common vulnerabilities
                    </p>
                  </div>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Cloudflare Managed Rules</h4>
                    <p className="text-sm text-muted-foreground">
                      Additional protection from Cloudflare's threat intelligence
                    </p>
                  </div>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Security Level</h4>
                    <p className="text-sm text-muted-foreground">
                      Overall security sensitivity
                    </p>
                  </div>
                  <Badge>High</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  Open Cloudflare Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
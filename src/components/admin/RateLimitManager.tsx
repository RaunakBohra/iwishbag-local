import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { rateLimitService, RateLimitRule, RateLimitStats } from '@/services/CloudflareRateLimitService';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Users, 
  BarChart3,
  Info,
  Plus,
  Edit,
  Trash2,
  TestTube,
  Lightbulb
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function RateLimitManager() {
  const [rules, setRules] = useState<RateLimitRule[]>([]);
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadRules();
    loadStats();
    loadRecommendations();
  }, []);

  const loadRules = async () => {
    try {
      const rateLimitRules = await rateLimitService.getRules();
      setRules(rateLimitRules);
    } catch (error) {
      console.error('Failed to load rate limit rules:', error);
    }
  };

  const loadStats = async () => {
    try {
      const rateLimitStats = await rateLimitService.getStats();
      setStats(rateLimitStats);
    } catch (error) {
      console.error('Failed to load rate limit stats:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recs = await rateLimitService.getRecommendations();
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const toggleRule = async (index: number) => {
    const rule = rules[index];
    const newRules = [...rules];
    newRules[index].enabled = !newRules[index].enabled;
    setRules(newRules);

    try {
      await rateLimitService.updateRule(rule.id!, { enabled: !rule.enabled });
      toast({
        title: 'Rule Updated',
        description: `${rule.name} has been ${!rule.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      // Revert on error
      newRules[index].enabled = rule.enabled;
      setRules(newRules);
      toast({
        title: 'Update Failed',
        description: 'Failed to update rate limit rule',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (rule: RateLimitRule) => {
    if (!rule.id) return;

    try {
      await rateLimitService.deleteRule(rule.id);
      setRules(rules.filter(r => r.id !== rule.id));
      toast({
        title: 'Rule Deleted',
        description: `${rule.name} has been removed`,
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete rate limit rule',
        variant: 'destructive'
      });
    }
  };

  const testRule = async (rule: RateLimitRule) => {
    try {
      const result = await rateLimitService.testRule(rule);
      toast({
        title: 'Test Results',
        description: `Would block ${result.wouldBlock} requests, challenge ${result.wouldChallenge}, affecting ${result.affectedUsers} users`,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test rate limit rule',
        variant: 'destructive'
      });
    }
  };

  const saveRule = async () => {
    if (!editingRule) return;

    try {
      if (editingRule.id) {
        await rateLimitService.updateRule(editingRule.id, editingRule);
        setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
      } else {
        const newRule = await rateLimitService.createRule(editingRule);
        setRules([...rules, newRule]);
      }

      toast({
        title: 'Rule Saved',
        description: `${editingRule.name} has been saved successfully`,
      });
      setShowEditDialog(false);
      setShowNewDialog(false);
      setEditingRule(null);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save rate limit rule',
        variant: 'destructive'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'api':
        return <BarChart3 className="h-4 w-4" />;
      case 'quotes':
        return <TrendingUp className="h-4 w-4" />;
      case 'search':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'text-blue-600';
      case 'api':
        return 'text-purple-600';
      case 'quotes':
        return 'text-green-600';
      case 'search':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'block':
        return 'destructive';
      case 'challenge':
        return 'secondary';
      case 'log':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Format chart data
  const chartData = stats?.timeSeriesData.map(item => ({
    time: new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    requests: item.requests,
    blocked: item.blocked
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Rate Limiting
          </h2>
          <p className="text-muted-foreground">
            Configure rate limits to prevent abuse and ensure fair usage
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingRule({
              name: '',
              description: '',
              endpoint: '',
              threshold: 100,
              period: 60,
              action: 'log',
              enabled: true,
              matchBy: 'ip',
              category: 'general'
            });
            setShowNewDialog(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Demo Mode Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Rate Limiting Overview</AlertTitle>
        <AlertDescription className="text-blue-800">
          Rate limiting helps protect your application from abuse, spam, and DDoS attacks. 
          Rules are evaluated in real-time at Cloudflare's edge network.
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
              <CardTitle className="text-sm font-medium text-red-600">Rate Limited</CardTitle>
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
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rules.filter(r => r.enabled).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of {rules.length} total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Offender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">
                {stats.topOffenders[0]?.identifier || 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.topOffenders[0]?.count || 0} hits
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rate Limit Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rate Limit Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule, index) => (
              <Card key={rule.id || index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("flex items-center gap-2", getCategoryColor(rule.category))}>
                          {getCategoryIcon(rule.category)}
                          <h3 className="font-semibold">{rule.name}</h3>
                        </div>
                        <Badge variant={getActionVariant(rule.action)}>
                          {rule.action}
                        </Badge>
                        <Badge variant="outline">
                          {rule.threshold} / {rule.period}s
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          {rule.endpoint}
                        </span>
                        <span className="text-muted-foreground">
                          Match by: {rule.matchBy}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testRule(rule)}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(index)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Volume & Rate Limiting</CardTitle>
              <CardDescription>24-hour overview of requests and rate limit actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#3b82f6" 
                    name="Total Requests"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke="#ef4444" 
                    name="Rate Limited"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Rate Limited IPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topOffenders.map((offender, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{offender.identifier}</span>
                      <div className="text-right">
                        <div className="font-semibold">{offender.count} hits</div>
                        <div className="text-xs text-muted-foreground">
                          Last seen: {new Date(offender.lastSeen).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Limited Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topEndpoints.map((endpoint, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{endpoint.endpoint}</span>
                        <Badge variant="secondary">{endpoint.blocked} blocked</Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(endpoint.blocked / endpoint.hits) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {endpoint.hits.toLocaleString()} total requests
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>AI-Powered Recommendations</AlertTitle>
            <AlertDescription>
              Based on your traffic patterns, here are suggested rate limit adjustments
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold mb-2">{rec.endpoint}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                      <div className="flex items-center gap-4">
                        {rec.currentThreshold && (
                          <div>
                            <span className="text-sm text-muted-foreground">Current: </span>
                            <Badge variant="outline">{rec.currentThreshold} requests</Badge>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-muted-foreground">Recommended: </span>
                          <Badge variant="default">{rec.recommendedThreshold} requests</Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const existingRule = rules.find(r => r.endpoint === rec.endpoint);
                        if (existingRule) {
                          setEditingRule({
                            ...existingRule,
                            threshold: rec.recommendedThreshold
                          });
                        } else {
                          setEditingRule({
                            name: `Rate limit for ${rec.endpoint}`,
                            description: rec.reason,
                            endpoint: rec.endpoint,
                            threshold: rec.recommendedThreshold,
                            period: 60,
                            action: 'challenge',
                            enabled: true,
                            matchBy: 'ip',
                            category: 'api'
                          });
                        }
                        setShowEditDialog(true);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/New Rule Dialog */}
      <Dialog open={showEditDialog || showNewDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEditDialog(false);
          setShowNewDialog(false);
          setEditingRule(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id ? 'Edit Rate Limit Rule' : 'Create Rate Limit Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure the rate limiting parameters for this rule
            </DialogDescription>
          </DialogHeader>
          
          {editingRule && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g., Login Rate Limit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint Pattern</Label>
                  <Input
                    id="endpoint"
                    value={editingRule.endpoint}
                    onChange={(e) => setEditingRule({ ...editingRule, endpoint: e.target.value })}
                    placeholder="e.g., /api/auth/login"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  placeholder="Describe what this rule protects against"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Request Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={editingRule.threshold}
                    onChange={(e) => setEditingRule({ ...editingRule, threshold: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="period">Time Period (seconds)</Label>
                  <Input
                    id="period"
                    type="number"
                    value={editingRule.period}
                    onChange={(e) => setEditingRule({ ...editingRule, period: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={editingRule.action}
                    onValueChange={(value: any) => setEditingRule({ ...editingRule, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="log">Log Only</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                      <SelectItem value="simulate">Simulate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="matchBy">Match By</Label>
                  <Select
                    value={editingRule.matchBy}
                    onValueChange={(value: any) => setEditingRule({ ...editingRule, matchBy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="user">User ID</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingRule.category}
                    onValueChange={(value: any) => setEditingRule({ ...editingRule, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="quotes">Quotes</SelectItem>
                      <SelectItem value="search">Search</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={editingRule.enabled}
                  onCheckedChange={(checked) => setEditingRule({ ...editingRule, enabled: checked })}
                />
                <Label htmlFor="enabled">Enable this rule immediately</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setShowNewDialog(false);
              setEditingRule(null);
            }}>
              Cancel
            </Button>
            <Button onClick={saveRule}>
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
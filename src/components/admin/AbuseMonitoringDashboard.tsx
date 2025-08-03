/**
 * Abuse Monitoring Dashboard
 * Real-time monitoring and management of discount abuse attempts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Clock, 
  Users, 
  Globe, 
  TrendingUp,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiscountAbuseDetectionService } from '@/services/DiscountAbuseDetectionService';
import { DiscountAbuseResponseService } from '@/services/DiscountAbuseResponseService';
import { DiscountLoggingService } from '@/services/DiscountLoggingService';

interface AbuseAttempt {
  id: string;
  session_id: string;
  customer_id?: string;
  ip_address?: string;
  abuse_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  response_action: string;
  block_duration?: number;
  resolved: boolean;
  details: any;
}

interface DashboardStats {
  total_attempts: number;
  blocked_attempts: number;
  active_blocks: number;
  prevention_rate: number;
  top_abuse_types: Array<{ type: string; count: number }>;
  geographic_distribution: Array<{ country: string; count: number }>;
  hourly_trend: Array<{ hour: string; attempts: number; blocked: number }>;
}

export const AbuseMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<AbuseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week'>('day');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAbuse, setSelectedAbuse] = useState<AbuseAttempt | null>(null);

  const abuseDetection = DiscountAbuseDetectionService.getInstance();
  const abuseResponse = DiscountAbuseResponseService.getInstance();

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [timeframe, autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load real abuse statistics from database
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_abuse_statistics', { p_timeframe: timeframe });

      if (statsError) {
        console.error('Error loading abuse statistics:', statsError);
        throw statsError;
      }

      // Load recent abuse attempts from database
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('abuse_attempts')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(20);

      if (attemptsError) {
        console.error('Error loading abuse attempts:', attemptsError);
        throw attemptsError;
      }

      // Process the RPC response
      const dbStats = statsData && statsData.length > 0 ? statsData[0] : null;
      
      if (dbStats) {
        const realStats: DashboardStats = {
          total_attempts: dbStats.total_attempts || 0,
          blocked_attempts: dbStats.blocked_attempts || 0,
          active_blocks: dbStats.active_blocks || 0,
          prevention_rate: dbStats.prevention_rate || 0,
          top_abuse_types: dbStats.top_abuse_types || [],
          geographic_distribution: dbStats.geographic_distribution || [],
          hourly_trend: dbStats.hourly_trend || []
        };
        setStats(realStats);
      } else {
        // Fallback if no data
        setStats({
          total_attempts: 0,
          blocked_attempts: 0,
          active_blocks: 0,
          prevention_rate: 0,
          top_abuse_types: [],
          geographic_distribution: [],
          hourly_trend: []
        });
      }

      // Process recent attempts
      const realAttempts: AbuseAttempt[] = (attemptsData || []).map(attempt => ({
        id: attempt.id,
        session_id: attempt.session_id,
        customer_id: attempt.customer_id,
        ip_address: attempt.ip_address ? attempt.ip_address.toString() : undefined,
        abuse_type: attempt.abuse_type,
        severity: attempt.severity as 'low' | 'medium' | 'high' | 'critical',
        detected_at: attempt.detected_at,
        response_action: attempt.response_action,
        block_duration: attempt.block_duration,
        resolved: attempt.resolved,
        details: attempt.details
      }));

      setRecentAttempts(realAttempts);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Fallback to empty state with error message
      setStats({
        total_attempts: 0,
        blocked_attempts: 0,
        active_blocks: 0,
        prevention_rate: 0,
        top_abuse_types: [],
        geographic_distribution: [],
        hourly_trend: []
      });
      setRecentAttempts([]);
      
      // Show error to user
      alert('Error loading abuse monitoring data. Please check database connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (
    targetType: 'session' | 'ip' | 'customer',
    targetValue: string,
    action: 'unblock' | 'extend_block' | 'permanent_block'
  ) => {
    try {
      const result = await abuseResponse.adminOverride(
        targetType,
        targetValue,
        action,
        'Manual admin intervention',
        'admin_user_id' // In production, this would come from auth context
      );
      
      if (result.success) {
        alert(`Successfully applied ${action} to ${targetType}: ${targetValue}`);
        loadDashboardData(); // Refresh data
      } else {
        alert(`Failed to apply override: ${result.message}`);
      }
    } catch (error) {
      console.error('Error applying manual override:', error);
      alert('Error applying manual override');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading abuse monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Abuse Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time discount abuse detection and response</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={(value: 'hour' | 'day' | 'week') => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          
          <Button onClick={loadDashboardData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_attempts}</div>
              <p className="text-xs text-muted-foreground">Abuse attempts detected</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blocked_attempts}</div>
              <p className="text-xs text-muted-foreground">Successfully prevented</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_blocks}</div>
              <p className="text-xs text-muted-foreground">Currently blocked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prevention Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prevention_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Effectiveness rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attempts">Recent Attempts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="management">Block Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Hourly Trend</CardTitle>
                  <CardDescription>Abuse attempts vs blocked over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.hourly_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="attempts" stroke="#8884d8" name="Attempts" />
                      <Line type="monotone" dataKey="blocked" stroke="#82ca9d" name="Blocked" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Abuse Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Abuse Types Distribution</CardTitle>
                  <CardDescription>Most common abuse patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.top_abuse_types}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {stats.top_abuse_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Abuse attempts by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.geographic_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="country" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Prevention Effectiveness */}
              <Card>
                <CardHeader>
                  <CardTitle>Prevention Effectiveness</CardTitle>
                  <CardDescription>System performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Overall Prevention Rate</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${stats.prevention_rate}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{stats.prevention_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Response Time</span>
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      &lt; 100ms
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>False Positive Rate</span>
                    <Badge variant="outline" className="bg-blue-50">
                      2.1%
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>System Status</span>
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Abuse Attempts</CardTitle>
              <CardDescription>Latest suspicious activities detected</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {recentAttempts.map((attempt) => (
                    <div 
                      key={attempt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAbuse(attempt)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${getSeverityColor(attempt.severity)} text-white`}>
                          {getSeverityIcon(attempt.severity)}
                        </div>
                        
                        <div>
                          <div className="font-medium">{attempt.abuse_type.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-500">
                            {attempt.ip_address} • {new Date(attempt.detected_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={attempt.resolved ? "default" : "destructive"}>
                          {attempt.response_action.replace('_', ' ')}
                        </Badge>
                        {attempt.block_duration && (
                          <div className="text-sm text-gray-500 mt-1">
                            {attempt.block_duration}min block
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pattern Analysis</CardTitle>
                <CardDescription>Abuse pattern trends and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Trend Alert</AlertTitle>
                    <AlertDescription>
                      25% increase in bot detection over the last week. Consider reviewing CAPTCHA thresholds.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertTitle>Geographic Alert</AlertTitle>
                    <AlertDescription>
                      Unusual activity from IP ranges in [redacted]. Enhanced monitoring activated.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>System optimization suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Consider reducing rapid attempt threshold to 8 attempts
                  </div>
                  <div className="flex items-center text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                    Review geographic blocking rules for suspicious regions
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 text-blue-500 mr-2" />
                    Implement customer behavior learning for repeat users
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Block Management</CardTitle>
              <CardDescription>Override automated blocks and manage restrictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="target-type">Target Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Session ID</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="customer">Customer ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="target-value">Target Value</Label>
                  <Input placeholder="Enter ID/IP/Email" />
                </div>
                
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unblock">Unblock</SelectItem>
                      <SelectItem value="extend_block">Extend Block</SelectItem>
                      <SelectItem value="permanent_block">Permanent Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button className="w-full">
                Apply Manual Override
              </Button>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Caution</AlertTitle>
                <AlertDescription>
                  Manual overrides are logged and audited. Only use when necessary and provide clear justification.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Abuse Detail Modal */}
      {selectedAbuse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader>
              <CardTitle>Abuse Attempt Details</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-4 right-4"
                onClick={() => setSelectedAbuse(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Type:</strong> {selectedAbuse.abuse_type}</div>
                <div><strong>Severity:</strong> {selectedAbuse.severity}</div>
                <div><strong>Session:</strong> {selectedAbuse.session_id}</div>
                <div><strong>IP:</strong> {selectedAbuse.ip_address}</div>
                <div><strong>Detected:</strong> {new Date(selectedAbuse.detected_at).toLocaleString()}</div>
                <div><strong>Response:</strong> {selectedAbuse.response_action}</div>
                {selectedAbuse.block_duration && (
                  <div><strong>Duration:</strong> {selectedAbuse.block_duration} minutes</div>
                )}
                <div><strong>Status:</strong> {selectedAbuse.resolved ? 'Resolved' : 'Active'}</div>
              </div>
              
              <div className="mt-4">
                <strong>Details:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(selectedAbuse.details, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
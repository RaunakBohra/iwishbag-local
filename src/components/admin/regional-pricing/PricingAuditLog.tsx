/**
 * PricingAuditLog - Audit Trail Component for Pricing Changes
 * 
 * Features:
 * - Complete audit trail of pricing changes
 * - User-friendly change history display
 * - Filtering and search capabilities
 * - Export functionality for compliance
 * - Real-time statistics dashboard
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Activity,
  Calendar,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
  User,
  Search,
  Download,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface AuditLogEntry {
  id: string;
  service_name: string;
  change_type: string;
  identifier: string;
  identifier_name: string;
  old_rate: number;
  new_rate: number;
  change_reason: string;
  change_method: string;
  user_email: string;
  affected_countries: number;
  created_at: string;
}

interface AuditStats {
  total_changes: number;
  changes_by_method: Record<string, number>;
  changes_by_type: Record<string, number>;
  most_active_users: Record<string, number>;
  most_changed_services: Record<string, number>;
}

interface PricingAuditLogProps {
  serviceKey?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PricingAuditLog: React.FC<PricingAuditLogProps> = ({
  serviceKey
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [filters, setFilters] = useState({
    service_id: serviceKey || '',
    identifier: '',
    change_type: 'all',
    change_method: 'all',
    days_back: 30
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  // Fetch audit log entries
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['pricing-audit-logs', filters],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      let serviceId: string | null = null;
      
      // Convert service key to service UUID if provided
      if (filters.service_id) {
        const { data: service, error: serviceError } = await supabase
          .from('addon_services')
          .select('id')
          .eq('service_key', filters.service_id)
          .single();
        
        if (serviceError) {
          console.warn('Failed to find service ID for key:', filters.service_id, serviceError);
        } else {
          serviceId = service.id;
        }
      }
      
      const { data, error } = await supabase.rpc('get_pricing_change_history', {
        p_service_id: serviceId,
        p_identifier: filters.identifier || null,
        p_days_back: filters.days_back,
        p_limit: 100
      });
      
      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: false,
  });
  
  // Fetch audit statistics
  const { data: auditStats, isLoading: statsLoading } = useQuery({
    queryKey: ['pricing-audit-stats', filters.days_back],
    queryFn: async (): Promise<AuditStats> => {
      const { data, error } = await supabase.rpc('get_pricing_audit_stats', {
        p_days_back: filters.days_back
      });
      
      if (error) throw error;
      return data?.[0] || {
        total_changes: 0,
        changes_by_method: {},
        changes_by_type: {},
        most_active_users: {},
        most_changed_services: {}
      };
    },
    refetchOnWindowFocus: false,
  });
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'country': return <Badge variant="outline" className="bg-blue-50 text-blue-700">Country</Badge>;
      case 'regional': return <Badge variant="outline" className="bg-green-50 text-green-700">Regional</Badge>;
      case 'continental': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Continental</Badge>;
      case 'global': return <Badge variant="outline" className="bg-orange-50 text-orange-700">Global</Badge>;
      case 'bulk': return <Badge variant="outline" className="bg-red-50 text-red-700">Bulk</Badge>;
      default: return <Badge variant="outline">{changeType}</Badge>;
    }
  };
  
  const getChangeMethodIcon = (method: string) => {
    switch (method) {
      case 'manual': return <Badge variant="secondary">Manual</Badge>;
      case 'bulk': return <Badge variant="default">Bulk</Badge>;
      case 'csv_import': return <Badge variant="outline">CSV Import</Badge>;
      case 'api': return <Badge variant="destructive">API</Badge>;
      case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
      default: return <Badge variant="outline">{method}</Badge>;
    }
  };
  
  const formatRateChange = (oldRate: number, newRate: number) => {
    if (!oldRate) return `Set to ${(newRate * 100).toFixed(3)}%`;
    
    const change = newRate - oldRate;
    const changePercent = (change / oldRate) * 100;
    const arrow = change > 0 ? '↑' : '↓';
    const color = change > 0 ? 'text-red-600' : 'text-green-600';
    
    return (
      <div className="flex items-center gap-2">
        <span>{(oldRate * 100).toFixed(3)}% → {(newRate * 100).toFixed(3)}%</span>
        <span className={`text-sm ${color}`}>
          {arrow} {Math.abs(changePercent).toFixed(1)}%
        </span>
      </div>
    );
  };
  
  const exportAuditData = async () => {
    try {
      if (!auditLogs || auditLogs.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(auditLogs[0]);
      const csvContent = [
        headers.join(','),
        ...auditLogs.map(row => 
          headers.map(header => {
            const value = row[header as keyof AuditLogEntry];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pricing-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Audit log exported successfully' });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };
  
  // Filter logs based on search term
  const filteredLogs = auditLogs?.filter(log => 
    searchTerm === '' || 
    log.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.change_reason.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // ============================================================================
  // RENDER METHODS
  // ============================================================================
  
  const renderStatsPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Changes</p>
              <p className="text-2xl font-bold">{auditStats?.total_changes || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Most Active Method</p>
              <p className="text-lg font-semibold">
                {auditStats?.changes_by_method 
                  ? Object.entries(auditStats.changes_by_method)
                      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
                  : 'None'
                }
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Most Changed Type</p>
              <p className="text-lg font-semibold">
                {auditStats?.changes_by_type 
                  ? Object.entries(auditStats.changes_by_type)
                      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
                  : 'None'
                }
              </p>
            </div>
            <Filter className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Days Range</p>
              <p className="text-lg font-semibold">{filters.days_back} days</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label>Days Back</Label>
            <Select 
              value={filters.days_back.toString()} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, days_back: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Change Type</Label>
            <Select 
              value={filters.change_type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, change_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="continental">Continental</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="bulk">Bulk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Method</Label>
            <Select 
              value={filters.change_method} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, change_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="bulk">Bulk</SelectItem>
                <SelectItem value="csv_import">CSV Import</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end gap-2">
            <Button onClick={() => refetchLogs()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportAuditData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderAuditTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>
          Showing {filteredLogs.length} of {auditLogs?.length || 0} changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logsLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No audit logs found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rate Change</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-gray-500">{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.service_name}</div>
                    </TableCell>
                    <TableCell>{getChangeTypeIcon(log.change_type)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-mono">{log.identifier}</div>
                        {log.identifier_name && (
                          <div className="text-gray-500">{log.identifier_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatRateChange(log.old_rate, log.new_rate)}</TableCell>
                    <TableCell>{getChangeMethodIcon(log.change_method)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{log.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-48 truncate" title={log.change_reason}>
                        {log.change_reason}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pricing Audit Log</h2>
          <p className="text-muted-foreground">
            Track all pricing changes and maintain compliance
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          <Eye className="w-4 h-4 mr-2" />
          {filteredLogs.length} records
        </Badge>
      </div>
      
      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs" className="space-y-6">
          {renderFilters()}
          {renderAuditTable()}
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          {renderStatsPanel()}
          
          {/* Additional stats tables can be added here */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Users</CardTitle>
              </CardHeader>
              <CardContent>
                {auditStats?.most_active_users && Object.keys(auditStats.most_active_users).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(auditStats.most_active_users).map(([user, count]) => (
                      <div key={user} className="flex justify-between items-center">
                        <span className="text-sm">{user}</span>
                        <Badge variant="secondary">{count} changes</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No user activity in selected period</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Services</CardTitle>
              </CardHeader>
              <CardContent>
                {auditStats?.most_changed_services && Object.keys(auditStats.most_changed_services).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(auditStats.most_changed_services).map(([service, count]) => (
                      <div key={service} className="flex justify-between items-center">
                        <span className="text-sm">{service}</span>
                        <Badge variant="secondary">{count} changes</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No service changes in selected period</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
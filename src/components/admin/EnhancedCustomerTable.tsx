import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Mail, 
  Eye, 
  Star,
  DollarSign,
  ShoppingCart,
  Calendar,
  MapPin,
  User,
  Activity
} from 'lucide-react';
import { CustomerCodToggle } from './CustomerCodToggle';
import { CustomerEmailDialog } from './CustomerEmailDialog';

import { format } from 'date-fns';
import React from 'react';

// Define the shape of the customer data
export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  user_addresses: { 
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }[];
};

export type CustomerAnalytics = {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  quoteCount: number;
  avgOrderValue: number;
  lastActivity: Date;
};

interface EnhancedCustomerTableProps {
  customers: Customer[];
  customerAnalytics?: CustomerAnalytics[];
  onUpdateCod: (userId: string, codEnabled: boolean) => void;
  onUpdateNotes: (userId: string, notes: string) => void;
  onUpdateName: (userId: string, name: string) => void;
  onCustomerSelect?: (customerId: string) => void;
  isUpdating: boolean;
}

export const EnhancedCustomerTable = ({
  customers,
  customerAnalytics,
  onUpdateCod,
  onUpdateNotes,
  onUpdateName,
  onCustomerSelect,
  isUpdating,
}: EnhancedCustomerTableProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const sortedCustomers = [...customers].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue: any, bValue: any;
    
    switch (key) {
      case 'name':
        aValue = a.full_name || '';
        bValue = b.full_name || '';
        break;
      case 'email':
        aValue = a.email;
        bValue = b.email;
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'total_spent':
        const aAnalytics = customerAnalytics?.find(analytics => analytics.customerId === a.id);
        const bAnalytics = customerAnalytics?.find(analytics => analytics.customerId === b.id);
        aValue = aAnalytics?.totalSpent || 0;
        bValue = bAnalytics?.totalSpent || 0;
        break;
      case 'order_count':
        const aOrderAnalytics = customerAnalytics?.find(analytics => analytics.customerId === a.id);
        const bOrderAnalytics = customerAnalytics?.find(analytics => analytics.customerId === b.id);
        aValue = aOrderAnalytics?.orderCount || 0;
        bValue = bOrderAnalytics?.orderCount || 0;
        break;
      case 'location':
        aValue = a.user_addresses[0]?.country || '';
        bValue = b.user_addresses[0]?.country || '';
        break;
      default:
        aValue = a[key as keyof Customer];
        bValue = b[key as keyof Customer];
    }
    
    if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getCustomerStatus = (customer: Customer) => {
    if (customer.internal_notes?.includes("VIP")) return { label: "VIP", variant: "default" as const };
    if (customer.cod_enabled) return { label: "Active", variant: "secondary" as const };
    return { label: "Inactive", variant: "outline" as const };
  };

  const getCustomerAnalytics = (customerId: string) => {
    return customerAnalytics?.find(analytics => analytics.customerId === customerId);
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(selectedCustomer === customerId ? null : customerId);
    onCustomerSelect?.(customerId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('name')}>
                  Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('location')}>
                  Location <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('created_at')}>
                  Date Joined <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('total_spent')}>
                  Total Spent <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('order_count')}>
                  Orders <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCustomers.map((customer) => {
              const analytics = getCustomerAnalytics(customer.id);
              const status = getCustomerStatus(customer);
              const isExpanded = selectedCustomer === customer.id;
              
              return (
                <React.Fragment key={customer.id}>
                  <TableRow 
                    className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                    onClick={() => handleCustomerSelect(customer.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {customer.full_name || 'Unnamed User'}
                            {customer.internal_notes?.includes("VIP") && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {customer.user_addresses[0] ? 
                            `${customer.user_addresses[0].city}, ${customer.user_addresses[0].country}` : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(customer.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          ${analytics?.totalSpent.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {analytics?.orderCount || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({analytics?.quoteCount || 0} quotes)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              const newName = prompt('Enter new name:', customer.full_name || '');
                              if (newName) onUpdateName(customer.id, newName);
                            }}
                          >
                            Edit Name
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const newNotes = prompt('Enter new notes:', customer.internal_notes || '');
                              if (newNotes !== null) onUpdateNotes(customer.id, newNotes);
                            }}
                          >
                            Edit Notes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <CustomerEmailDialog 
                              customerEmail={customer.email} 
                              customerName={customer.full_name || undefined} 
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CustomerCodToggle
                              customerId={customer.id}
                              codEnabled={customer.cod_enabled}
                              onToggle={onUpdateCod}
                              isUpdating={isUpdating}
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Customer Details */}
                  {isExpanded && (
                    <TableRow key={`${customer.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0">
                        <div className="bg-muted/20 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Customer Analytics */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Customer Analytics
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Total Spent:</span>
                                  <span className="font-medium">${analytics?.totalSpent.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Orders:</span>
                                  <span className="font-medium">{analytics?.orderCount || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Quotes:</span>
                                  <span className="font-medium">{analytics?.quoteCount || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Avg Order:</span>
                                  <span className="font-medium">${analytics?.avgOrderValue.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Last Activity:</span>
                                  <span className="font-medium">
                                    {analytics?.lastActivity ? 
                                      format(analytics.lastActivity, 'MMM dd, yyyy') : 
                                      'Never'
                                    }
                                  </span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Customer Addresses */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  Addresses
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Shipping Addresses</p>
                                  {customer.user_addresses && customer.user_addresses.length > 0 ? (
                                    <div className="space-y-1">
                                      {customer.user_addresses.map((address) => (
                                        <div key={address.id} className="flex items-center space-x-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm">
                                            {`${address.address_line1}${address.address_line2 ? `, ${address.address_line2}` : ''}, ${address.city}, ${address.country}`}
                                          </span>
                                          {address.is_default && (
                                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                              Default
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No addresses saved.</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Customer Notes */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Notes & Settings
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">Internal Notes:</label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {customer.internal_notes || 'No notes'}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">COD Enabled:</span>
                                  <CustomerCodToggle
                                    customerId={customer.id}
                                    codEnabled={customer.cod_enabled}
                                    onToggle={onUpdateCod}
                                    isUpdating={isUpdating}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <CustomerEmailDialog 
                                    customerEmail={customer.email} 
                                    customerName={customer.full_name || undefined} 
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  MapPin,
  Calendar,
  Star,
  DollarSign,
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Edit,
  Mail,
  Phone,
  Activity,
  ExternalLink,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Customer, CustomerAnalytics } from './CustomerTable';
import { CustomerCodToggle } from './CustomerCodToggle';
import { CustomerEmailDialog } from './CustomerEmailDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Body, BodySmall } from '@/components/ui/typography';
import { format } from 'date-fns';

interface CompactCustomerListItemProps {
  customer: Customer;
  analytics?: CustomerAnalytics;
  isSelected: boolean;
  onSelect: (customerId: string, selected: boolean) => void;
  onUpdateCod: (userId: string, codEnabled: boolean) => void;
  onUpdateNotes: (userId: string, notes: string) => void;
  onUpdateName: (userId: string, name: string) => void;
  isUpdating: boolean;
}

export const CompactCustomerListItem = ({
  customer,
  analytics,
  isSelected,
  onSelect,
  onUpdateCod,
  onUpdateNotes,
  onUpdateName,
  isUpdating,
}: CompactCustomerListItemProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const customerName = customer.full_name || 'Unnamed Customer';
  const primaryAddress = customer.user_addresses?.[0];
  const addressText = primaryAddress
    ? `${primaryAddress.city}, ${primaryAddress.country}`
    : 'No address';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return diffHours <= 1 ? 'Just now' : `${diffHours}h ago`;
    }
    return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getCustomerStatus = () => {
    if (customer.internal_notes?.includes('VIP')) {
      return {
        label: 'VIP',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: Star,
      };
    }
    if (customer.cod_enabled) {
      return {
        label: 'Active',
        className: 'bg-green-100 text-green-700 border-green-300',
        icon: User,
      };
    }
    return {
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: User,
    };
  };

  const status = getCustomerStatus();
  const StatusIcon = status.icon;

  return (
    <>
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200',
          isSelected && 'ring-2 ring-teal-500 border-teal-500',
        )}
      >
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(customer.id, !!checked)}
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
            />
          </div>

          {/* Status Indicator */}
          <div
            className={cn(
              'flex-shrink-0 w-2 h-12 rounded-full',
              customer.internal_notes?.includes('VIP') && 'bg-yellow-500',
              customer.cod_enabled && !customer.internal_notes?.includes('VIP') && 'bg-green-500',
              !customer.cod_enabled && !customer.internal_notes?.includes('VIP') && 'bg-gray-300',
            )}
          />

          {/* Customer Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-teal-600" />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Body className="font-semibold text-gray-900 flex items-center gap-2">
                  {customerName}
                  {customer.internal_notes?.includes('VIP') && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </Body>
                <Badge
                  className={cn('text-xs font-medium flex items-center gap-1', status.className)}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <BodySmall className="text-gray-500">{formatDate(customer.created_at)}</BodySmall>
              </div>
            </div>

            {/* Email Row */}
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <BodySmall className="text-gray-700 truncate">{customer.email}</BodySmall>
            </div>

            {/* Analytics Row */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 font-medium">
                  {formatCurrency(analytics?.totalSpent || 0)}
                </BodySmall>
                <BodySmall className="text-gray-500">spent</BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 font-medium">
                  {analytics?.orderCount || 0}
                </BodySmall>
                <BodySmall className="text-gray-500">orders</BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <BodySmall className="text-gray-500">
                  ({analytics?.quoteCount || 0} quotes)
                </BodySmall>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">{addressText}</BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">
                  {analytics?.lastActivity
                    ? format(new Date(analytics.lastActivity), 'MMM dd, yyyy')
                    : 'No activity'}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">
                  {formatCurrency(analytics?.avgOrderValue || 0)} avg
                </BodySmall>
              </div>
            </div>

            {/* Notes Row (if exists) */}
            {customer.internal_notes && (
              <div className="flex items-center gap-2 mb-2">
                <BodySmall className="text-gray-500 italic truncate">
                  "{customer.internal_notes}"
                </BodySmall>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const newName = prompt('Enter new name:', customer.full_name || '');
                    if (newName) onUpdateName(customer.id, newName);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const newNotes = prompt('Enter new notes:', customer.internal_notes || '');
                    if (newNotes !== null) onUpdateNotes(customer.id, newNotes);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
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
                  <Settings className="h-4 w-4 mr-2" />
                  <CustomerCodToggle
                    customerId={customer.id}
                    codEnabled={customer.cod_enabled}
                    onToggle={onUpdateCod}
                    isUpdating={isUpdating}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Quick Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {customerName} - Customer Details
            </DialogTitle>
            <DialogDescription>
              {customer.email} • Joined {format(new Date(customer.created_at), 'MMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-500 font-medium">Status</BodySmall>
              </div>
              <Badge
                className={cn(
                  'text-xs font-medium flex items-center gap-1 w-fit',
                  status.className,
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Total Spent</BodySmall>
                <Body className="font-semibold">{formatCurrency(analytics?.totalSpent || 0)}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Orders</BodySmall>
                <Body className="font-semibold">{analytics?.orderCount || 0}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Quotes</BodySmall>
                <Body className="font-semibold">{analytics?.quoteCount || 0}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Avg Order Value</BodySmall>
                <Body className="font-semibold">
                  {formatCurrency(analytics?.avgOrderValue || 0)}
                </Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Last Activity</BodySmall>
                <Body className="font-semibold">
                  {analytics?.lastActivity
                    ? format(new Date(analytics.lastActivity), 'MMM dd, yyyy')
                    : 'No activity'}
                </Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">COD Enabled</BodySmall>
                <Body className="font-semibold">{customer.cod_enabled ? 'Yes' : 'No'}</Body>
              </div>
            </div>

            {/* Addresses */}
            <div>
              <BodySmall className="text-gray-500 font-medium mb-2">Addresses</BodySmall>
              {customer.user_addresses && customer.user_addresses.length > 0 ? (
                <div className="space-y-2">
                  {customer.user_addresses.map((address, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>
                          {address.address_line1}
                          {address.address_line2 && `, ${address.address_line2}`}, {address.city},{' '}
                          {address.country}
                        </span>
                        {address.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Body className="text-gray-500">No addresses saved</Body>
              )}
            </div>

            {/* Notes */}
            {customer.internal_notes && (
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Internal Notes</BodySmall>
                <Body className="text-gray-700">{customer.internal_notes}</Body>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                // Navigate to customer details page if it exists
                // navigate(`/admin/customers/${customer.id}`);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

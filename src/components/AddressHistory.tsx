import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { AddressChange } from '@/types/address';
import { getAddressChangeSummary, compareAddresses } from '@/lib/addressValidation';
import { ShippingAddress } from '@/types/address';

interface AddressHistoryProps {
  history: AddressChange[];
  isLoading?: boolean;
  showFullHistory?: boolean;
}

export const AddressHistory: React.FC<AddressHistoryProps> = ({
  history,
  isLoading = false,
  showFullHistory = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(showFullHistory);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Address History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Address History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No address changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'lock':
        return '🔒';
      case 'unlock':
        return '🔓';
      default:
        return '📝';
    }
  };

  const formatChangeType = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'Address Created';
      case 'update':
        return 'Address Updated';
      case 'lock':
        return 'Address Locked';
      case 'unlock':
        return 'Address Unlocked';
      default:
        return 'Address Modified';
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'lock':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'unlock':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const displayHistory = showFullHistory ? history : history.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Address History
            <Badge variant="secondary">{history.length}</Badge>
          </CardTitle>
          {!showFullHistory && history.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show More
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(isExpanded ? history : displayHistory).map((change) => {
            // Calculate changes between this and previous entry
            let changes: {
              field: keyof ShippingAddress;
              oldValue: string;
              newValue: string;
            }[] = [];
            if (change.oldAddress && change.newAddress) {
              changes = compareAddresses(change.oldAddress, change.newAddress);
            } else if (change.newAddress && !change.oldAddress) {
              // This is a creation - all fields are new
              changes = Object.entries(change.newAddress).map(([field, value]) => ({
                field,
                oldValue: '',
                newValue: value || '',
              }));
            }

            const changeSummary = getAddressChangeSummary(changes);
            const hasCountryChange = changes.some((c) => c.field === 'country');
            const isSignificantChange = changes.length > 2 || hasCountryChange;

            return (
              <Card key={change.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getChangeIcon(change.changeType)}</span>
                      <div>
                        <p className="font-medium">{formatChangeType(change.changeType)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(change.changedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge className={getChangeColor(change.changeType)}>
                        {change.changeType}
                      </Badge>
                      {hasCountryChange && <Badge variant="destructive">Country Changed</Badge>}
                      {isSignificantChange && <Badge variant="outline">Significant</Badge>}
                    </div>
                  </div>

                  {/* Change Summary */}
                  {changeSummary && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Changes:</p>
                      <p className="text-sm text-gray-600">{changeSummary}</p>
                    </div>
                  )}

                  {/* Change Reason */}
                  {change.changeReason && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Reason:</p>
                      <p className="text-sm text-gray-600">{change.changeReason}</p>
                    </div>
                  )}

                  {/* Detailed Changes */}
                  {changes.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <ChevronDown className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-1 text-xs">
                          {changes.map((changeDetail, changeIndex) => (
                            <div
                              key={changeIndex}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                            >
                              <span className="font-medium min-w-[80px]">
                                {changeDetail.field === 'fullName' && (
                                  <User className="h-3 w-3 inline mr-1" />
                                )}
                                {changeDetail.field === 'streetAddress' && (
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                )}
                                {changeDetail.field === 'phone' && (
                                  <Phone className="h-3 w-3 inline mr-1" />
                                )}
                                {changeDetail.field === 'email' && (
                                  <Mail className="h-3 w-3 inline mr-1" />
                                )}
                                {changeDetail.field
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, (str) => str.toUpperCase())}
                                :
                              </span>
                              <span className="text-gray-500">
                                {changeDetail.oldValue ? `"${changeDetail.oldValue}"` : '(empty)'}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-700 font-medium">
                                {changeDetail.newValue ? `"${changeDetail.newValue}"` : '(empty)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Country Change Warning */}
                  {hasCountryChange && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                      <div className="flex items-center gap-1 text-orange-800">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs font-medium">Country change detected</span>
                      </div>
                      <p className="text-xs text-orange-700 mt-1">
                        This change affects shipping costs and delivery times.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Show More/Less for full history view */}
        {showFullHistory && history.length > 5 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Showing {history.length} total changes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Database } from '@/types/database';

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderShipment = Database['public']['Tables']['order_shipments']['Row'];

interface WarehouseGroup {
  warehouse: string;
  items: OrderItem[];
  shipments: OrderShipment[];
  totalValue: number;
  totalWeight: number;
  status: string;
}

interface MultiWarehouseOrderSummaryProps {
  orderItems?: OrderItem[];
  orderShipments?: OrderShipment[];
  primaryWarehouse: string;
  onWarehouseClick?: (warehouse: string) => void;
  onShipmentClick?: (shipmentId: string) => void;
}

export const MultiWarehouseOrderSummary: React.FC<MultiWarehouseOrderSummaryProps> = ({
  orderItems = [],
  orderShipments = [],
  primaryWarehouse,
  onWarehouseClick,
  onShipmentClick
}) => {
  // Group items by warehouse
  const warehouseGroups: WarehouseGroup[] = React.useMemo(() => {
    const groups = new Map<string, WarehouseGroup>();
    
    // Initialize with primary warehouse
    if (!groups.has(primaryWarehouse)) {
      groups.set(primaryWarehouse, {
        warehouse: primaryWarehouse,
        items: [],
        shipments: [],
        totalValue: 0,
        totalWeight: 0,
        status: 'pending'
      });
    }
    
    // Group items by assigned warehouse
    orderItems.forEach(item => {
      const warehouse = item.assigned_warehouse || primaryWarehouse;
      
      if (!groups.has(warehouse)) {
        groups.set(warehouse, {
          warehouse,
          items: [],
          shipments: [],
          totalValue: 0,
          totalWeight: 0,
          status: 'pending'
        });
      }
      
      const group = groups.get(warehouse)!;
      group.items.push(item);
      group.totalValue += item.current_price || 0;
      group.totalWeight += item.current_weight || 0;
    });
    
    // Add shipments to warehouse groups
    orderShipments.forEach(shipment => {
      const warehouse = shipment.origin_warehouse || primaryWarehouse;
      const group = groups.get(warehouse);
      if (group) {
        group.shipments.push(shipment);
        // Update status based on shipment status
        if (shipment.current_status === 'delivered') {
          group.status = 'delivered';
        } else if (shipment.current_status === 'shipped' && group.status !== 'delivered') {
          group.status = 'shipped';
        } else if (group.status === 'pending') {
          group.status = 'processing';
        }
      }
    });
    
    return Array.from(groups.values());
  }, [orderItems, orderShipments, primaryWarehouse]);

  const getWarehouseDisplayName = (warehouse: string) => {
    const names: Record<string, string> = {
      'india_warehouse': 'India Warehouse',
      'china_warehouse': 'China Warehouse', 
      'us_warehouse': 'US Warehouse',
      'myus_3pl': 'MyUS 3PL',
      'other_3pl': 'Other 3PL'
    };
    return names[warehouse] || warehouse.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'shipped': return Truck;
      case 'processing': return Clock;
      case 'exception': return AlertTriangle;
      default: return Package;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'outline';
      case 'exception': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Multi-Warehouse Summary
        </CardTitle>
        <p className="text-sm text-gray-500">
          Items distributed across {warehouseGroups.length} warehouse{warehouseGroups.length > 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {warehouseGroups.map((group) => {
            const StatusIcon = getStatusIcon(group.status);
            
            return (
              <div key={group.warehouse} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${group.warehouse === primaryWarehouse ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <MapPin className={`h-4 w-4 ${group.warehouse === primaryWarehouse ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {getWarehouseDisplayName(group.warehouse)}
                        {group.warehouse === primaryWarehouse && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {group.items.length} item{group.items.length > 1 ? 's' : ''} • ${group.totalValue.toFixed(2)} • {group.totalWeight.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(group.status)} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      <span className="capitalize">{group.status}</span>
                    </Badge>
                    {onWarehouseClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onWarehouseClick(group.warehouse)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items Summary */}
                {group.items.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Items ({group.items.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="text-xs p-2 bg-gray-50 rounded">
                          <p className="font-medium truncate">{item.product_name}</p>
                          <p className="text-gray-500">
                            {item.seller_platform} • Qty: {item.quantity}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.item_status?.replace(/_/g, ' ') || 'pending'}
                          </Badge>
                        </div>
                      ))}
                      {group.items.length > 4 && (
                        <div className="text-xs p-2 bg-gray-50 rounded flex items-center justify-center">
                          +{group.items.length - 4} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipments Summary */}
                {group.shipments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Shipments ({group.shipments.length})</span>
                    </div>
                    <div className="space-y-2">
                      {group.shipments.map((shipment) => (
                        <div key={shipment.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{shipment.shipment_number}</p>
                            <p className="text-gray-500">
                              {shipment.estimated_weight_kg} kg • {shipment.current_tier} tier
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {shipment.current_status}
                            </Badge>
                            {onShipmentClick && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onShipmentClick(shipment.id)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {group.items.length === 0 && group.shipments.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No items or shipments assigned to this warehouse yet</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {warehouseGroups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No warehouse assignments found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiWarehouseOrderSummary;
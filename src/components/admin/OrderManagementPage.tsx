
import { useState } from "react";
import { AdminOrderListItem } from "./AdminOrderListItem";
import { OrderFilters } from "./OrderFilters";
import { useOrderManagement } from "@/hooks/useOrderManagement";

export const OrderManagementPage = () => {
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    
    const {
        statusFilter,
        setStatusFilter,
        searchInput,
        setSearchInput,
        orders,
        ordersLoading,
    } = useOrderManagement();

    const handleOrderSelect = (orderId: string) => {
        setSelectedOrders(prev => 
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    if (ordersLoading) return <div>Loading orders...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Order Management</h2>
            
            <OrderFilters
                searchTerm={searchInput}
                onSearchTermChange={setSearchInput}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />
            
            <div className="grid gap-4">
                {orders?.length === 0 && <p className="text-muted-foreground text-center py-4">No orders found.</p>}
                {orders?.map((order) => (
                    <AdminOrderListItem
                        key={order.id}
                        order={order}
                        isSelected={selectedOrders.includes(order.id)}
                        onSelect={handleOrderSelect}
                    />
                ))}
            </div>
        </div>
    );
};

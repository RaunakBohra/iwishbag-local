
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, User } from "lucide-react";
import { useCustomerOrderDetail } from "@/hooks/useCustomerOrderDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTimeline } from "@/components/dashboard/OrderTimeline";
import { TrackingInfo } from "@/components/dashboard/TrackingInfo";
import { OrderReceipt } from "@/components/dashboard/OrderReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CustomerOrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: order, isLoading, error } = useCustomerOrderDetail(id);

    if (isLoading) {
        return (
            <div className="container py-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container py-8 text-center">
                <p className="text-red-500">{error.message}</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="container py-8 text-center">
                <p>Order not found.</p>
                 <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>
        );
    }
    
    const displayId = order.order_display_id || order.display_id || `#${order.id.substring(0, 6)}`;

    return (
        <div className="container py-8 space-y-6">
            <div>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <h1 className="text-2xl font-bold">Order {displayId}</h1>
                 <Badge variant="secondary" className="capitalize text-base">{order.status}</Badge>
            </div>

            <OrderTimeline currentStatus={order.status} />
            
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <TrackingInfo order={order} />
                    <OrderReceipt order={order} />
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package /> Product Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {order.quote_items && order.quote_items.length > 0 ? (
                                <div className="space-y-4">
                                    {order.quote_items.map((item, index) => (
                                        <div key={item.id}>
                                            <p className="font-semibold">{item.product_name || 'N/A'}</p>
                                            {item.options && <p className="text-sm text-muted-foreground">{item.options}</p>}
                                            <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                                            {item.product_url && (
                                                <Button variant="link" asChild className="p-0 h-auto mt-2">
                                                    <a href={item.product_url} target="_blank" rel="noopener noreferrer">View Product</a>
                                                </Button>
                                            )}
                                            {index < order.quote_items.length - 1 && <Separator className="my-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <p className="font-semibold">{order.product_name}</p>
                                    {order.options && <p className="text-sm text-muted-foreground">{order.options}</p>}
                                    <p className="text-sm text-muted-foreground">Quantity: {order.quantity || 1}</p>
                                    {order.product_url && (
                                        <Button variant="link" asChild className="p-0 h-auto mt-2">
                                            <a href={order.product_url} target="_blank" rel="noopener noreferrer">View Product</a>
                                        </Button>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User /> Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="break-all">{order.email}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CustomerOrderDetailPage;

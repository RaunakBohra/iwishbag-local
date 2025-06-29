import React from "react";
import { CartAnalytics } from "@/components/admin/CartAnalytics";

const CartAnalyticsPage = () => {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Cart Analytics</h1>
      <CartAnalytics />
    </div>
  );
};

export default CartAnalyticsPage; 